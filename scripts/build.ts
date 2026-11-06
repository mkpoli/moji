// Writes the site to dist/: public/ as it is, and one HTML page for each language.
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { LOCALES, renderNotFound, renderPage } from '../src/page'

const root = join(import.meta.dirname, '..')
const dist = join(root, 'dist')

rmSync(dist, { recursive: true, force: true })
cpSync(join(root, 'public'), dist, { recursive: true })

for (const locale of LOCALES) {
  const dir = join(dist, locale.path)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), renderPage(locale.key))
}
writeFileSync(join(dist, '404.html'), renderNotFound())
