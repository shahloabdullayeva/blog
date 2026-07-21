const path = location.pathname;
const isPostPage = path.endsWith('post.html') || !!parsePrettyPost(path);
const isPoemsPage = path.endsWith('poems.html') || /^\/poems\/[a-z]+\/?$/i.test(path);

if (isPostPage) {
  loadPost();
} else if (isPoemsPage) {
  loadPoems();
} else {
  document.querySelectorAll('[data-manifest]').forEach(list => {
    loadList(list, list.dataset.manifest, {
      type: list.dataset.type,
      lang: list.dataset.lang,
      allHref: list.dataset.all,
      limit: parseInt(list.dataset.limit, 10) || Infinity,
    });
  });
}

// Clean, GitHub-style permalinks (/posts/<slug>, /poems/<lang>/<slug>, /translations/<slug>)
// are served by a Caddy rewrite that points them at post.html without changing the address
// bar; this recovers the slug/type/lang from the visible path instead of a query string.
function parsePrettyPost(pathname) {
  let m = pathname.match(/^\/posts\/([a-z0-9-]+)\/?$/i);
  if (m) return { type: 'post', slug: m[1] };
  m = pathname.match(/^\/poems\/([a-z]+)\/([a-z0-9-]+)\/?$/i);
  if (m) return { type: 'poem', lang: m[1].toLowerCase(), slug: m[2] };
  m = pathname.match(/^\/translations\/([a-z0-9-]+)\/?$/i);
  if (m) return { type: 'translation', slug: m[1] };
  m = pathname.match(/^\/prose\/([a-z0-9-]+)\/?$/i);
  if (m) return { type: 'prose', slug: m[1] };
  return null;
}

function postHref(type, slug, lang) {
  if (type === 'poem') return `/poems/${encodeURIComponent(lang)}/${encodeURIComponent(slug)}`;
  if (type === 'translation') return `/translations/${encodeURIComponent(slug)}`;
  if (type === 'prose') return `/prose/${encodeURIComponent(slug)}`;
  return `/posts/${encodeURIComponent(slug)}`;
}

async function loadList(list, manifestUrl, options = {}) {
  try {
    const res = await fetch(manifestUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();
    if (items.length && items[0].date) items.sort ((a,b) =>
  b.date.localeCompare(a.date));

    const visible = items.slice(0, options.limit || Infinity);

    let html = '';
    if (visible.length === 0) {
      html += '<li class="dim">(nothing yet)</li>';
    } else {
      html += visible.map(item => {
        const author = item.author ? ` <span class="dim">— ${escapeHtml(item.author)}</span>` : '';
        const href = postHref(options.type || 'post', item.slug, options.lang);
        return `<li><a href="${href}">${escapeHtml(item.title)}</a>${author}</li>`;
      }).join('');
    }

    if (options.allHref) {
      html += `<li><a href="${escapeHtml(options.allHref)}">all…</a></li>`;
    }

    list.innerHTML = html;
    list.removeAttribute('aria-busy');
  } catch (err) {
    list.innerHTML = `<li class="error">Couldn't load: ${escapeHtml(err.message)}</li>`;
  }
}

async function loadPost() {
  const article = document.getElementById('post');
  const pretty = parsePrettyPost(location.pathname);
  const params = new URLSearchParams(location.search);
  const slug = pretty ? pretty.slug : (params.get('slug') || '');
  const type = pretty ? pretty.type : (params.get('type') || 'post');
  const lang = (pretty ? (pretty.lang || '') : (params.get('lang') || '')).toLowerCase();

  // Old ?slug=&type=&lang= links still resolve (Caddy keeps serving this file at
  // /post.html), so quietly upgrade the address bar to the clean permalink.
  if (slug && !pretty) {
    history.replaceState(null, '', postHref(type, slug, lang));
  }

  let folder, backHref;
  if (type === 'poem') {
    folder = `poems/${lang}`;
    backHref = `/poems/${encodeURIComponent(lang)}`;
  } else if (type === 'translation') {
    folder = 'translations';
    backHref = '/translations.html';
  } else if (type === 'prose') {
    folder = 'prose';
    backHref = '/library.html';
  } else {
    folder = 'posts';
    backHref = '/diary.html';
  }

  const backLink = document.getElementById('post-back');
  if (backLink) backLink.href = backHref;

  if (type === 'poem' && !/^[a-z]+$/.test(lang)) {
    article.innerHTML = '<p class="error">No poem specified.</p>';
    article.removeAttribute('aria-busy');
    return;
  }

  if (!/^[a-z0-9-]+$/i.test(slug)) {
    article.innerHTML = '<p class="error">No post specified.</p>';
    article.removeAttribute('aria-busy');
    return;
  }

  try {
    const [indexRes, mdRes] = await Promise.all([
      fetch(`${folder}/index.json`),
      fetch(`${folder}/${slug}.md`),
    ]);

    if (!mdRes.ok) throw new Error(mdRes.status === 404 ? 'Not found' : `HTTP ${mdRes.status}`);
    const md = await mdRes.text();

    marked.setOptions({ breaks: true });
    article.innerHTML = marked.parse(md);
    article.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote').forEach(el => {
      el.setAttribute('dir', 'auto');
    });
    article.removeAttribute('aria-busy');

    // Derive a description from the body (skip the heading) for search/social.
    const firstPara = article.querySelector('p');
    const desc = excerpt((firstPara ? firstPara.textContent : article.textContent) || '', 160);
    const selfUrl = location.origin + postHref(type, slug, lang);

    if (indexRes.ok) {
      const items = await indexRes.json();
      if (items.length && items[0].date) {
        items.sort((a, b) => b.date.localeCompare(a.date));
      }
      const idx = items.findIndex(p => p.slug === slug);
      const meta = idx !== -1 ? items[idx] : null;
      updatePostMeta(meta ? meta.title : '', desc, selfUrl);

      if (type === 'post' && idx !== -1) {
        const nav = document.getElementById('post-nav');
        const prev = items[idx + 1];
        const next = items[idx - 1];
        if (nav && (prev || next)) {
          const prevEl = document.getElementById('post-prev');
          const nextEl = document.getElementById('post-next');
          if (prev) {
            prevEl.href = postHref('post', prev.slug);
            prevEl.textContent = `← ${prev.title}`;
          } else {
            prevEl.hidden = true;
          }
          if (next) {
            nextEl.href = postHref('post', next.slug);
            nextEl.textContent = `${next.title} →`;
          } else {
            nextEl.hidden = true;
          }
          nav.hidden = false;
        }
      }
    }
  } catch (err) {
    article.innerHTML = `<p class="error">Couldn't load: ${escapeHtml(err.message)}</p>`;
    article.removeAttribute('aria-busy');
  }
}

