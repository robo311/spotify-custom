import { describe, expect, it } from 'vitest'
import type { IconPack } from '../types'
import { BUILTIN_ICON_PACKS, compileIcons, galleryIcon, ICON_GALLERY, ICON_NAMES } from '.'
import { toLineIcon } from './packs'
import { pixelSvg } from './pack-pixel'
import { ICON_TARGETS, targetSvgSelector } from './selectors'

// Trimmed from Spotify 1.3.3's player controls (play state) and a card play button.
const PLAYER_HTML = `
<div data-testid="general-controls">
  <button id="shuffle" data-encore-id="buttonTertiary"><span><svg><path d="M13.151.922a.75.75 0 1 0"/></svg></span></button>
  <button data-testid="control-button-playpause" data-encore-id="buttonPrimary">
    <span class="encore-inverted-light-set"><span><svg><path d="M3 1.713a.7.7 0 0 1 1.05-.607z"/></svg></span></span>
  </button>
  <button data-testid="control-button-repeat" role="checkbox" aria-checked="mixed"><span><svg><path d="M0 4.75"/></svg></span></button>
</div>
<button id="card-pause" data-testid="play-button" data-encore-id="buttonPrimary">
  <span class="encore-bright-accent-set"><span><svg><path d="M2.7 1a.7.7 0 0 0-.7.7v14.6z"/></svg></span></span>
</button>
`

function pack(id: string): IconPack {
  const found = BUILTIN_ICON_PACKS.find(p => p.id === id)
  if (!found) throw new Error(`no pack ${id}`)
  return found
}

function svgSelectors(css: string): string[] {
  return [...css.matchAll(/^(.+? svg) \{/gm)].map(m => m[1])
}

describe('built-in packs', () => {
  it('leaves Spotify icons alone in the spotify pack', () => {
    expect(pack('spotify').icons).toEqual({})
    expect(compileIcons('spotify', BUILTIN_ICON_PACKS)).toBe('')
  })

  it.each(['line', 'duotone', 'offset', 'bold', 'soft', 'pixel'])('ships every icon in the %s pack as standalone SVG', id => {
    const icons = pack(id).icons
    expect(Object.keys(icons).sort()).toEqual([...ICON_NAMES].sort())
    for (const svg of Object.values(icons)) {
      // Masks load the markup as an image, so it must parse as XML and carry the SVG namespace.
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
      expect(doc.documentElement.namespaceURI).toBe('http://www.w3.org/2000/svg')
      expect(doc.querySelector('parsererror')).toBeNull()
    }
  })

  it('draws pixel art as one rectangle per horizontal run', () => {
    expect(pixelSvg('.##\n...\n#.#')).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 3" shape-rendering="crispEdges"><path d="M1 0h2v1h-2zM0 2h1v1h-1zM2 2h1v1h-1z"/></svg>',
    )
  })

  it('converts Lucide markup to our stroke width without licence comment or class', () => {
    const svg = toLineIcon('<!-- @license x --><svg class="lucide" stroke-width="2"><path d="M1 1"/></svg>')
    expect(svg).toBe('<svg stroke-width="1.75"><path d="M1 1"/></svg>')
  })
})

