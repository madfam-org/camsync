// @ts-check
// The landing's contract: hosts, headers, both languages, no third-party request, honest copy, and
// the deployment files agreeing with each other. Run: node --test site/server/test/*.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { INDEXABLE, configFromEnv } from '../config.mjs';
import { createApp, matches } from '../server.mjs';
import { buildSite, fill } from '../site.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (/** @type {string} */ path) => readFileSync(join(ROOT, path), 'utf8');
const HOST = 'obs.madfam.io';
const site = buildSite();
const config = configFromEnv({ CAMSYNC_ENV: 'production', CAMSYNC_REVISION: 'test' });
/** @type {import('node:http').Server} */
let server;
let base = '';

before(async () => {
  server = createServer(createApp(config, site));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  const address = /** @type {import('node:net').AddressInfo} */ (server.address());
  base = `http://127.0.0.1:${address.port}`;
});
after(() => server.close());

/**
 * fetch() may not set Host, so requests go through node:http.
 * @returns {Promise<{ status: number | undefined, headers: import('node:http').IncomingHttpHeaders, body: Buffer }>}
 */
async function get(
  /** @type {string} */ path,
  /** @type {Record<string, string>} */ headers = {},
  method = 'GET',
) {
  const { request } = await import('node:http');
  return new Promise((resolve, reject) => {
    const req = request(base + path, { method, headers: { Host: HOST, ...headers } }, (res) => {
      /** @type {Buffer[]} */
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () =>
        resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }),
      );
    });
    req.on('error', reject);
    req.end();
  });
}

