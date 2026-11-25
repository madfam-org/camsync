// @ts-check
/**
 * The server behind camsync.madfam.io: one host, one stateless page in two languages.
 *
 * - `/` (Spanish, the source language) and `/en`, built once at start-up.
 * - `/health` (liveness) and `/ready` (the site was built) answer GET and HEAD on any host, so the
 *   kubelet's probes need no Host header.
 * - `/metrics` answers only on the internal metrics port, which is never routed.
 * - Everything carries `X-Robots-Tag: noindex, nofollow` and `/robots.txt` disallows all until the
 *   owner says to index (config.INDEXABLE).
 * - In production any other host gets 421. http→https is the edge's job, not this server's.
 *
 * This is the landing only. The studio (studio/) runs on a Mac on a local network and is never
 * deployed from here.
 *
 * No database, no sign-in, no cookie, no analytics, no outbound call, no secret, no script.
 */
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { INDEXABLE, SERVICE, configFromEnv } from './config.mjs';
import * as metrics from './metrics.mjs';
import { buildSite } from './site.mjs';

// The page ships no script, so none is allowed (default-src 'none' covers script-src). A later
// version that adds one names it here as script-src 'self', never a third-party origin.
const CSP =
  "default-src 'none'; style-src 'self'; img-src 'self'; connect-src 'none'; " +
  "base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const TEXT = 'text/plain; charset=utf-8';
const ROBOTS = INDEXABLE ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n';
const PAGE_OF = /** @type {Record<string, string>} */ ({ '/': 'es', '/en': 'en', '/en/': 'en' });

/**
 * Weak comparison of an If-None-Match header against one validator: a list, a `W/` prefix and `*`
 * all count, as a cache in front of the server may send any of them.
 * @param {string | undefined} header @param {string} etag
 */
