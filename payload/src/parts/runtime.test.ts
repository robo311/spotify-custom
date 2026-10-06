import { afterEach, describe, expect, it, vi } from 'vitest'
import { cssUrl, findPastLineSelector, largestImage, runtimeCss, startPartsRuntime } from './runtime'

function sheet(css: string): CSSStyleSheet {
  const s = new CSSStyleSheet()
  s.replaceSync(css)
  return s
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('findPastLineSelector', () => {
  it("finds Spotify's past-line rule by what it does", () => {
    const sheets = [
      sheet('.a { color: red; }'),
      sheet(
        '.line { color: var(--lyrics-color-inactive); }' +
          '.line.active { color: var(--lyrics-color-active); }' +
          '.line.past { color: var(--lyrics-color-inactive); opacity: 0.5; }',
      ),
    ]
    expect(findPastLineSelector(sheets)).toBe('.line.past')
  })

  it('returns null when Spotify has no such rule', () => {
    expect(findPastLineSelector([sheet('.x.y { opacity: 0.5; }')])).toBeNull()
  })
})

describe('largestImage', () => {
  it("takes the widest image of the srcset (Spotify's src is the small one)", () => {
    const img = document.createElement('img')
    img.setAttribute('src', 'https://i/s300')
    img.setAttribute('srcset', 'https://i/s300 150w, https://i/s300 300w, https://i/s640 640w, https://i/s320 320w')
    expect(largestImage(img)).toBe('https://i/s640')
  })

  it('falls back to src without a srcset', () => {
    const img = document.createElement('img')
    img.setAttribute('src', 'https://i/only')
    expect(largestImage(img)).toBe('https://i/only')
  })
})

describe('runtimeCss', () => {
  it('exposes the cover and restyles past lines through variables', () => {
    const css = runtimeCss('https://i.scdn.co/image/abc', '.line.past')
    expect(css).toContain(':root { --sc-cover-url: url("https://i.scdn.co/image/abc"); }')
    expect(css).toContain('color: var(--sc-lyrics-past, var(--lyrics-color-inactive)) !important;')
    expect(css).toContain('opacity: var(--sc-lyrics-past-opacity, 0.5) !important;')
  })

  it('collapses the space kept for the window buttons while in full screen (Chromium reports it as a display mode)', () => {
    const css = runtimeCss(null, null)
    expect(css).toContain('@media (display-mode: fullscreen)')
    expect(css).toContain(':first-child:not(:has(button)) { display: none !important; }')
  })

  it("exposes the open page's cover and colour", () => {
    const css = runtimeCss(null, null, { cover: 'https://i.scdn.co/image/p', color: '#04394CFF' })
    expect(css).toContain('--sc-page-cover-url: url("https://i.scdn.co/image/p");')
    expect(css).toContain('--sc-page-cover-color: #04394CFF;')
  })

  it('drops a page colour that is not a plain colour', () => {
    expect(runtimeCss(null, null, { cover: null, color: 'red; } body { x' })).not.toContain('--sc-page-cover-color')
  })

  it('escapes quotes in URLs', () => {
    expect(cssUrl('a"b')).toBe('url("a%22b")')
  })
})

describe('startPartsRuntime', () => {
  it('follows the now-playing cover and cleans up', async () => {
    document.body.innerHTML = `<div data-testid="root"><div data-testid="now-playing-widget">
      <div data-testid="CoverSlotCollapsed__container"><img data-testid="cover-art-image" src="https://x/1"></div>
    </div></div>`
    const stop = startPartsRuntime()
    const style = () => document.getElementById('sc-parts-runtime')?.textContent ?? ''
    expect(style()).toContain('https://x/1')

    document.querySelector('img')?.setAttribute('src', 'https://x/2')
    await vi.waitFor(() => {
      expect(style()).toContain('https://x/2')
    })
    stop()
    expect(document.getElementById('sc-parts-runtime')).toBeNull()
  })
})