test('both languages are served, with the same structure', async () => {
  const es = await get('/');
  const en = await get('/en');
  assert.equal(es.status, 200);
  assert.equal(en.status, 200);
  assert.equal(es.headers['content-language'], 'es');
  assert.equal(en.headers['content-language'], 'en');
  const tags = (/** @type {Buffer} */ b) =>
    (b.toString().match(/<[a-z][a-z0-9]*/g) ?? []).join(' ');
  assert.equal(tags(es.body), tags(en.body));
  assert.match(es.body.toString(), /<html lang="es">/);
  assert.match(en.body.toString(), /<html lang="en">/);
  assert.doesNotMatch(es.body.toString(), /\{\{/);
  assert.doesNotMatch(en.body.toString(), /\{\{/);
  const missing = await get('/en/nope');
  assert.equal(missing.status, 404);
  assert.equal(missing.headers['content-language'], 'en');
  assert.match(missing.body.toString(), /<html lang="en">/);
});

test('every response is unindexed and carries the security headers', async () => {
  assert.equal(INDEXABLE, false, 'indexing is switched on by the owner, in code');
  for (const path of ['/', '/en', '/landing.css', '/icon.svg', '/nope', '/robots.txt']) {
    const res = await get(path);
    assert.equal(res.headers['x-robots-tag'], 'noindex, nofollow', path);
    assert.equal(res.headers['x-content-type-options'], 'nosniff', path);
    assert.equal(res.headers['x-frame-options'], 'DENY', path);
    assert.match(String(res.headers['content-security-policy']), /default-src 'none'/, path);
    assert.doesNotMatch(String(res.headers['content-security-policy']), /https?:|\*/, path);
    assert.match(String(res.headers['strict-transport-security']), /max-age=31536000/, path);
    assert.equal(res.headers['set-cookie'], undefined, path);
  }
  assert.match(
    (await get('/')).body.toString(),
    /<meta name="robots" content="noindex, nofollow">/,
  );
  assert.match(
    (await get('/nope')).body.toString(),
    /<meta name="robots" content="noindex, nofollow">/,
  );
  assert.equal((await get('/robots.txt')).body.toString(), 'User-agent: *\nDisallow: /\n');
});

test('outside production there is no HSTS and no host rule', async () => {
  const dev = configFromEnv({});
  assert.equal(dev.production, false);
  const app = createApp(dev, site);
  const local = createServer(app);
  await new Promise((resolve) => local.listen(0, '127.0.0.1', () => resolve(undefined)));
  const { port } = /** @type {import('node:net').AddressInfo} */ (local.address());
  const { request } = await import('node:http');
  /** @type {import('node:http').IncomingMessage} */
  const res = await new Promise((resolve, reject) => {
    const req = request(`http://127.0.0.1:${port}/`, { headers: { Host: 'other.example' } }, resolve);
    req.on('error', reject);
    req.end();
  });
  res.resume();
  local.close();
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['strict-transport-security'], undefined);
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('another host is refused, health answers on any host, metrics is not on this port', async () => {
  assert.equal((await get('/', { Host: 'other.example' })).status, 421);
  assert.equal((await get('/', { Host: 'other.madfam.io' })).status, 421);
  const health = await get('/health', { Host: 'anything' });
  assert.equal(health.status, 200);
  assert.deepEqual(JSON.parse(health.body.toString()), {
    status: 'ok',
    service: 'camsync-landing',
    revision: 'test',
  });
  const readyRes = await get('/ready', { Host: 'anything' });
  assert.equal(readyRes.status, 200);
  const ready = JSON.parse(readyRes.body.toString());
  assert.equal(ready.status, 'ok');
  assert.equal(ready.revision, 'test');
  assert.deepEqual(ready.languages, ['en', 'es']);
  assert.equal((await get('/health', { Host: 'anything' }, 'HEAD')).status, 200);
  assert.equal((await get('/metrics')).status, 404);
  assert.equal((await get('/', {}, 'POST')).status, 405);
  assert.equal((await get('/nope')).status, 404);
  const page = await get('/');
  assert.equal((await get('/', { 'If-None-Match': String(page.headers.etag) })).status, 304);
});

test('the page makes no request to another origin and ships no script', () => {
  for (const [name, page] of [...Object.entries(site.pages), ...Object.entries(site.missing)]) {
    const html = page.body.toString();
    for (const m of html.matchAll(/(?:src|poster|action)="([^"]+)"|<link[^>]+href="([^"]+)"/g)) {
      const url = m[1] ?? m[2];
      assert.ok(url.startsWith('/') && !url.startsWith('//'), `${name}: ${url} is not same-origin`);
    }
    // The repository is not published yet, so the page links nowhere outside itself.
    assert.doesNotMatch(html, /<a[^>]+href="(?:https?:)?\/\//, `${name}: link to another origin`);
    assert.doesNotMatch(html, /<script/, `${name}: a script, which the policy refuses`);
    assert.doesNotMatch(html, /\sstyle="/, `${name}: inline style, which the policy refuses`);
    assert.doesNotMatch(html, /<img|<video|<iframe|@font-face/, `${name}: media or a typeface`);
  }
  const css = /** @type {{ body: Buffer }} */ (site.assets.get('/landing.css')).body.toString();
  assert.doesNotMatch(css, /url\(|@import|@font-face/);
  const icon = /** @type {{ body: Buffer }} */ (site.assets.get('/icon.svg')).body.toString();
  assert.doesNotMatch(icon, /href=|<script|<image/);
});

test('the copy states no price, the measured facts and what is not built', () => {
  for (const [lang, page] of Object.entries(site.pages)) {
    const text = page.body.toString().replace(/<[^>]+>/g, ' ');
    assert.doesNotMatch(text, /[$€]\s?\d|\d\s?(?:USD|MXN|EUR)\b/, lang);
    assert.match(text, /2160 × 3840/, lang);
    assert.match(text, /2160 × 2880/, lang);
    assert.match(text, /29\.9/, lang);
    assert.match(text, /iPhone 15/, lang);
    assert.match(text, /AGPL-3\.0-only/, lang);
  }
  const dictionary = JSON.parse(read('site/web/landing.i18n.json'));
  for (const lang of ['es', 'en']) {
    const notYet = Object.keys(dictionary[lang]).filter((k) => k.startsWith('notyet.'));
    assert.equal(notYet.length, 7, `${lang}: the five things not built, a title and an intro`);
  }
});

test('helpers', () => {
  assert.equal(matches('W/"a", "b"', '"b"'), true);
  assert.equal(matches('*', '"b"'), true);
  assert.equal(matches(undefined, '"b"'), false);
  assert.equal(fill('{{t:a}} {{v:b}} {{h:c}}', { a: '<' }, { b: 1 }, { c: '<i>' }), '&lt; 1 <i>');
  assert.throws(() => fill('{{t:missing}}', {}, {}, {}));
  assert.throws(() => configFromEnv({ CAMSYNC_ENV: 'prod' }));
  assert.throws(() => configFromEnv({ CAMSYNC_PORT: '9090' }));
  assert.throws(() => configFromEnv({ CAMSYNC_PUBLIC_HOSTS: ' , ' }));
  assert.deepEqual(configFromEnv({}).hosts, [HOST]);
});

test('the deployment files agree with each other', () => {
  const name = 'camsync-landing';
  const enclii = read('enclii.yaml');
  const deployment = read('infra/k8s/production/deployment.yaml');
  const kustomization = read('infra/k8s/production/kustomization.yaml');
  const workflow = read('.github/workflows/landing.yml');
  const dockerfile = read('site/Dockerfile');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.license, 'AGPL-3.0-only');
  assert.equal(pkg.private, true);
  assert.equal(pkg.dependencies, undefined, 'no dependencies');
  assert.equal(pkg.devDependencies, undefined, 'no dependencies');
  assert.match(enclii, new RegExp(`- name: ${HOST}\\n\\s+environment: production\\n\\s+port: 80`));
  assert.match(enclii, /autoDeploy: false/);
  assert.match(enclii, /pattern: manual/);
  assert.match(enclii, /status:\n\s+enabled: false/);
  assert.equal(
    (enclii.match(/^\s+- name: [a-z0-9-]+\.madfam\.io$/gm) ?? []).length,
    1,
    'one host, one level under madfam.io',
  );
  assert.match(deployment, new RegExp(`name: CAMSYNC_PUBLIC_HOSTS\\n\\s+value: ${HOST}`));
  for (const needle of [
    'replicas: 2',
    'maxUnavailable: 0',
    'readOnlyRootFilesystem: true',
    'enableServiceLinks: false',
    'automountServiceAccountToken: false',
    'drop: [ALL]',
    'podAntiAffinity',
  ]) {
    assert.ok(deployment.includes(needle), needle);
  }
  assert.doesNotMatch(deployment + kustomization, /secretKeyRef|kind: Secret|ExternalSecret/);
  assert.match(
    deployment,
    new RegExp(`^\\s+image: ghcr\\.io/madfam-org/${name}:latest$`, 'm'),
    'the image name the digest pin rewrites',
  );
  assert.match(workflow, new RegExp(`default: ${name}\\n`), 'a dispatch always builds the service');
  assert.match(
    kustomization,
    new RegExp(`digest: sha256:[0-9a-f]{64}\\n\\s+name: ghcr.io/madfam-org/${name}`),
  );
  assert.match(workflow, new RegExp(`"name":"${name}", "dockerfile":"site/Dockerfile"`));
  assert.doesNotMatch(workflow, /^\s+(push|pull_request|schedule):/m, 'dispatch only');
  assert.match(workflow, /build-publish\.yml@[0-9a-f]{40} /);
  const copied = [...dockerfile.matchAll(/^COPY (?!--from)(\S+) /gm)].map((m) => m[1]);
  assert.deepEqual(copied, ['site/server', 'site/web'], 'the studio never goes into the image');
  const paths = /"paths":"([^"]+)"/.exec(workflow)?.[1].split(' ') ?? [];
  for (const source of copied)
    assert.ok(paths.includes(source), `${source} is copied but not watched`);
  assert.match(dockerfile, /^FROM node:22-slim@sha256:[0-9a-f]{64} AS runtime$/m);
  assert.match(dockerfile, /^USER 1001:1001$/m);
});
