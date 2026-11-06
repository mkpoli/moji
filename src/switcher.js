// <site-switcher>: turns a site's logo into a menu of the other writing-system sites.
//
//   <site-switcher current="jurchen-input"><a href="/">logo</a></site-switcher>
//   <script defer src="https://scripts.mkpo.li/switcher.js"></script>
//
// Until this script runs, or if it never does, the logo stays a plain link home. Colours follow the
// page's `color-scheme`; a page can set --site-switcher-accent. The list is filled in at build time.
;(() => {
  const DATA = /*DATA*/ null
  if (customElements.get('site-switcher')) return

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
  position: fixed; inset: auto; margin: 0; padding: .375rem;
  width: min(19rem, calc(100vw - 1rem)); max-height: min(75vh, 34rem); overflow: auto;
  background: Canvas; color: CanvasText;
  border: 1px solid color-mix(in srgb, CanvasText 18%, transparent); border-radius: .5rem;
  box-shadow: 0 .5rem 1.75rem color-mix(in srgb, CanvasText 18%, transparent);
  font: 400 .875rem/1.35 system-ui, -apple-system, 'Segoe UI', sans-serif; letter-spacing: normal; text-align: start;
}
.group { padding: .625rem .625rem .25rem; font-size: .75rem; color: color-mix(in srgb, CanvasText 62%, Canvas); }
a { display: flex; align-items: baseline; justify-content: space-between; gap: .75rem; padding: .4375rem .625rem; border-radius: .3125rem; color: inherit; text-decoration: none; outline: none; }
a:hover, a:focus-visible { background: color-mix(in srgb, CanvasText 9%, transparent); }
a[aria-current] { color: var(--site-switcher-accent, inherit); font-weight: 600; }
a[aria-current]::after { content: '✓'; }
.more { margin-top: .375rem; border-top: 1px solid color-mix(in srgb, CanvasText 14%, transparent); padding-top: .375rem; }
@media (prefers-reduced-motion: reduce) { .chevron { transition: none; } }`

  class SiteSwitcher extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return
      const root = this.attachShadow({ mode: 'open' })
      root.innerHTML = `<style>${CSS}</style><slot></slot>
<svg class="chevron" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
<div popover="auto" role="menu"></div>`
      this.menu = root.querySelector('[popover]')
      this.trigger = this.querySelector('a, button')
      if (this.trigger) {
        this.trigger.setAttribute('aria-haspopup', 'menu')
        this.trigger.setAttribute('aria-expanded', 'false')
      }
      // Capture, so that a site's own handler on the logo does not navigate instead.
      this.addEventListener('click', (event) => this.onClick(event), true)
      this.addEventListener('keydown', (event) => this.onTriggerKey(event))
      this.menu.addEventListener('keydown', (event) => this.onMenuKey(event))
      this.menu.addEventListener('beforetoggle', (event) => {
        if (event.newState === 'open') this.fill()
      })
      this.menu.addEventListener('toggle', (event) => {
        const open = event.newState === 'open'
        this.toggleAttribute('open', open)
        this.trigger?.setAttribute('aria-expanded', String(open))
        if (open) {
          this.place()
          this.links()[this.currentIndex()]?.focus({ preventScroll: true })
        } else if (this.menu.contains(this.shadowRoot.activeElement)) {
          this.trigger?.focus()
        }
      })
    }

    links() {
      return [...this.menu.querySelectorAll('a')]
    }

    currentIndex() {
      return Math.max(0, this.links().findIndex((a) => a.hasAttribute('aria-current')))
    }

    /** Written on each opening, so that a language switched on the page shows at once. */
    fill() {
      const locale = localeOf(document.documentElement.lang)
      const current = this.getAttribute('current')
      this.menu.replaceChildren()
      const link = (label, href, isCurrent) => {
        const a = document.createElement('a')
        a.href = href
        a.setAttribute('role', 'menuitem')
        a.tabIndex = -1
        a.textContent = label
        if (isCurrent) a.setAttribute('aria-current', 'true')
        return a
      }
      for (const group of DATA.groups) {
        const heading = document.createElement('div')
        heading.className = 'group'
        heading.textContent = group.name[locale]
        this.menu.append(heading)
        for (const site of group.sites) {
          this.menu.append(link(site.name, site.href, site.id === current))
        }
      }
      const more = link(DATA.more[locale], DATA.gallery[locale], current === 'gallery')
      const wrap = document.createElement('div')
      wrap.className = 'more'
      wrap.append(more)
      this.menu.append(wrap)
    }

    place() {
      const box = this.getBoundingClientRect()
      const menu = this.menu.getBoundingClientRect()
      const left = Math.min(box.left, innerWidth - menu.width - 8)
      const below = box.bottom + 6
      const top = below + menu.height > innerHeight - 8 ? Math.max(8, box.top - menu.height - 6) : below
      this.menu.style.left = `${Math.max(8, left)}px`
      this.menu.style.top = `${top}px`
    }

    onClick(event) {
      if (event.composedPath().includes(this.menu)) return
      event.preventDefault()
      event.stopPropagation()
      this.menu.togglePopover()
    }

    onTriggerKey(event) {
      if (event.composedPath().includes(this.menu)) return
      if (event.key === 'ArrowDown' || event.key === ' ') {
        event.preventDefault()
        if (!this.menu.matches(':popover-open')) this.menu.showPopover()
      }
    }

    onMenuKey(event) {
      const links = this.links()
      const at = links.indexOf(this.shadowRoot.activeElement)
      const go = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: links.length - 1 }[event.key]
      if (go === undefined) return
      event.preventDefault()
      links[(go + links.length) % links.length].focus()
    }
  }

  customElements.define('site-switcher', SiteSwitcher)
})()
