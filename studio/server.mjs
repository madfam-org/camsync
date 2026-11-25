#!/usr/bin/env node
// phonecam prototype: relay between an iPhone camera page (Safari) and viewers on this Mac.
//
// Two listeners:
//   http://127.0.0.1:HTTP_PORT   control panel, viewer page and the full API (this Mac only)
//   https://<lan-ip>:HTTPS_PORT  the phone's camera page and the API, both gated by a short key
//
// The video itself never passes through this process: phone and viewer talk WebRTC directly.
// This process only passes signalling messages, keeps the latest phone status, and writes the
// master recording chunks the phone uploads.

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TAKE_NAME, takeDir, masterPath, finishTake, listTakes } from './takes.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const CERT_DIR = path.join(ROOT, 'certs');
const HTTP_PORT = Number(process.env.PHONECAM_HTTP_PORT || 8791);
const HTTPS_PORT = Number(process.env.PHONECAM_HTTPS_PORT || 8792);
const OUT_DIR = process.env.PHONECAM_OUT || path.join(os.homedir(), 'Movies', 'iPhone footage');
const POLL_HOLD_MS = 25_000;
const CLIENT_TTL_MS = 60_000;
const MAX_QUEUE = 200;
const MAX_JSON_BYTES = 1_000_000;

function lanAddress() {
  const candidates = [];
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const a of addresses || []) {
      if (a.family === 'IPv4' && !a.internal) candidates.push(a.address);
    }
  }
  const isPrivate = (ip) => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
  return candidates.find(isPrivate) || candidates[0] || null;
}

function localHostName() {
  try {
    return execFileSync('scutil', ['--get', 'LocalHostName'], { encoding: 'utf8' }).trim();
  } catch {
    return os.hostname().replace(/\.local$/, '');
  }
}

function ensureKey() {
  const file = path.join(CERT_DIR, 'key.txt');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const key = Array.from(crypto.randomBytes(6), (b) => alphabet[b % alphabet.length]).join('');
  fs.writeFileSync(file, key + '\n', { mode: 0o600 });
  return key;
}

function ensureCertificate(ip, host) {
  const keyFile = path.join(CERT_DIR, 'tls-key.pem');
  const certFile = path.join(CERT_DIR, 'tls-cert.pem');
  const stampFile = path.join(CERT_DIR, 'tls-subject.txt');
  const subject = `IP:${ip},DNS:${host}.local`;
  const current = fs.existsSync(stampFile) ? fs.readFileSync(stampFile, 'utf8').trim() : '';
  if (current !== subject || !fs.existsSync(keyFile) || !fs.existsSync(certFile)) {
    execFileSync('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
      '-keyout', keyFile, '-out', certFile, '-days', '365',
      '-subj', '/CN=phonecam prototype',
      '-addext', `subjectAltName=${subject}`,
      '-addext', 'extendedKeyUsage=serverAuth',
    ], { stdio: 'ignore' });
    fs.chmodSync(keyFile, 0o600);
    fs.writeFileSync(stampFile, subject + '\n');
  }
  return { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) };
}

fs.mkdirSync(CERT_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });
const LAN_IP = lanAddress();
const HOST = localHostName();
const KEY = ensureKey();
const PHONE_URL = LAN_IP ? `https://${LAN_IP}:${HTTPS_PORT}/c/${KEY}` : null;

// ---------- signalling ----------

const clients = new Map();

function touchClient(id, role, name) {
  let c = clients.get(id);
  if (!c) {
    c = { id, role, name, queue: [], waiter: null, seen: Date.now() };
    clients.set(id, c);
  }
  c.role = role;
  c.name = name;
  c.seen = Date.now();
  return c;
}

function flush(c) {
  if (c.waiter && c.queue.length) {
    const res = c.waiter;
    c.waiter = null;
    sendJson(res, 200, c.queue.splice(0));
  }
}

function deliver(msg) {
  let delivered = 0;
  for (const c of clients.values()) {
    if (c.id === msg.from) continue;
    if (c.id !== msg.to && c.role !== msg.to) continue;
    if (c.queue.length >= MAX_QUEUE) c.queue.shift();
    c.queue.push(msg);
    flush(c);
    delivered += 1;
  }
  return delivered;
}

setInterval(() => {
  const now = Date.now();
  for (const [id, c] of clients) {
    if (!c.waiter && now - c.seen > CLIENT_TTL_MS) clients.delete(id);
  }
}, 10_000).unref();

// ---------- state ----------

let phoneStatus = null;
let phoneStatusAt = 0;
const uploads = new Map();
const viewerReports = new Map();   // viewer id -> { report, at }

