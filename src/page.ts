// Renders the one page of the site, in one language, as a complete HTML document.
import chapters from '../content/chapters.json' with { type: 'json' }
import related from '../content/related.json' with { type: 'json' }
import specimens from '../content/specimens.json' with { type: 'json' }
import en from '../messages/en.json' with { type: 'json' }
import ja from '../messages/ja.json' with { type: 'json' }
import ko from '../messages/ko.json' with { type: 'json' }
import zhHans from '../messages/zh-Hans.json' with { type: 'json' }
import zhHant from '../messages/zh-Hant.json' with { type: 'json' }

export const ORIGIN = 'https://scripts.mkpo.li'

export const LOCALES = [
  { key: 'en', short: 'EN', name: 'English', path: '/' },
  { key: 'ja', short: '日', name: '日本語', path: '/ja/' },
  { key: 'zh-Hans', short: '简', name: '简体中文', path: '/zh-Hans/' },
  { key: 'zh-Hant', short: '繁', name: '繁體中文', path: '/zh-Hant/' },
  { key: 'ko', short: '한', name: '한국어', path: '/ko/' },
] as const

export type Locale = (typeof LOCALES)[number]['key']
type Catalogue = Record<string, string>

export const CATALOGUES: Record<Locale, Catalogue> = {
  en,
  ja,
  'zh-Hans': zhHans,
  'zh-Hant': zhHant,
  ko,
}

export interface Work {
  id: string
  name: string
  lang?: string
  href?: string
  shot?: string
  night?: boolean
  drawn?: string
  sample?: string
}

export interface Chapter {
  id: string
  code?: string
  font?: string
  source?: string
  accent: string[]
  works: Work[]
}

export const CHAPTERS = chapters as Chapter[]
/** Projects that touch on writing without being one of the sites, so the switcher leaves them out. */
export const RELATED = related as Work[]
const SPECIMENS = specimens as Record<string, { viewBox: string; d: string }>

const HOSTS: Record<string, string> = {
  'github.com': 'GitHub',
  'www.npmjs.com': 'npm',
  'typst.app': 'Typst Universe',
  'greasyfork.org': 'Greasy Fork',
}

const esc = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const specimen = (id: string) => {
  const { viewBox, d } = SPECIMENS[id]!
  return `<svg viewBox="${viewBox}" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`
}

const hostOf = (href: string) => {
  const host = new URL(href).host
  return HOSTS[host] ?? host
}

const nameTag = (work: Work) => (work.lang ? ` lang="${work.lang}"` : '')

/** The theme applies before first paint, and the first visit to the root follows the browser. */
const headScript = (root: boolean) => `<script>
try {
  var t = localStorage.getItem('scripts:theme');
  if (t) document.documentElement.dataset.theme = t;${
    root
      ? `
  var n = navigator.language.toLowerCase();
  var l = localStorage.getItem('scripts:locale') || (n.startsWith('ja') ? 'ja' : n.startsWith('ko') ? 'ko' : n.startsWith('zh') ? (/hant|tw|hk|mo/.test(n) ? 'zh-Hant' : 'zh-Hans') : 'en');
  if (l !== 'en') location.replace('/' + l + '/' + location.hash);`
      : ''
  }
} catch (e) {}
</script>`

const footScript = `<script defer src="/switcher.js"></script>
<script>
document.querySelector('.theme').addEventListener('click', function () {
  var dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  var next = dark ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('scripts:theme', next); } catch (e) {}
});
document.querySelectorAll('[data-locale]').forEach(function (a) {
  a.addEventListener('click', function () {
    try { localStorage.setItem('scripts:locale', a.dataset.locale); } catch (e) {}
    a.href = a.pathname + location.hash;
  });
});
</script>`

function head(locale: (typeof LOCALES)[number], t: Catalogue, robots = ''): string {
  const title = t['site.title']!
  const description = t['site.description']!
  const url = ORIGIN + locale.path
  return `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
${robots}<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
${LOCALES.map((l) => `<link rel="alternate" hreflang="${l.key}" href="${ORIGIN}${l.path}">`).join('\n')}
<link rel="alternate" hreflang="x-default" href="${ORIGIN}/">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/site.css">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(title)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ORIGIN}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
${headScript(locale.key === 'en')}
</head>`
}

function bar(locale: (typeof LOCALES)[number], t: Catalogue): string {
  return `<header class="bar">
<site-switcher current="gallery"><a class="wordmark" href="${locale.path}">${esc(t['site.title']!)}</a></site-switcher>
<div class="tools">
<nav class="langs" aria-label="${esc(t['site.languages']!)}">
${LOCALES.map(
  (l) =>
    `<a href="${l.path}" lang="${l.key}" title="${l.name}" aria-label="${l.name}" data-locale="${l.key}"${l.key === locale.key ? ' aria-current="true"' : ''}>${l.short}</a>`,
).join('')}
</nav>
<button class="theme" type="button" aria-label="${esc(t['site.theme']!)}" title="${esc(t['site.theme']!)}"><span aria-hidden="true">◐</span></button>
</div>
</header>`
}

function address(work: Work, t: Catalogue): string {
  return work.href
    ? `<span class="address">${esc(hostOf(work.href))} <span aria-hidden="true">↗</span></span>`
    : `<span class="address pending">${esc(t['site.pending']!)}</span>`
}

