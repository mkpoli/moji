// Operates the site switcher in a browser, on a stub page standing in for a site. Run after a build.
// Local only: bun run check:switcher
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium, firefox, type BrowserType, type Page } from 'playwright-core'

const script = readFileSync(join(import.meta.dirname, '../dist/switcher.js'), 'utf8')
const STUB = `<!doctype html><html lang="ja"><meta name="color-scheme" content="light dark">
<body style="height:3000px;text-transform:uppercase">
<header><site-switcher current="jurchen-input"><a id="logo" href="/home-of-site" aria-label="home">logo</a></site-switcher>
<button id="next">next</button></header>
<script>
window.keys = []; window.logoClicks = 0;
addEventListener('keydown', (e) => keys.push(e.key));
document.getElementById('logo').addEventListener('click', (e) => { logoClicks++; e.preventDefault() });
</script><script src="/switcher.js"></script></body></html>`

const state = (page: Page) =>
  page.evaluate(() => {
    const host = document.querySelector('site-switcher')!
    const root = host.shadowRoot!
    return {
      open: root.querySelector('[popover]')!.matches(':popover-open'),
      expanded: document.getElementById('logo')!.getAttribute('aria-expanded'),
      focus: root.activeElement?.textContent ?? document.activeElement?.id,
      top: root.querySelector('[popover]')!.getBoundingClientRect().top,
      right: root.querySelector('[popover]')!.getBoundingClientRect().right,
    }
  })

let failures = 0
function expect(name: string, ok: boolean, detail?: unknown) {
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ' ' + JSON.stringify(detail)}`)
}

async function run(engine: BrowserType, label: string, executablePath?: string) {
  const browser = await engine.launch(executablePath ? { executablePath } : {})
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 700 } })).newPage()
  await page.route('**/*', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/switcher.js') return route.fulfill({ body: script, contentType: 'text/javascript' })
    return route.fulfill({ body: STUB, contentType: 'text/html' })
  })
  const logo = page.locator('#logo')
  const reset = async () => {
    await page.goto('http://stub.test/')
    await page.waitForFunction(() => customElements.get('site-switcher'))
  }
  console.log(`--- ${label}`)

  await reset()
  await logo.click()
  let s = await state(page)
  expect('click opens, on the current site', s.open && s.expanded === 'true' && s.focus === 'Jurchen Input', s)
  await logo.click()
  s = await state(page)
  expect('a second click closes', !s.open && s.expanded === 'false', s)

  await logo.click()
  await page.mouse.click(600, 500)
  expect('a click away closes', !(await state(page)).open)

  await logo.focus()
  await page.keyboard.press('Space')
  expect('Space on the logo opens', (await state(page)).open)
  await page.keyboard.press('ArrowDown')
  s = await state(page)
  expect('ArrowDown moves', s.focus !== 'Jurchen Input', s)
  await page.keyboard.press('1')
  await page.keyboard.press('/')
  const keys = await page.evaluate(() => (window as any).keys)
  expect('menu keys stay out of page handlers', !keys.includes('1') && !keys.includes('/'), keys)
  await page.keyboard.press('Escape')
  s = await state(page)
  expect('Esc closes and returns to the logo', !s.open && s.focus === 'logo', s)

  await page.keyboard.press('Enter')
  expect('Enter opens', (await state(page)).open)
  await page.keyboard.press('Tab')
  s = await state(page)
  expect('Tab closes and leaves the menu', !s.open && s.focus === 'next', s)

  await logo.click({ modifiers: ['Control'] })
  expect('Ctrl-click leaves the menu closed', !(await state(page)).open)
  await page.evaluate(() => ((window as any).logoClicks = 0))

  await logo.click()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(50)
  s = await state(page)
  const clicks = await page.evaluate(() => (window as any).logoClicks)
  expect('the current entry runs the logo and closes', !s.open && clicks === 1, { s, clicks })

  await reset()
  await logo.click()
  const label2 = await page.evaluate(() => {
    const host = document.querySelector('site-switcher')!
    const menu = host.shadowRoot!.querySelector('[role=menu]')!
    return {
      name: menu.getAttribute('aria-label'),
      groups: menu.querySelectorAll('[role=group]').length,
      trigger: document.getElementById('logo')!.getAttribute('aria-label'),
      role: document.getElementById('logo')!.getAttribute('role'),
    }
  })
  expect('menu and groups are named', label2.name === '文字のサイト' && label2.groups > 1 && label2.trigger === '文字のサイト' && label2.role === 'button', label2)

  await page.evaluate(() => scrollTo(0, 2000))
  await page.waitForTimeout(100)
  expect('closes once the logo scrolls away', !(await state(page)).open)

  await reset()
  await logo.click()
  await page.setViewportSize({ width: 320, height: 600 })
  await page.waitForTimeout(100)
  s = await state(page)
  expect('stays inside a narrowed viewport', s.right <= 320, s)
  await page.setViewportSize({ width: 1000, height: 700 })

  await reset()
  await page.locator('#logo').click()
  const item = page.locator('site-switcher [role=menuitem]', { hasText: 'Tangut Input' })
  await Promise.all([page.waitForRequest((r) => r.url().startsWith('https://tangut.mkpo.li')), item.click()])
  expect('another entry navigates', true)

  await browser.close()
}

const chromiumPath = `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell`
const firefoxPath = `${process.env.HOME}/.cache/ms-playwright/firefox-1555/firefox/firefox`
await run(chromium, 'chromium', chromiumPath)
await run(firefox, 'firefox', firefoxPath)
if (failures) {
  console.log(`${failures} failed`)
  process.exit(1)
}
