import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));

const COLLECTIONS = [
  {
    src: 'english-poems.md',
    out: 'english',
    poems: [
      { heading: 'The Raven',                         slug: 'the-raven',                     title: 'The Raven',                          author: 'Edgar Allan Poe' },
      { heading: 'Alone',                             slug: 'alone',                         title: 'Alone',                              author: 'Edgar Allan Poe' },
      { heading: 'Annabel Lee',                       slug: 'annabel-lee',                   title: 'Annabel Lee',                        author: 'Edgar Allan Poe' },
      { heading: 'A Dream Within a Dream',            slug: 'a-dream-within-a-dream',        title: 'A Dream Within a Dream',             author: 'Edgar Allan Poe' },
      { heading: 'Spirits of the Dead',               slug: 'spirits-of-the-dead',           title: 'Spirits of the Dead',                author: 'Edgar Allan Poe' },
      { heading: 'To the River',                      slug: 'to-the-river',                  title: 'To the River',                       author: 'Edgar Allan Poe' },
      { heading: 'from In Memoriam A.H.H.',           slug: 'in-memoriam',                   title: 'In Memoriam A.H.H. (excerpt)',       author: 'Alfred, Lord Tennyson' },
      { heading: 'from The Lady of Shalott',          slug: 'the-lady-of-shalott',           title: 'The Lady of Shalott (excerpt)',      author: 'Alfred, Lord Tennyson' },
      { heading: 'from Ulysses',                      slug: 'ulysses',                       title: 'Ulysses (excerpt)',                  author: 'Alfred, Lord Tennyson' },
      { heading: "I'm Nobody! Who are you? (260)",    slug: 'im-nobody',                     title: "I'm Nobody! Who are you?",           author: 'Emily Dickinson' },
      { heading: 'Wild Nights—Wild Nights! (249)',    slug: 'wild-nights',                   title: 'Wild Nights — Wild Nights!',         author: 'Emily Dickinson' },
      { heading: 'I felt a Funeral, in my Brain (280)', slug: 'i-felt-a-funeral-in-my-brain', title: 'I felt a Funeral, in my Brain',     author: 'Emily Dickinson' },
      { heading: 'from Paradise Lost, Book I',        slug: 'paradise-lost-book-i',          title: 'Paradise Lost, Book I (excerpt)',    author: 'John Milton' },
      { heading: 'from Paradise Lost, Book XII',      slug: 'paradise-lost-book-xii',        title: 'Paradise Lost, Book XII (excerpt)',  author: 'John Milton' },
      { heading: 'from My Last Duchess',              slug: 'my-last-duchess',               title: 'My Last Duchess (excerpt)',          author: 'Robert Browning' },
      { heading: 'from Prospice',                     slug: 'prospice',                      title: 'Prospice (excerpt)',                 author: 'Robert Browning' },
      { heading: 'Do Not Stand at My Grave and Weep', slug: 'do-not-stand-at-my-grave-and-weep', title: 'Do Not Stand at My Grave and Weep', author: 'Clare Harner' },
      { heading: "I Don't Mean to Move Too Fast",     slug: 'i-dont-mean-to-move-too-fast',  title: "I Don't Mean to Move Too Fast",      author: 'Daniel Garrison' },
      { heading: 'Untitled',                          slug: 'untitled',                      title: 'Untitled',                           author: 'unknown' },
    ],
  },
  {
    src: 'persian-poems.md',
    out: 'persian',
    poems: [
      { heading: 'The Gift (هدیه)',                                                                   slug: 'forough-the-gift',        title: 'The Gift',                                    author: 'Forough Farrokhzad' },
      { heading: 'Let Us Believe in the Beginning of the Cold Season (ایمان بیاوریم به آغاز فصل سرد)', slug: 'forough-cold-season', title: 'Let Us Believe in the Beginning of the Cold Season', author: 'Forough Farrokhzad' },
      { heading: 'from The Wind-Up Doll (عروسک کوکی)',                                                slug: 'forough-the-wind-up-doll', title: 'from The Wind-Up Doll',                      author: 'Forough Farrokhzad' },
      { heading: 'The Wall (دیوار)',                                                                  slug: 'forough-the-wall',        title: 'The Wall',                                    author: 'Forough Farrokhzad' },
      { heading: 'Sin (گناه)',                                                                        slug: 'forough-sin',             title: 'Sin',                                         author: 'Forough Farrokhzad' },
      { heading: 'Lost (گمشده)',                                                                      slug: 'forough-lost',            title: 'Lost',                                        author: 'Forough Farrokhzad' },
      { heading: 'from The Window (پنجره)',                                                           slug: 'forough-the-window',      title: 'from The Window',                             author: 'Forough Farrokhzad' },
      { heading: 'from Only the Voice Remains (تنها صداست که می‌ماند)',                                slug: 'forough-only-the-voice',  title: 'from Only the Voice Remains',                 author: 'Forough Farrokhzad' },
      { heading: 'Ghazal — اگر آن ترک شیرازی',                                                        slug: 'hafez-shirazi-turk',      title: 'Ghazal — "If that Shirazi beauty"',           author: 'Hafez' },
      { heading: 'Ghazal — مرا در منزل جانان',                                                        slug: 'hafez-the-caravan',       title: 'Ghazal — "At the station of the beloved"',    author: 'Hafez' },
      { heading: 'Ghazal — ما در پیاله',                                                              slug: 'hafez-in-the-cup',        title: 'Ghazal — "In the cup"',                       author: 'Hafez' },
      { heading: 'Ghazal — شب تاریک و بیم موج',                                                       slug: 'hafez-dark-night',        title: 'Ghazal — "Dark night, the fear of waves"',    author: 'Hafez' },
      { heading: 'Ghazal — الا یا ایها الساقی',                                                       slug: 'hafez-the-cup-bearer',    title: 'Ghazal — "O cup-bearer"',                     author: 'Hafez' },
      { heading: 'Ghazal — یوسف گمگشته',                                                              slug: 'hafez-lost-joseph',       title: 'Ghazal — "The lost Joseph"',                  author: 'Hafez' },
      { heading: 'from the Masnavi — زخم‌هایت را به آفتاب',                                           slug: 'rumi-wounds-to-the-sun',  title: 'from the Masnavi — "Expose your wounds"',     author: 'Rumi' },
      { heading: 'Ghazal — عشق چون آید',                                                              slug: 'rumi-when-love-comes',    title: 'Ghazal — "When love comes"',                  author: 'Rumi' },
      { heading: 'from the Masnavi — مرده بودم زنده شدم',                                             slug: 'rumi-i-was-dead',         title: 'from the Masnavi — "I was dead, I came alive"', author: 'Rumi' },
      { heading: 'The Song of the Reed — بشنو از نی',                                                 slug: 'rumi-the-reed',           title: 'The Song of the Reed (from the Masnavi)',     author: 'Rumi' },
      { heading: 'Ghazal — بی تو نه زندگی',                                                           slug: 'rumi-without-you',        title: 'Ghazal — "Without you"',                      author: 'Rumi' },
      { heading: 'Ghazal — دی شیخ با چراغ',                                                           slug: 'rumi-the-lamp',           title: 'Ghazal — "The sheikh with the lamp"',         author: 'Rumi' },
      { heading: 'Ghazal — بمیرید بمیرید',                                                            slug: 'rumi-die-in-love',        title: 'Ghazal — "Die in this love"',                 author: 'Rumi' },
      { heading: 'Rubaiyat — یک چند به کودکی',                                                        slug: 'khayyam-from-dust',       title: 'from the Rubáiyát — "We came from dust"',     author: 'Omar Khayyam' },
      { heading: 'Rubaiyat — این قافله‌ی عمر',                                                        slug: 'khayyam-caravan-of-life', title: 'from the Rubáiyát — "This caravan of life"',  author: 'Omar Khayyam' },
      { heading: 'Rubaiyat — از آمدنم',                                                               slug: 'khayyam-coming-and-going', title: 'from the Rubáiyát — "From my coming"',       author: 'Omar Khayyam' },
      { heading: 'Rubaiyat — این کوزه چو من',                                                         slug: 'khayyam-the-jug',         title: 'from the Rubáiyát — "This jug"',              author: 'Omar Khayyam' },
      { heading: 'from the Golestan — بنی‌آدم اعضای یکدیگرند',                                        slug: 'saadi-children-of-adam',  title: 'from the Golestan — "The children of Adam"',  author: 'Saadi' },
      { heading: 'from the Golestan — هر نفسی که فرو می‌رود',                                         slug: 'saadi-every-breath',      title: 'from the Golestan — "Every breath"',          author: 'Saadi' },
      { heading: 'Ghazal — به جهان خرم از آنم',                                                       slug: 'saadi-glad-in-the-world', title: 'Ghazal — "Glad in the world"',                author: 'Saadi' },
      { heading: 'Do-bayti — ز دست دیده و دل',                                                        slug: 'baba-taher-eye-and-heart', title: 'Do-bayti — "The eye and the heart"',         author: 'Baba Taher' },
      { heading: "from Water's Footfall (صدای پای آب)",                                               slug: 'sepehri-waters-footfall', title: "from Water's Footfall",                       author: 'Sohrab Sepehri' },
      { heading: "from Where is the Friend's Home? (نشانی)",                                          slug: 'sepehri-friends-home',    title: "from Where Is the Friend's Home?",            author: 'Sohrab Sepehri' },
      { heading: 'from In the Alley',                                                                 slug: 'shamlou-in-the-alley',    title: 'from In the Alley',                           author: 'Ahmad Shamlou' },
      { heading: 'from Love Poem',                                                                    slug: 'shamlou-love-poem',       title: 'from Love Poem',                              author: 'Ahmad Shamlou' },
      { heading: 'Walls (دیوارها)',                                                                   slug: 'shamlou-walls',           title: 'Walls',                                       author: 'Ahmad Shamlou' },
      { heading: 'آی آدم‌ها (O People)',                                                              slug: 'nima-o-people',           title: 'O People',                                    author: 'Nima Yushij' },
      { heading: "Her Own Epitaph (سنگ‌نوشته)",                                                       slug: 'parvin-epitaph',          title: 'Her Own Epitaph',                             author: "Parvin E'tesami" },
      { heading: 'دوباره می‌سازمت وطن (I Will Build You Again)',                                       slug: 'behbahani-rebuild-homeland', title: 'I Will Build You Again, My Homeland',       author: 'Simin Behbahani' },
      { heading: 'from the Shahnameh — بسی رنج بردم',                                                  slug: 'ferdowsi-thirty-years',   title: 'from the Shāhnāmeh — "Much toil I bore"',     author: 'Ferdowsi' },
      { heading: 'همه عالم تن است و ایران دل',                                                         slug: 'nezami-iran-the-heart',   title: '"All the world a body, Iran the heart"',      author: 'Nezami Ganjavi' },
      { heading: 'from The Conference of the Birds (منطق‌الطیر)',                                      slug: 'attar-conference-birds',  title: 'from The Conference of the Birds',            author: 'Attar of Nishapur' },
      { heading: 'The Alley (کوچه)',                                                                  slug: 'moshiri-the-alley',       title: 'The Alley',                                   author: 'Fereydoun Moshiri' },
      { heading: 'Persian Proverbs',                                                                  slug: 'persian-proverbs',        title: 'Persian Proverbs',                            author: 'traditional' },
    ],
  },
];