function card(work: Work, t: Catalogue): string {
  const alt = esc(t['site.shotAlt']!.replace('{name}', work.name))
  const image = (theme: string, cls: string) =>
    `<img class="${cls}" src="/shots/${work.shot}-${theme}.webp" width="1280" height="800" loading="lazy" alt="${alt}">`
  const plate = work.drawn
    ? `<span class="drawn" role="img" aria-label="${work.drawn}"></span><span class="drawn-ids">${work.drawn}</span>`
    : work.night
      ? image('light', 'day') + image('dark', 'night')
      : image('light', '')
  const body = `<div class="plate">${plate}</div>
<div class="caption">
<h3 class="work-name"${nameTag(work)}>${esc(work.name)}</h3>
<p class="desc">${esc(t['work.' + work.id]!)}</p>
${address(work, t)}
</div>`
  return work.href
    ? `<a class="work" href="${work.href}" rel="noopener">${body}</a>`
    : `<div class="work">${body}</div>`
}

function row(work: Work, t: Catalogue): string {
  const sample = work.sample ? `<span class="sample">${esc(work.sample)}</span>` : ''
  return `<li><a class="row" href="${work.href}" rel="noopener">
<span class="row-name"${nameTag(work)}>${esc(work.name)}</span>
<span class="row-desc">${esc(t['work.' + work.id]!)}${sample}</span>
${address(work, t)}
</a></li>`
}

function chapter(c: Chapter, t: Catalogue): string {
  const shown = c.works.filter((w) => w.shot || w.drawn)
  const listed = c.works.filter((w) => !w.shot && !w.drawn)
  const note = c.source
    ? `<a href="${c.source}" rel="noopener">${esc(t['note.' + c.id]!)}</a>`
    : esc(t['note.' + c.id]!)
  return `<section id="${c.id}" class="chapter" style="--a-light:${c.accent[0]};--a-dark:${c.accent[1]}">
<div class="rail"><div class="rail-inner">
<div class="glyph">${specimen(c.id)}</div>
<div>
<h2 class="chapter-name">${esc(t['chapter.' + c.id]!)}</h2>
<p class="note">${note}</p>
${c.font ? `<p class="meta">${c.code} · ${esc(c.font)}</p>` : ''}
</div>
</div></div>
<div class="body">
${shown.length ? `<div class="works">${shown.map((w) => card(w, t)).join('\n')}</div>` : ''}
${listed.length ? `<ul class="rows">${listed.map((w) => row(w, t)).join('\n')}</ul>` : ''}
</div>
</section>`
}

export function renderPage(key: Locale): string {
  const locale = LOCALES.find((l) => l.key === key)!
  const t = CATALOGUES[key]
  const wall = CHAPTERS.map(
    (c) =>
      `<a class="tile" href="#${c.id}" style="--a-light:${c.accent[0]};--a-dark:${c.accent[1]}">
<span class="tile-glyph">${specimen(c.id)}</span>
<span class="tile-label"><span>${esc(t['chapter.' + c.id]!)}</span><span class="tile-count">${c.works.length}</span></span>
</a>`,
  ).join('\n')
  const fonts = [...new Set(CHAPTERS.flatMap((c) => c.font ?? []))].join(' · ')
  return `<!doctype html>
<html lang="${key}">
${head(locale, t)}
<body>
${bar(locale, t)}
<main id="main">
<div class="masthead">
<h1>${esc(t['site.title']!)}</h1>
<p class="lede">${esc(t['site.description']!)}</p>
</div>
<nav class="wall" aria-label="${esc(t['site.index']!)}">
${wall}
</nav>
${CHAPTERS.map((c) => chapter(c, t)).join('\n')}
<section class="related">
<h2>${esc(t['site.related']!)}</h2>
<ul class="rows">${RELATED.map((w) => row(w, t)).join('\n')}</ul>
</section>
<footer class="colophon">
<h2>${esc(t['site.colophon']!)}</h2>
<p>${esc(t['site.fonts']!)} ${esc(fonts)}</p>
<p>${esc(t['site.shots']!)}</p>
<p class="links"><a href="https://mkpo.li/">mkpoli</a> · <a href="https://github.com/mkpoli/scripts-gallery">${esc(t['site.source']!)}</a> · <a href="https://ko-fi.com/mkpoli">Ko-fi</a></p>
</footer>
</main>
${footScript}
</body>
</html>
`
}

/** The sites of the switcher: every work with a site of its own, by script, in each language. */
export function switcherData() {
  const each = (pick: (t: Catalogue) => string) =>
    Object.fromEntries(LOCALES.map((l) => [l.key, pick(CATALOGUES[l.key])]))
  return {
    groups: CHAPTERS.map((c) => ({
      name: each((t) => t['chapter.' + c.id]!),
      sites: c.works
        .filter((w) => w.href && w.shot)
        .map((w) => ({ id: w.id, name: w.name, href: w.href })),
    })).filter((g) => g.sites.length),
    label: each((t) => t['site.switch']!),
    more: each((t) => t['site.more']!),
    gallery: Object.fromEntries(LOCALES.map((l) => [l.key, ORIGIN + l.path])),
  }
}

export function renderNotFound(): string {
  const locale = LOCALES[0]
  const t = CATALOGUES.en
  return `<!doctype html>
<html lang="en">
${head(locale, t, '<meta name="robots" content="noindex">\n')}
<body>
${bar(locale, t)}
<main id="main"><div class="masthead"><h1>404</h1><p class="lede">${esc(t['site.notFound']!)}</p></div></main>
${footScript}
</body>
</html>
`
}