describe('compileIcons', () => {
  it('returns nothing for unknown packs', () => {
    expect(compileIcons('missing', BUILTIN_ICON_PACKS)).toBe('')
  })

  it('masks the original svg with the pack icon in currentColor', () => {
    const css = compileIcons('line', BUILTIN_ICON_PACKS)
    expect(css).toContain('[data-testid="control-button-skip-forward"] svg > * { visibility: hidden !important; }')
    expect(css).toMatch(/\[data-testid="control-button-skip-forward"\] svg \{ background-color: currentColor !important; -webkit-mask: url\("data:image\/svg\+xml,/)
  })

  it('only replaces icons a user pack provides', () => {
    const user: IconPack = { id: 'mine', name: 'Mine', icons: { home: '<svg/>', queue: '' } }
    const selectors = svgSelectors(compileIcons('mine', [user]))
    expect(selectors).toEqual(['[data-testid="home-button"] svg'])
  })

  it('tells play from pause by glyph, and keeps the repeat-one glyph', () => {
    document.body.innerHTML = PLAYER_HTML
    const user: IconPack = { id: 'p', name: 'P', icons: { play: '<svg/>', pause: '<svg/>', repeat: '<svg/>', shuffle: '<svg/>' } }
    const buttonName = (el: Element) => {
      const button = el.closest('button')
      if (!button) return null
      return button.id !== '' ? button.id : button.getAttribute('data-testid')
    }
    const matches = (selector: string) => [...document.querySelectorAll(selector)].map(buttonName)
    const css = compileIcons('p', [user])
    const byIcon = (name: string) =>
      ICON_TARGETS[name as keyof typeof ICON_TARGETS].flatMap(t => matches(targetSvgSelector(t)))

    expect(byIcon('play')).toEqual(['control-button-playpause'])
    expect(byIcon('pause')).toEqual(['card-pause'])
    expect(byIcon('repeat')).toEqual([])
    expect(byIcon('shuffle')).toEqual(['shuffle'])
    expect(css).toContain('[data-testid="control-button-repeat"]:not([aria-checked="mixed"]) svg')
  })

  it('tells muted from audible by the volume slider value', () => {
    const volumeBar = (value: string) => `
      <div data-testid="volume-bar">
        <button data-testid="volume-bar-toggle-mute-button"><span><svg><path d="M9.741.85"/></svg></span></button>
        <div><label><input type="range" min="0" max="1" step="0.1" value="${value}"></label></div>
      </div>`
    const count = (name: 'volume' | 'volumeMuted') =>
      ICON_TARGETS[name].reduce((n, t) => n + document.querySelectorAll(targetSvgSelector(t)).length, 0)

    document.body.innerHTML = volumeBar('0.7')
    expect([count('volume'), count('volumeMuted')]).toEqual([1, 0])
    document.body.innerHTML = volumeBar('0')
    expect([count('volume'), count('volumeMuted')]).toEqual([0, 1])
  })

  it('keeps Spotify\'s muted glyph for packs without volumeMuted', () => {
    const user: IconPack = { id: 'v', name: 'V', icons: { volume: '<svg/>' } }
    const css = compileIcons('v', [user])
    expect(css).toContain(':not(:has(input[type="range"][value="0"])) [data-testid="volume-bar-toggle-mute-button"] svg')
    expect(css).not.toMatch(/"volume-bar":has\(input/)
  })
})

describe('per-button icons', () => {
  const svg = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg>'

  it('covers the top bar buttons', () => {
    document.body.innerHTML = `<div data-testid="global-nav-bar">
      <button data-testid="home-button"><span><svg><path d="M1"/></svg></span></button>
      <button data-testid="browse-button"><span><svg><path d="M1"/></svg></span></button>
      <button data-testid="whats-new-feed-button"><span><svg><path d="M1"/></svg></span></button>
      <button data-testid="friend-activity-button"><span><svg><path d="M1"/></svg></span></button>
    </div>`
    for (const name of ['home', 'browse', 'notifications', 'friends'] as const) {
      expect(ICON_TARGETS[name].flatMap(t => [...document.querySelectorAll(targetSvgSelector(t))]), name).toHaveLength(1)
    }
  })

  it('replaces a button icon with a gallery icon or own SVG, beating the pack', () => {
    const css = compileIcons('line', BUILTIN_ICON_PACKS, { home: { gallery: 'castle' }, friends: { svg } })
    const homeRules = css.split('\n').filter(r => r.startsWith('[data-testid="home-button"] svg {'))
    expect(homeRules).toHaveLength(1)
    expect(homeRules[0]).toContain(encodeURIComponent(galleryIcon('castle') ?? 'missing'))
    expect(css).toContain(encodeURIComponent(svg))
  })

  it('applies overrides on top of Spotify\'s own icons too, and skips unknown gallery ids', () => {
    expect(svgSelectors(compileIcons('spotify', BUILTIN_ICON_PACKS, { search: { gallery: 'telescope' } }))).toEqual(['[data-testid="search-icon"] svg'])
    expect(compileIcons('spotify', BUILTIN_ICON_PACKS, { search: { gallery: 'nope' } })).toBe('')
  })

  it('has a gallery with unique slug ids', () => {
    const ids = ICON_GALLERY.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const icon of ICON_GALLERY) expect(icon.svg.startsWith('<svg')).toBe(true)
  })
})
