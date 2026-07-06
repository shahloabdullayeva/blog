// Generates sitemap.xml (all pages) and feed.xml (diary RSS) from the content
// manifests. Run after adding/editing posts:  node build-seo.mjs
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
  push(`${SITE}/post.html?slug=${encodeURIComponent(p.slug)}`, (p.date || '').slice(0, 10));
}

const langs = (await readJson('poems/index.json')) || [];
for (const lang of langs) {
  push(`${SITE}/poems.html?lang=${encodeURIComponent(lang)}`);
  const list = (await readJson(`poems/${lang}/index.json`)) || [];
  for (const item of list) {
    push(`${SITE}/post.html?slug=${encodeURIComponent(item.slug)}&type=poem&lang=${encodeURIComponent(lang)}`);
  }
}

const translations = (await readJson('translations/index.json')) || [];
for (const t of translations) {
  push(`${SITE}/post.html?slug=${encodeURIComponent(t.slug)}&type=translation`);
}

const songs = (await readJson('music/index.json')) || [];
for (const s of songs) {
  push(`${SITE}/song.html?id=${encodeURIComponent(s.id)}`);
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

// ---- feed.xml (diary RSS 2.0) ---------------------------------------------
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function rfc822(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${WD[d.getUTCDay()]}, ${p(d.getUTCDate())} ${MO[d.getUTCMonth()]} ${d.getUTCFullYear()} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} +0000`;
}

// Minimal markdown -> HTML: strip the leading "# title", paragraph-wrap the rest.
function bodyHtml(md) {
  const lines = md.split('\n');
  if (lines[0] && lines[0].startsWith('# ')) lines.shift();
  const text = lines.join('\n').trim();
  return text.split(/\n\s*\n/).map((para) =>
    `<p>${xmlEsc(para.trim()).replace(/\n/g, '<br/>')}</p>`
  ).join('\n');
}

const sorted = posts.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
const items = [];
for (const p of sorted.slice(0, 30)) {
  let html = '';
  try { html = bodyHtml(await readFile(join(ROOT, `posts/${p.slug}.md`), 'utf8')); }
  catch { html = ''; }
  const link = `${SITE}/post.html?slug=${encodeURIComponent(p.slug)}`;
  items.push(
`    <item>
      <title>${xmlEsc(p.title)}</title>
      <link>${xmlEsc(link)}</link>
      <guid isPermaLink="true">${xmlEsc(link)}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <description><![CDATA[${html}]]></description>
    </item>`);
}

const lastBuild = sorted.length ? rfc822(sorted[0].date) : '';
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Charlotte — diary</title>
    <link>${SITE}/diary.html</link>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Diary entries by Charlotte.</description>
    <language>en</language>
    ${lastBuild ? `<lastBuildDate>${lastBuild}</lastBuildDate>` : ''}
${items.join('\n')}
  </channel>
</rss>
`;
await writeFile(join(ROOT, 'feed.xml'), feed, 'utf8');

console.log(`Wrote sitemap.xml (${urls.length} urls) and feed.xml (${items.length} items).`);
