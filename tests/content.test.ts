import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { CATALOGUES, CHAPTERS, LOCALES, renderPage } from '../src/page'

const root = join(import.meta.dirname, '..')
const works = CHAPTERS.flatMap((c) => c.works)

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
      expect(CATALOGUES.en['note.' + c.id]).toBeDefined()
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

  test('a work without a picture has an address to show', () => {
    for (const w of works.filter((w) => !w.shot && !w.drawn)) expect(w.href).toBeDefined()
  })
})

describe('pages', () => {
  for (const { key } of LOCALES) {
    test(`${key} links every public work and leaves no placeholder`, () => {
      const html = renderPage(key)
      expect(html).toContain(`<html lang="${key}">`)
      for (const w of works) if (w.href) expect(html).toContain(`href="${w.href}"`)
      expect(html).not.toContain('{name}')
    })
  }
})
