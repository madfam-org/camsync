// @ts-check
/**
 * Everything the landing serves, built once at start-up and held in memory: no request ever touches
 * the filesystem, and a page that cannot be built stops the process instead of serving half of itself.
 *
 * The two pages come from one template and one dictionary. Every number on the page is typed in the
 * dictionary and comes from a measurement recorded in PRODUCT.md.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INDEXABLE } from './config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WEB = join(ROOT, 'site', 'web');
export const LANGUAGES = /** @type {const} */ (['es', 'en']);
const HOME = { es: '/', en: '/en' };

const TYPES = /** @type {Record<string, string>} */ ({
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
});

/** Served as they are: [file under site/web, URL]. */
const FILES = /** @type {const} */ ([
  ['landing.css', '/landing.css'],
  ['icon.svg', '/icon.svg'],
]);

/**
 * @typedef {{ body: Buffer, type: string, etag: string }} Asset
 * @typedef {{ pages: Record<string, Asset>, missing: Record<string, Asset>, assets: Map<string, Asset>, facts: { strings: number, assets: number } }} Site
 */

/** @param {string | Buffer} body @param {string} type @returns {Asset} */
function asset(body, type) {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
  return {
    body: buffer,
    type,
    etag: `"${createHash('sha256').update(buffer).digest('hex').slice(0, 20)}"`,
  };
}

/** @param {unknown} value */
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

/**
 * Fill a template. `{{t:key}}` is a dictionary string and `{{v:name}}` a value, both escaped;
 * `{{h:name}}` is HTML built here. An unknown token throws.
 * @param {string} template @param {Record<string, string>} t @param {Record<string, unknown>} v @param {Record<string, string>} h
 */
export function fill(template, t, v, h) {
  return template.replace(/\{\{([tvh]):([\w.-]+)\}\}/g, (_, kind, key) => {
    const table = kind === 't' ? t : kind === 'v' ? v : h;
    if (!(key in table))
      throw new Error(`site: the template asks for ${kind}:${key}, which does not exist`);
    return kind === 'h' ? h[key] : esc(table[key]);
  });
}

/** Every local URL a page or the stylesheet names must be served, or the page breaks while checks stay green. */
function checkReferences(
  /** @type {string} */ name,
  /** @type {string} */ text,
  /** @type {Map<string, Asset>} */ assets,
) {
  const found = [
    ...text.matchAll(/(?:href|src|poster)="(\/[^"#?]*)"|url\(["']?(\/[^"')]+)["']?\)/g),
  ];
  for (const m of found) {
    const url = m[1] ?? m[2];
    if (url === '/' || url === '/en') continue;
    if (!assets.has(url)) throw new Error(`site: ${name} names ${url}, which is not served`);
  }
  return found.length;
}

/** @returns {Site} */
export function buildSite() {
  const dictionary = JSON.parse(readFileSync(join(WEB, 'landing.i18n.json'), 'utf8'));
  const keys = Object.keys(dictionary.es).sort();
  for (const lang of LANGUAGES) {
    if (JSON.stringify(Object.keys(dictionary[lang] ?? {}).sort()) !== JSON.stringify(keys)) {
      throw new Error(`site: the ${lang} dictionary does not have the same strings as es`);
    }
    for (const [key, text] of Object.entries(dictionary[lang])) {
      if (typeof text !== 'string' || text.trim() === '')
        throw new Error(`site: ${lang} string ${key} is empty`);
    }
  }

  /** @type {Map<string, Asset>} */
  const assets = new Map();
  for (const [file, url] of FILES)
    assets.set(url, asset(readFileSync(join(WEB, file)), TYPES[extname(file)]));

  const robots = INDEXABLE ? '' : '<meta name="robots" content="noindex, nofollow">';
  const template = readFileSync(join(WEB, 'index.html'), 'utf8');
  const missingTemplate = readFileSync(join(WEB, '404.html'), 'utf8');
  /** @type {Record<string, Asset>} */
  const pages = {};
  /** @type {Record<string, Asset>} */
  const missing = {};
  for (const lang of LANGUAGES) {
    const other = lang === 'es' ? 'en' : 'es';
    const values = { lang, other, home: HOME[lang], otherHome: HOME[other] };
    const html = fill(template, dictionary[lang], values, { robots });
    checkReferences(`the ${lang} page`, html, assets);
    pages[lang] = asset(html, 'text/html; charset=utf-8');
    const missingHtml = fill(missingTemplate, dictionary[lang], values, { robots });
    checkReferences(`the ${lang} 404 page`, missingHtml, assets);
    missing[lang] = asset(missingHtml, 'text/html; charset=utf-8');
  }
  checkReferences(
    'the stylesheet',
    /** @type {Asset} */ (assets.get('/landing.css')).body.toString('utf8'),
    assets,
  );

  return { pages, missing, assets, facts: { strings: keys.length, assets: assets.size } };
}
