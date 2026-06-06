const path = location.pathname;
const isPostPage = path.endsWith('post.html');
const isPoemsPage = path.endsWith('poems.html');

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

async function loadList(list, manifestUrl, options = {}) {
  try {
    const res = await fetch(manifestUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();
    if (items.length && items[0].date) items.sort ((a,b) =>
  b.date.localeCompare(a.date));

    const visible = items.slice(0, options.limit || Infinity);
    const typeParam = options.type ? `&type=${encodeURIComponent(options.type)}` : '';
    const langParam = options.lang ? `&lang=${encodeURIComponent(options.lang)}` : '';

    let html = '';
    if (visible.length === 0) {
      html += '<li class="dim">(nothing yet)</li>';
    } else {
      html += visible.map(item => {
        const author = item.author ? ` <span class="dim">— ${escapeHtml(item.author)}</span>` : '';
        return `<li><a href="post.html?slug=${encodeURIComponent(item.slug)}${typeParam}${langParam}">${escapeHtml(item.title)}</a>${author}</li>`;
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
  const params = new URLSearchParams(location.search);
  const slug = params.get('slug') || '';
  const type = params.get('type') || 'post';
  const lang = (params.get('lang') || '').toLowerCase();

  let folder, backHref;
  if (type === 'poem') {
    folder = `poems/${lang}`;
    backHref = `poems.html?lang=${encodeURIComponent(lang)}`;
  } else if (type === 'translation') {
    folder = 'translations';
    backHref = 'translations.html';
  } else {
    folder = 'posts';
    backHref = 'diary.html';
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

    if (indexRes.ok) {
      const items = await indexRes.json();
      if (items.length && items[0].date) {
        items.sort((a, b) => b.date.localeCompare(a.date));
      }
      const idx = items.findIndex(p => p.slug === slug);
      const meta = idx !== -1 ? items[idx] : null;
      if (meta) document.title = `${meta.title} — Charlotte`;

      if (type === 'post' && idx !== -1) {
        const nav = document.getElementById('post-nav');
        const prev = items[idx + 1];
        const next = items[idx - 1];
        if (nav && (prev || next)) {
          const prevEl = document.getElementById('post-prev');
          const nextEl = document.getElementById('post-next');
          if (prev) {
            prevEl.href = `post.html?slug=${encodeURIComponent(prev.slug)}`;
            prevEl.textContent = `← ${prev.title}`;
          } else {
            prevEl.hidden = true;
          }
          if (next) {
            nextEl.href = `post.html?slug=${encodeURIComponent(next.slug)}`;
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
  const params = new URLSearchParams(location.search);
  const lang = (params.get('lang') || '').toLowerCase();

  try {
    if (lang) {
      if (!/^[a-z]+$/.test(lang)) throw new Error('Unknown language');
      if (heading) heading.textContent = lang;
      if (back) back.href = 'poems.html';
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
          const href = `post.html?slug=${encodeURIComponent(item.slug)}&type=poem&lang=${encodeURIComponent(lang)}`;
          const author = item.author ? ` <span class="dim">— ${escapeHtml(item.author)}</span>` : '';
          return `<li><a href="${href}">${escapeHtml(item.title)}</a>${author}</li>`;
        }).join('');
      }
    } else {
      if (back) back.href = './';
      const res = await fetch('poems/index.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const langs = await res.json();
      list.innerHTML = langs.length === 0
        ? '<li class="dim">(nothing yet)</li>'
        : langs.map(l =>
            `<li><a href="poems.html?lang=${encodeURIComponent(l)}">${escapeHtml(l)}</a></li>`
          ).join('');
    }
    list.removeAttribute('aria-busy');
  } catch (err) {
    list.innerHTML = `<li class="error">Couldn't load: ${escapeHtml(err.message)}</li>`;
    list.removeAttribute('aria-busy');
  }
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

(function () {
  const GC_CODE = 'charlotte';
  const OWNER_KEY = 'owner';
  const live = GC_CODE !== 'CHANGE-ME';

  if (new URLSearchParams(location.search).get('owner') === OWNER_KEY) {
    localStorage.setItem('owner', '1');
  }
  const isOwner = localStorage.getItem('owner') === '1';

  if (live && !isOwner) {
    const s = document.createElement('script');
    s.async = true;
    s.src = '//gc.zgo.at/count.js';
    s.setAttribute('data-goatcounter', `https://${GC_CODE}.goatcounter.com/count`);
    document.body.appendChild(s);
  }

  if (live && isOwner) {
    const header = document.querySelector('.site-header');
    if (header) {
      const a = document.createElement('a');
      a.href = `https://${GC_CODE}.goatcounter.com`;
      a.textContent = ' ·';
      a.title = 'stats';
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'owner-stats';
      header.appendChild(a);
    }
  }
})();