async function loadPoems() {
  const list = document.getElementById('poem-list');
  const heading = document.getElementById('poem-heading');
  const back = document.getElementById('poem-back');
  const pathMatch = location.pathname.match(/^\/poems\/([a-z]+)\/?$/i);
  const params = new URLSearchParams(location.search);
  const lang = (pathMatch ? pathMatch[1] : (params.get('lang') || '')).toLowerCase();

  try {
    if (lang) {
      if (!/^[a-z]+$/.test(lang)) throw new Error('Unknown language');
      if (!pathMatch) history.replaceState(null, '', `/poems/${encodeURIComponent(lang)}`);
      if (heading) heading.textContent = lang;
      if (back) back.href = '/poems.html';
      document.title = `${lang} poems — Charlotte`;

      const res = await fetch(`poems/${lang}/index.json`);
      if (res.status === 404) {
        list.innerHTML = '<li class="dim">(nothing yet)</li>';
        list.removeAttribute('aria-busy');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = await res.json();

      if (items.length === 0) {
        list.innerHTML = '<li class="dim">(nothing yet)</li>';
      } else {
        list.innerHTML = items.map(item => {
          const href = postHref('poem', item.slug, lang);
          const author = item.author ? ` <span class="dim">— ${escapeHtml(item.author)}</span>` : '';
          return `<li><a href="${href}">${escapeHtml(item.title)}</a>${author}</li>`;
        }).join('');
      }
    } else {
      if (back) back.href = '/';
      const res = await fetch('poems/index.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const langs = await res.json();
      list.innerHTML = langs.length === 0
        ? '<li class="dim">(nothing yet)</li>'
        : langs.map(l =>
            `<li><a href="/poems/${encodeURIComponent(l)}">${escapeHtml(l)}</a></li>`
          ).join('');
    }
    list.removeAttribute('aria-busy');
  } catch (err) {
    list.innerHTML = `<li class="error">Couldn't load: ${escapeHtml(err.message)}</li>`;
    list.removeAttribute('aria-busy');
  }
}

function setMetaProp(selector, attr, value) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    const [, key, name] = selector.match(/\[(\w+)="([^"]+)"\]/) || [];
    if (key) el.setAttribute(key, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) { el = document.createElement('link'); el.rel = 'canonical'; document.head.appendChild(el); }
  el.href = href;
}

// Update per-page title/description/URL so crawlers that run JS index each post.
function updatePostMeta(title, description, url) {
  if (title) {
    document.title = `${title} — Charlotte`;
    setMetaProp('meta[property="og:title"]', 'property', `${title} — Charlotte`);
    setMetaProp('meta[name="twitter:title"]', 'name', `${title} — Charlotte`);
  }
  if (description) {
    setMetaProp('meta[name="description"]', 'name', description);
    setMetaProp('meta[property="og:description"]', 'property', description);
    setMetaProp('meta[name="twitter:description"]', 'name', description);
  }
  if (url) {
    setCanonical(url);
    setMetaProp('meta[property="og:url"]', 'property', url);
  }
}

function excerpt(text, max) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}