// Each recording is a take: a folder with its master and, once the phone says it is done, take.json.
function listRecordings() {
  return listTakes(OUT_DIR).map((t) => ({
    file: `${t.name}/${t.master}`,
    bytes: t.bytes,
    modified: t.modified,
    take: t.take,
  }));
}

let qrSvg;
function phoneQrSvg() {
  if (qrSvg !== undefined) return qrSvg;
  qrSvg = null;
  if (!PHONE_URL) return qrSvg;
  const script = [
    'import sys, io, qrcode, qrcode.image.svg',
    'img = qrcode.make(sys.argv[1], image_factory=qrcode.image.svg.SvgPathImage, border=2)',
    'buf = io.BytesIO(); img.save(buf); sys.stdout.write(buf.getvalue().decode())',
  ].join('\n');
  try {
    qrSvg = execFileSync('python3', ['-c', script, PHONE_URL], { encoding: 'utf8' });
  } catch {
    qrSvg = null;
  }
  return qrSvg;
}

// ---------- http helpers ----------

function sendJson(res, status, body) {
  if (res.writableEnded) return;
  const data = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(data);
}

function sendFile(res, name) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
  const file = path.join(PUBLIC_DIR, name);
  fs.readFile(file, (err, data) => {
    if (err) return sendJson(res, 404, { error: 'not found' });
    res.writeHead(200, { 'content-type': types[path.extname(name)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_JSON_BYTES) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// ---------- api ----------

function handlePoll(req, res, url) {
  const id = url.searchParams.get('id') || '';
  const role = url.searchParams.get('role') || '';
  if (!/^[a-z0-9]{4,16}$/.test(id) || !/^(phone|viewer|control)$/.test(role)) {
    return sendJson(res, 400, { error: 'bad id or role' });
  }
  const c = touchClient(id, role, (url.searchParams.get('name') || '').slice(0, 40));
  if (c.waiter) {
    const previous = c.waiter;
    c.waiter = null;
    sendJson(previous, 200, []);
  }
  if (c.queue.length) return sendJson(res, 200, c.queue.splice(0));
  c.waiter = res;
  const timer = setTimeout(() => {
    if (c.waiter === res) {
      c.waiter = null;
      c.seen = Date.now();
      sendJson(res, 200, []);
    }
  }, POLL_HOLD_MS);
  req.on('close', () => {
    clearTimeout(timer);
    if (c.waiter === res) {
      c.waiter = null;
      c.seen = Date.now();
    }
  });
}

async function handleSend(req, res) {
  const msg = await readJson(req);
  if (typeof msg.from !== 'string' || typeof msg.to !== 'string' || typeof msg.type !== 'string') {
    return sendJson(res, 400, { error: 'from, to and type are required' });
  }
  sendJson(res, 200, { delivered: deliver({ from: msg.from, to: msg.to, type: msg.type, data: msg.data ?? null }) });
}

function handleUpload(req, res, url) {
  const name = url.searchParams.get('name') || '';
  const seq = Number(url.searchParams.get('seq'));
  const ext = url.searchParams.get('ext') === 'webm' ? 'webm' : 'mp4';
  if (!TAKE_NAME.test(name) || !Number.isInteger(seq) || seq < 0) {
    return sendJson(res, 400, { error: 'bad name or seq' });
  }
  const file = masterPath(OUT_DIR, name, ext);
  let state = uploads.get(name);
  if (seq === 0) {
    if (fs.existsSync(takeDir(OUT_DIR, name))) return sendJson(res, 409, { error: 'a take with this name already exists' });
    fs.mkdirSync(takeDir(OUT_DIR, name), { recursive: true });
    state = { next: 0, bytes: 0, file };
    uploads.set(name, state);
  }
  if (!state) return sendJson(res, 409, { error: 'unknown recording; chunk 0 was never received' });
  if (seq < state.next) return sendJson(res, 200, { duplicate: true, bytes: state.bytes });
  if (seq > state.next) return sendJson(res, 409, { error: `expected chunk ${state.next}` });

  const out = fs.createWriteStream(file, { flags: seq === 0 ? 'wx' : 'a' });
  let received = 0;
  req.on('data', (chunk) => { received += chunk.length; });
  req.pipe(out);
  out.on('finish', () => {
    state.next = seq + 1;
    state.bytes += received;
    sendJson(res, 200, { bytes: state.bytes });
  });
  const fail = (e) => sendJson(res, 500, { error: String(e.message || e) });
  out.on('error', fail);
  req.on('error', fail);
}

// The phone says the last chunk is in; the master is measured and take.json written beside it.
async function handleTakeDone(req, res, url) {
  const name = url.searchParams.get('name') || '';
  const ext = url.searchParams.get('ext') === 'webm' ? 'webm' : 'mp4';
  const state = uploads.get(name);
  if (!TAKE_NAME.test(name) || !state) return sendJson(res, 409, { error: 'unknown take' });
  const info = await readJson(req);
  const take = await finishTake(OUT_DIR, name, ext, {
    startedAt: Number(info.startedAt) || undefined,
    stoppedAt: Number(info.stoppedAt) || undefined,
    targetFps: Number(info.targetFps) || undefined,
    camera: info.camera ?? null,
  });
  uploads.delete(name);
  sendJson(res, 200, take);
}

function statusBody() {
  const now = Date.now();
  return {
    phone: phoneStatus && now - phoneStatusAt < 5000 ? phoneStatus : null,
    phoneLastSeenMs: phoneStatusAt ? now - phoneStatusAt : null,
    clients: [...clients.values()].map((c) => ({ id: c.id, role: c.role, name: c.name, idleMs: c.waiter ? 0 : now - c.seen })),
    viewers: [...viewerReports].filter(([, v]) => now - v.at < 6000).map(([id, v]) => ({ id, ...v.report })),
    recordings: listRecordings(),
    phoneUrl: PHONE_URL,
    outDir: OUT_DIR,
  };
}

async function handleApi(req, res, url, local) {
  const route = `${req.method} ${url.pathname}`;
  switch (route) {
    case 'GET /api/poll': return handlePoll(req, res, url);
    case 'POST /api/send': return handleSend(req, res);
    case 'POST /api/upload': return handleUpload(req, res, url);
    case 'POST /api/take-done': return handleTakeDone(req, res, url);
    case 'POST /api/status':
      phoneStatus = await readJson(req);
      phoneStatusAt = Date.now();
      return sendJson(res, 200, { ok: true });
    case 'POST /api/viewer-status': {
      const id = url.searchParams.get('id') || '';
      if (!/^[a-z0-9]{4,16}$/.test(id)) return sendJson(res, 400, { error: 'bad id' });
      viewerReports.set(id, { report: await readJson(req), at: Date.now() });
      for (const [key, v] of viewerReports) if (Date.now() - v.at > 60_000) viewerReports.delete(key);
      return sendJson(res, 200, { ok: true });
    }
    case 'GET /api/status':
      return local ? sendJson(res, 200, statusBody()) : sendJson(res, 404, { error: 'not found' });
    case 'GET /api/qr.svg': {
      const svg = local ? phoneQrSvg() : null;
      if (!svg) return sendJson(res, 404, { error: 'no qr available' });
      res.writeHead(200, { 'content-type': 'image/svg+xml', 'cache-control': 'no-store' });
      return res.end(svg);
    }
    default: return sendJson(res, 404, { error: 'not found' });
  }
}

function makeHandler(local) {
  return async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) {
        if (!local && url.searchParams.get('k') !== KEY) return sendJson(res, 403, { error: 'forbidden' });
        return await handleApi(req, res, url, local);
      }
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' });
      if (!local) {
        return url.pathname === `/c/${KEY}` ? sendFile(res, 'cam.html') : sendJson(res, 404, { error: 'not found' });
      }
      if (url.pathname === '/') {
        res.writeHead(302, { location: '/control' });
        return res.end();
      }
      if (url.pathname === '/control') return sendFile(res, 'control.html');
      if (url.pathname === '/view') return sendFile(res, 'view.html');
      if (url.pathname === '/shared.js') return sendFile(res, 'shared.js');
      return sendJson(res, 404, { error: 'not found' });
    } catch (e) {
      sendJson(res, 500, { error: String(e.message || e) });
    }
  };
}

http.createServer(makeHandler(true)).listen(HTTP_PORT, '127.0.0.1', () => {
  console.log(`control panel   http://127.0.0.1:${HTTP_PORT}/control`);
  console.log(`viewer (source) http://127.0.0.1:${HTTP_PORT}/view`);
});

if (LAN_IP) {
  const tls = ensureCertificate(LAN_IP, HOST);
  const phoneHandler = makeHandler(false);
  https.createServer(tls, (req, res) => {
    // shared.js is the only static asset the phone page loads besides itself.
    if (req.method === 'GET' && req.url === `/c/${KEY}/shared.js`) return sendFile(res, 'shared.js');
    return phoneHandler(req, res);
  }).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`phone page      ${PHONE_URL}`);
    console.log(`recordings      ${OUT_DIR}`);
  });
} else {
  console.log('no LAN address found: the phone page is not being served');
}
