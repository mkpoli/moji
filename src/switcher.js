// <site-switcher>: turns a site's logo into a menu of the other writing-system sites.
//
//   <site-switcher current="jurchen-input"><a href="/">logo</a></site-switcher>
//   <script defer src="https://scripts.mkpo.li/switcher.js"></script>
//
// Until this script runs, or if it never does, the logo stays a plain link home. Colours follow the
// page's `color-scheme`; a page can set --site-switcher-accent. Sizes are in px, so that a page's root
// font size leaves the menu as it is. The list is filled in at build time.
;(() => {
  const DATA = /*DATA*/ null
  // A browser without popovers keeps the logo as a plain link home.
  if (customElements.get('site-switcher') || !HTMLElement.prototype.hasOwnProperty('popover')) return

  const localeOf = (lang) => {
    const tag = (lang || 'en').toLowerCase()
    if (tag.startsWith('zh')) return /hant|tw|hk|mo/.test(tag) ? 'zh-Hant' : 'zh-Hans'
    if (tag.startsWith('ja')) return 'ja'
    if (tag.startsWith('ko')) return 'ko'
    return 'en'
  }

  const CSS = `
:host { display: inline-flex; align-items: center; gap: .25em; position: relative; }
.chevron { width: .625em; height: .625em; flex: none; opacity: .6; pointer-events: none; transition: transform .12s ease; }
:host([open]) .chevron { transform: rotate(180deg); }
[popover] {
  outline: none;
  position: fixed; inset: auto; margin: 0; padding: 6px; box-sizing: border-box;
  width: min(304px, calc(100vw - 16px)); max-height: min(75vh, 544px); overflow: auto;
  background: Canvas; color: CanvasText;
  border: 1px solid color-mix(in srgb, CanvasText 18%, transparent); border-radius: 8px;
  box-shadow: 0 8px 28px color-mix(in srgb, CanvasText 18%, transparent);
  font: 400 14px/1.35 system-ui, -apple-system, 'Segoe UI', sans-serif; letter-spacing: normal; word-spacing: normal; text-align: start; text-transform: none; text-indent: 0; font-style: normal; white-space: normal;
}
.group { padding: 10px 10px 4px; font-size: 12px; color: color-mix(in srgb, CanvasText 62%, Canvas); }
a { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 7px 10px; border-radius: 5px; color: inherit; text-decoration: none; outline: none; }
a:hover, a:focus-visible { background: color-mix(in srgb, CanvasText 9%, transparent); }
a[aria-current] { color: var(--site-switcher-accent, inherit); font-weight: 600; }
a[aria-current]::after { content: '\\2713'; }
.more { margin-top: 6px; border-top: 1px solid color-mix(in srgb, CanvasText 14%, transparent); padding-top: 6px; }
@media (prefers-reduced-motion: reduce) { .chevron { transition: none; } }`

  class SiteSwitcher extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return
      const root = this.attachShadow({ mode: 'open' })
      root.innerHTML = `<style>${CSS}</style><slot></slot>
<svg class="chevron" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
<div popover="manual" role="menu" tabindex="-1"></div>`
      this.menu = root.querySelector('[popover]')
      this.trigger = this.querySelector('a, button')
      this.dismiss = (event) => {
        if (!event.composedPath().includes(this)) this.close()
      }
      this.follow = (event) => {
        if (event.target !== this.menu) this.place()
      }
      this.describe()
      // Capture, so that a site's own handler on the logo does not navigate instead.
      this.addEventListener('click', (event) => this.onClick(event), true)
      this.addEventListener('keydown', (event) => this.onTriggerKey(event))
      this.menu.addEventListener('click', (event) => this.onItemClick(event))
      // The menu's keys stay in it, so that a page's shortcuts do not act behind it.
      this.menu.addEventListener('keydown', (event) => this.onMenuKey(event))
      for (const type of ['keyup', 'keypress']) {
        this.menu.addEventListener(type, (event) => event.stopPropagation())
      }
    }

    disconnectedCallback() {
      this.close(false)
    }

    get isOpen() {
      return this.menu?.matches(':popover-open') ?? false
    }

    links() {
      return [...this.menu.querySelectorAll('a')]
    }

    locale() {
      return localeOf(document.documentElement.lang)
    }

    /** The logo acts as a button while this script runs, and says so. */
    describe() {
      if (!this.trigger) return
      this.trigger.setAttribute('role', 'button')
      this.trigger.setAttribute('aria-haspopup', 'menu')
      this.trigger.setAttribute('aria-expanded', String(this.isOpen))
      this.trigger.setAttribute('aria-label', DATA.label[this.locale()])
    }

    /** Written on each opening, so that a language switched on the page shows at once. */
    fill() {
      const locale = this.locale()
      const current = this.getAttribute('current')
      this.menu.setAttribute('aria-label', DATA.label[locale])
      this.menu.replaceChildren()
      const link = (label, href, isCurrent) => {
        const a = document.createElement('a')
        // The current site leads where its own logo does, which may keep the page's language.
        a.href = isCurrent && this.trigger?.href ? this.trigger.href : href
        a.setAttribute('role', 'menuitem')
        a.tabIndex = -1
        a.textContent = label
        if (isCurrent) a.setAttribute('aria-current', 'true')
        return a
      }
      for (const group of DATA.groups) {
        const box = document.createElement('div')
        box.setAttribute('role', 'group')
        box.setAttribute('aria-label', group.name[locale])
        const heading = document.createElement('div')
        heading.className = 'group'
        heading.setAttribute('aria-hidden', 'true')
        heading.textContent = group.name[locale]
        box.append(heading)
        for (const site of group.sites) {
          box.append(link(site.name, site.href, site.id === current))
        }
        this.menu.append(box)
      }
      const wrap = document.createElement('div')
      wrap.className = 'more'
      wrap.append(link(DATA.more[locale], DATA.gallery[locale], current === 'gallery'))
      this.menu.append(wrap)
    }

    open() {
      if (this.isOpen) return
      this.fill()
      this.menu.showPopover()
      this.place()
      this.toggleAttribute('open', true)
      this.describe()
      const links = this.links()
      const start = links.find((a) => a.hasAttribute('aria-current')) ?? links[0]
      start?.focus({ preventScroll: true })
      start?.scrollIntoView({ block: 'nearest' })
      document.addEventListener('pointerdown', this.dismiss, true)
      document.addEventListener('scroll', this.follow, true)
      addEventListener('resize', this.follow)
    }

    close(refocus = false) {
      if (!this.isOpen) return
      this.menu.hidePopover()
      this.toggleAttribute('open', false)
      this.describe()
      document.removeEventListener('pointerdown', this.dismiss, true)
      document.removeEventListener('scroll', this.follow, true)
      removeEventListener('resize', this.follow)
      if (refocus) this.trigger?.focus()
    }

    place() {
      const box = this.getBoundingClientRect()
      if (box.bottom < 0 || box.top > innerHeight) return this.close()
      const menu = this.menu.getBoundingClientRect()
      const left = Math.min(box.left, innerWidth - menu.width - 8)
      const below = box.bottom + 6
      const top = below + menu.height > innerHeight - 8 ? Math.max(8, box.top - menu.height - 6) : below
      this.menu.style.left = `${Math.max(8, left)}px`
      this.menu.style.top = `${top}px`
    }

    onClick(event) {
      if (this.passing || event.composedPath().includes(this.menu)) return
      // A new tab or window from the logo still works.
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      this.isOpen ? this.close() : this.open()
    }

    /** The current site goes through the logo itself, so that the site's own navigation runs. */
    onItemClick(event) {
      const item = event.target.closest?.('a')
      if (!item) return
      if (item.hasAttribute('aria-current') && this.trigger) {
        event.preventDefault()
        this.close(true)
        this.passing = true
        this.trigger.click()
        this.passing = false
      } else {
        this.close()
      }
    }

    onTriggerKey(event) {
      if (event.composedPath().includes(this.menu)) return
      if (event.key === ' ') {
        event.preventDefault()
        event.stopPropagation()
        this.isOpen ? this.close() : this.open()
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        event.stopPropagation()
        this.open()
      }
    }

    onMenuKey(event) {
      event.stopPropagation()
      const links = this.links()
      const at = links.indexOf(this.shadowRoot.activeElement)
      if (event.key === 'Escape') {
        event.preventDefault()
        this.close(true)
      } else if (event.key === 'Tab') {
        // Back to the logo before the browser moves on, so that Tab continues from there.
        this.close(true)
      } else if (event.key === ' ') {
        event.preventDefault()
        links[at]?.click()
      } else {
        const go = { ArrowDown: at + 1, ArrowUp: at < 0 ? links.length - 1 : at - 1, Home: 0, End: links.length - 1 }[event.key]
        if (go === undefined) return
        event.preventDefault()
        links[(go + links.length) % links.length].focus()
      }
    }
  }

  customElements.define('site-switcher', SiteSwitcher)
})()