export function matches(header, etag) {
  if (!header) return false;
  const strip = (/** @type {string} */ v) => v.trim().replace(/^W\//, '');
  return header.trim() === '*' || header.split(',').some((v) => strip(v) === etag);
}

/**
 * @typedef {{ route: string, status: number, type: string, body: Buffer | string, extra: Record<string, string> }} Answer
 */

/**
 * @param {import('./config.mjs').Config} config
 * @param {import('./site.mjs').Site} site
 */
export function createApp(config, site) {
  /** @param {string} type */
  const headers = (type) => ({
    'Content-Type': type,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Content-Security-Policy': CSP,
    ...(config.production
      ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' }
      : {}),
    ...(INDEXABLE ? {} : { 'X-Robots-Tag': 'noindex, nofollow' }),
  });
  const json = (/** @type {unknown} */ value) => Buffer.from(JSON.stringify(value));

  /**
   * @param {string} method @param {string} host @param {string} path
   * @param {{ ifNoneMatch?: string }} conditions
   * @returns {Answer}
   */
  function route(method, host, path, conditions) {
    const noStore = { 'Cache-Control': 'no-store' };
    const reads = method === 'GET' || method === 'HEAD';
    if (path === '/health' && reads) {
      const body = json({ status: 'ok', service: SERVICE, revision: config.revision });
      return { route: 'health', status: 200, type: 'application/json', body, extra: noStore };
    }
    if (path === '/ready' && reads) {
      const languages = Object.keys(site.pages).sort();
      const ok = languages.length === 2 && site.facts.strings > 0 && site.facts.assets > 0;
      const body = json({
        status: ok ? 'ok' : 'unready',
        revision: config.revision,
        ...site.facts,
        languages,
      });
      return {
        route: 'health',
        status: ok ? 200 : 503,
        type: 'application/json',
        body,
        extra: noStore,
      };
    }
    if (config.production && !config.hosts.includes(host)) {
      return {
        route: 'refused',
        status: 421,
        type: TEXT,
        body: 'this host is not served here\n',
        extra: noStore,
      };
    }
    if (!reads) {
      return {
        route: 'refused',
        status: 405,
        type: TEXT,
        body: 'GET only\n',
        extra: { ...noStore, Allow: 'GET, HEAD' },
      };
    }
    if (path === '/robots.txt') {
      return {
        route: 'static',
        status: 200,
        type: TEXT,
        body: ROBOTS,
        extra: { 'Cache-Control': 'public, max-age=600' },
      };
    }
    const lang = PAGE_OF[path];
    const found = lang ? site.pages[lang] : site.assets.get(path);
    if (found) {
      // Outside production nothing is cached, so an edit shows on the next load. In production
      // everything revalidates on every load (a cheap 304): the files are small and few.
      const cache = config.production ? 'no-cache' : 'no-store';
      const name = lang ? 'page' : 'static';
      /** @type {Record<string, string>} */
      const extra = { ETag: found.etag, 'Cache-Control': cache };
      if (lang) extra['Content-Language'] = lang;
      if (config.production && matches(conditions.ifNoneMatch, found.etag)) {
        return { route: name, status: 304, type: found.type, body: '', extra };
      }
      return { route: name, status: 200, type: found.type, body: found.body, extra };
    }
    const missingLang = path.startsWith('/en/') ? 'en' : 'es';
    const page = site.missing[missingLang];
    return {
      route: 'missing',
      status: 404,
      type: page.type,
      body: page.body,
      extra: { ...noStore, 'Content-Language': missingLang },
    };
  }

  /** @type {import('node:http').RequestListener} */
  return (req, res) => {
    const started = process.hrtime.bigint();
    const method = (req.method ?? 'GET').toUpperCase();
    const host = (req.headers.host ?? '').split(':')[0].toLowerCase();
    /** @type {Answer} */
    let answer;
    try {
      let path;
      // A request target the URL parser refuses is the client's error, not ours: 400, and no trace.
      try {
        path = new URL(req.url ?? '/', 'http://local').pathname;
      } catch {
        path = null;
      }
      answer =
        path === null
          ? {
              route: 'refused',
              status: 400,
              type: TEXT,
              body: 'bad request target\n',
              extra: { 'Cache-Control': 'no-store' },
            }
          : route(method, host, path, { ifNoneMatch: req.headers['if-none-match'] });
    } catch (error) {
      console.error(error); // never leak a trace to the client
      answer = { route: 'error', status: 500, type: TEXT, body: 'unexpected error\n', extra: {} };
    }
    // HEAD reports the length GET would send; 304 carries no body and no length.
    const length =
      answer.status === 304 ? {} : { 'Content-Length': Buffer.byteLength(answer.body) };
    res.writeHead(answer.status, { ...headers(answer.type), ...answer.extra, ...length });
    res.end(method === 'HEAD' || answer.status === 304 ? undefined : answer.body);
    metrics.observe(answer.route, answer.status, Number(process.hrtime.bigint() - started) / 1e9);
  };
}

/** @type {import('node:http').RequestListener} */
function metricsApp(req, res) {
  const ok = req.url === '/metrics' && req.method === 'GET';
  const body = ok ? metrics.render() : 'not found\n';
  res.writeHead(ok ? 200 : 404, {
    'Content-Type': 'text/plain; version=0.0.4',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/** Start both listeners. Returns them so a caller can close them. */
export async function start(config = configFromEnv()) {
  const site = buildSite();
  // Outside production the site is rebuilt for every request, so an edit shows on the next load.
  const main = createServer(
    config.production
      ? createApp(config, site)
      : (req, res) => {
          try {
            createApp(config, buildSite())(req, res);
          } catch (error) {
            // A half-saved file must not stop the preview.
            console.error(error);
            res
              .writeHead(500, { 'Content-Type': TEXT })
              .end('the site did not build; see the log\n');
          }
        },
  );
  const side = createServer(metricsApp);
  main.keepAliveTimeout = 75_000;
  await new Promise((resolve) => main.listen(config.port, () => resolve(undefined)));
  await new Promise((resolve) => side.listen(config.metricsPort, () => resolve(undefined)));
  console.log(
    JSON.stringify({
      msg: 'listening',
      service: SERVICE,
      env: config.env,
      port: config.port,
      metricsPort: config.metricsPort,
      hosts: config.hosts,
      revision: config.revision,
      ...site.facts,
    }),
  );
  const stop = () => {
    main.close();
    side.close();
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  return { main, side, site, stop };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
