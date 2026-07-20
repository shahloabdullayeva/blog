// Generates sitemap.xml (all pages) from the content manifests.
// Run after adding/editing posts:  node build-seo.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SITE = 'https://shahlo.blog';

const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

async function readJson(rel) {
  try { return JSON.parse(await readFile(join(ROOT, rel), 'utf8')); }
  catch { return null; }
}

// ---- gather URLs -----------------------------------------------------------
const urls = []; // { loc, lastmod? }
const push = (loc, lastmod) => urls.push({ loc, lastmod });

const STATIC = ['/', '/diary.html', '/library.html', '/links.html',
  '/projects.html', '/contact.html', '/music.html', '/poems.html',
  '/translations.html'];
STATIC.forEach((p) => push(SITE + p));

const posts = (await readJson('posts/index.json')) || [];
for (const p of posts) {
  push(`${SITE}/posts/${encodeURIComponent(p.slug)}`, (p.date || '').slice(0, 10));
}

const langs = (await readJson('poems/index.json')) || [];
for (const lang of langs) {
  push(`${SITE}/poems/${encodeURIComponent(lang)}`);
  const list = (await readJson(`poems/${lang}/index.json`)) || [];
  for (const item of list) {
    push(`${SITE}/poems/${encodeURIComponent(lang)}/${encodeURIComponent(item.slug)}`);
  }
}

const translations = (await readJson('translations/index.json')) || [];
for (const t of translations) {
  push(`${SITE}/translations/${encodeURIComponent(t.slug)}`);
}

const songs = (await readJson('music/index.json')) || [];
for (const s of songs) {
  push(`${SITE}/song/${encodeURIComponent(s.id)}`);
}

// ---- sitemap.xml -----------------------------------------------------------
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(({ loc, lastmod }) =>
  `  <url><loc>${xmlEsc(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`
).join('\n')}
</urlset>
`;
await writeFile(join(ROOT, 'sitemap.xml'), sitemap, 'utf8');

console.log(`Wrote sitemap.xml (${urls.length} urls).`);