function parseBlocks(text) {
  const blocks = new Map();
  let cur = null;
  for (const line of text.split('\n')) {
    const h3 = line.match(/^### (.+?)\s*$/);
    if (h3) {
      if (cur) blocks.set(cur.heading, cur.body);
      cur = { heading: h3[1], body: [] };
      continue;
    }
    if (/^#{1,2} /.test(line)) {
      if (cur) { blocks.set(cur.heading, cur.body); cur = null; }
      continue;
    }
    if (cur) cur.body.push(line);
  }
  if (cur) blocks.set(cur.heading, cur.body);
  return blocks;
}

let totalMissing = 0;
for (const { src, out, poems } of COLLECTIONS) {
  const text = await readFile(join(ROOT, src), 'utf8');
  const blocks = parseBlocks(text);
  const outDir = join(ROOT, out);
  await mkdir(outDir, { recursive: true });

  const index = [];
  let missing = 0;
  for (const { heading, slug, title, author } of poems) {
    const raw = blocks.get(heading);
    if (!raw) {
      console.error(`! heading not found in ${src}: "${heading}"`);
      missing++;
      continue;
    }
    let body = raw
      .filter(l => l.trim() !== '---')
      .map(l => l.replace(/^[ \t]+/, ''))
      .join('\n')
      .replace(/^\s+|\s+$/g, '');
    body = body.replace(/^\*[^*\n][^*]*\*[^\S\n]*\n+/, '');

    const md = `# ${title}\n\n*${author}.*\n\n${body}\n`;
    await writeFile(join(outDir, `${slug}.md`), md, 'utf8');
    index.push({ slug, title, author });
  }

  await writeFile(join(outDir, 'index.json'), JSON.stringify(index, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${index.length} poems + index.json to ${out}` + (missing ? ` (${missing} missing)` : ''));
  totalMissing += missing;
}

if (totalMissing) process.exitCode = 1;
