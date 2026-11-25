import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { CATALOGUES, CHAPTERS, LOCALES, ORIGIN, RELATED, renderPage, renderRobots, renderSitemap } from '../src/page'

const root = join(import.meta.dirname, '..')
const works = [...CHAPTERS.flatMap((c) => c.works), ...RELATED]

describe('catalogues', () => {
  const keys = Object.keys(CATALOGUES.en).sort()

  for (const { key } of LOCALES) {
    test(`${key} has every key, none empty`, () => {
      expect(Object.keys(CATALOGUES[key]).sort()).toEqual(keys)
      for (const value of Object.values(CATALOGUES[key])) expect(value.trim()).not.toBe('')
    })
  }

  test('every chapter and work has its text', () => {
    for (const c of CHAPTERS) {
      expect(CATALOGUES.en['chapter.' + c.id]).toBeDefined()
      if (c.id !== 'across') expect(CATALOGUES.en['note.' + c.id]).toBeDefined()
    }
    for (const w of works) expect(CATALOGUES.en['work.' + w.id]).toBeDefined()
  })

  test('Japanese and Chinese have no space at a CJK and Latin boundary', () => {
    const cjk = '[\\u3040-\\u30ff\\u3400-\\u9fff]'
    const boundary = new RegExp(`${cjk} +[A-Za-z0-9]|[A-Za-z0-9] +${cjk}`)
    for (const key of ['ja', 'zh-Hans', 'zh-Hant'] as const) {
      for (const value of Object.values(CATALOGUES[key])) expect(value).not.toMatch(boundary)
    }
  })
})

describe('works', () => {
  test('every screenshot exists, in both themes where the site has both', () => {
    for (const w of works.filter((w) => w.shot)) {
      expect(existsSync(join(root, `public/shots/${w.shot}-light.webp`))).toBe(true)
      if (w.night) expect(existsSync(join(root, `public/shots/${w.shot}-dark.webp`))).toBe(true)
    }
  })

  test('every work has an address', () => {
    for (const w of works) expect(w.href).toStartWith('https://')
  })
})

describe('pages', () => {
  for (const { key } of LOCALES) {
    test(`${key} links every public work and leaves no placeholder`, () => {
      const html = renderPage(key)
      expect(html).toContain(`<html lang="${key}">`)
      for (const w of works) expect(html).toContain(`href="${w.href}"`)
      expect(html).not.toContain('{name}')
    })
  }
})

describe('sitemap and robots', () => {
  const hreflangs = (html: string) =>
    [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => `${m[1]} ${m[2]}`)

  test('the sitemap lists every page with the hreflang set of its head', () => {
    const xml = renderSitemap()
    const blocks = xml.split('<url>').slice(1)
    expect(blocks.length).toBe(LOCALES.length)
    for (const [i, { key, path }] of LOCALES.entries()) {
      const block = blocks[i]!
      expect(block).toContain(`<loc>${ORIGIN}${path}</loc>`)
      const sitemapSet = [...block.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => `${m[1]} ${m[2]}`)
      expect(sitemapSet).toEqual(hreflangs(renderPage(key)))
    }
  })

  test('robots.txt allows everything and names the sitemap', () => {
    const txt = renderRobots()
    expect(txt).toContain('User-agent: *\nAllow: /')
    expect(txt).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`)
  })
})
