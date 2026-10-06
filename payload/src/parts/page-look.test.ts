import { describe, expect, it } from 'vitest'
import { defaultPageStyle } from '../theme/model'
import { compilePageLook } from './page-look'

const look = (over: Partial<ReturnType<typeof defaultPageStyle>> = {}) => compilePageLook({ ...defaultPageStyle(), ...over })
const rules = (css: string) => css.split('}')
const rule = (css: string, needle: string) => rules(css).find(r => r.includes(needle)) ?? ''

describe('compilePageLook', () => {
  it("leaves Spotify's pages alone by default, except the playing equaliser, which takes the theme's accent", () => {
    const css = look()
    expect(rules(css).filter(r => r.trim())).toHaveLength(2)
    expect(css).not.toContain('entity-header')
    expect(rule(css, 'equaliser-animated-green.gif')).toContain('background-color: var(--sc-accent)')
  })

  it("recolours Spotify's green equaliser through the image itself (playing and paused), in the chosen colour", () => {
    const playing = rule(look(), 'img[src$="/images/equaliser-animated-green.gif"]')
    expect(playing).toContain('[aria-colindex="1"]')
    expect(playing).toContain('mask: url("/images/equaliser-animated-green.gif") center / contain no-repeat')
    expect(playing).toContain('object-position: -999px 0')
    expect(rule(look(), 'img[src$="/images/equaliser-green.svg"]')).toContain('url("/images/equaliser-green.svg")')
    expect(rule(look({ playingColor: '#00ffaa' }), 'equaliser-animated')).toContain('background-color: #00ffaa')
    expect(rule(look({ playingColor: '#00ffaa', equaliserColor: '#ff0000' }), 'equaliser-animated')).toContain('background-color: #ff0000')
  })

  it('repaints the header backdrop and the fade under it from the theme', () => {
    const accent = look({ backdrop: 'accent' })
    expect(rule(accent, '[data-testid="entity-header"] > :not(:last-child)')).toContain('var(--sc-accent)')
    expect(rule(accent, '[data-testid="entity-header"] + div')).toContain('var(--sc-accent)')
    expect(look({ backdrop: 'none' })).toContain('background: none !important;')
  })

  it('blurs the page’s own cover behind the header', () => {
    const css = look({ backdrop: 'cover-blur' })
    expect(rule(css, 'filter')).toContain('[data-testid="entity-header"] > :not(:last-child)')
    expect(css).toContain('var(--sc-page-cover-url, none)')
  })

  it('sizes the header and cover, rounds and lights the cover, and scales the title', () => {
    const css = look({ headerHeight: 'tall', coverSize: 300, coverRadius: 16, coverShadow: 'glow', titleScale: 0.8 })
    expect(rule(css, 'min-height: 420px')).toContain('[data-testid="entity-header"]')
    expect(rule(css, 'width: 300px')).toContain(':has(img):not(:last-child)')
    expect(css).toContain('border-radius: 16px !important;')
    expect(rule(css, 'box-shadow')).toContain('var(--sc-page-cover-color')
    expect(rule(css, 'zoom')).toContain('[data-testid="entityTitle"] h1')
  })

  it('sizes the cover to any pixel size', () => {
    expect(rule(look({ coverSize: 264 }), 'width: 264px')).toContain(':has(img):not(:last-child)')
    expect(look({ coverSize: null })).toBe(look())
  })

  it('centres the header as a hero: cover centred, title given the full width so it never wraps mid-word', () => {
    const css = look({ headerLayout: 'centred' })
    expect(rule(css, 'flex-direction: column')).toContain('[data-testid="entity-header"] > :last-child')
    expect(css).toContain('text-align: center !important;')
    expect(rule(css, 'align-self: center')).toContain(':has(img):not(:last-child)')
    expect(rule(css, 'width: 100%')).toContain('> :last-child > :last-child')
  })

  it('makes a compact centred header shorter than a centred one: less space on top, tighter gaps, a slightly smaller title', () => {
    const centred = look({ headerLayout: 'centred' })
    const compact = look({ headerLayout: 'centred', headerHeight: 'compact' })
    expect(rule(compact, 'flex-direction: column')).toContain('padding-top: 8px')
    expect(rule(compact, 'flex-direction: column')).toContain('gap: 12px')
    expect(rule(compact, 'min-height: 0')).toContain('padding-top: 0')
    expect(rule(compact, 'zoom')).toContain('zoom: 0.85')
    expect(rule(look({ headerLayout: 'centred', headerHeight: 'compact', titleScale: 1.2 }), 'zoom')).toContain('zoom: 1.02')
    expect(centred).not.toContain('zoom')
  })

  it('turns album and song headers into a banner of the cover, like artist pages; playlists keep theirs', () => {
    const css = look({ headerLayout: 'banner' })
    const banner = ':not(:is([data-testid="artist-page"], [data-testid="playlist-page"]) *) > [data-testid="entity-header"]'
    expect(rule(css, 'var(--sc-page-cover-url')).toContain(`${banner} > :not(:last-child)`)
    expect(rule(css, 'var(--sc-page-cover-url')).toContain('center 35% / cover')
    expect(rule(css, 'display: none')).toContain(`${banner} > :last-child > :has(img):not(:last-child)`)
    expect(rule(css, 'height: 404px')).toContain(banner)
    expect(rule(look({ headerLayout: 'banner', headerHeight: 'tall' }), 'height: 520px')).toContain(banner)
    expect(css).not.toContain('flex-direction: column')
  })

  it('centres a full-width title: its wrapper would shrink to the text, so Spotify fits the font small and wraps it', () => {
    const css = look({ headerLayout: 'centred' })
    expect(rule(css, 'align-self: stretch')).toContain('> :last-child > :last-child > :has([data-testid="entityTitle"])')
    expect(rule(css, '[data-testid="entityTitle"] h1 {')).toContain('text-align: center')
  })

  it('stripes rows by their row index, so stripes stay put while the list scrolls', () => {
    const css = look({ rows: 'striped' })
    expect(rule(css, 'aria-rowindex$="0"')).toContain('[data-testid="tracklist-row"]')
    expect(css).not.toContain('nth-child')
  })

  it('turns rows into cards', () => {
    expect(rule(look({ rows: 'cards' }), 'tracklist-row')).toContain('var(--sc-elevated)')
  })

  it('draws hairlines between rows', () => {
    expect(rule(look({ rows: 'lines' }), 'tracklist-row')).toContain('box-shadow: inset 0 -1px 0 color-mix(in oklab, var(--sc-text) 10%, transparent)')
  })

  it('outlines rows inside the same inset as cards, so the row height the virtual list relies on stays', () => {
    const r = rule(look({ rows: 'outlined' }), 'tracklist-row')
    expect(r).toContain('border-block: 3px solid transparent')
    expect(r).toContain('outline: 1px solid')
  })

  it('lights the hovered row with an accent bar and wash', () => {
    const r = rule(look({ rows: 'glow' }), ':hover')
    expect(r).toContain('var(--sc-accent)')
    expect(r).toContain('inset 3px 0 0')
  })

  it('leaves columns to Spotify (its own column menu chooses them)', () => {
    expect(look({ rows: 'cards' })).not.toContain('--grid-template-columns')
  })

  it("highlights the row the runtime marks as the playing song's: accent bar and wash by default", () => {
    const r = rule(look({ playingRow: true }), '[data-sc-playing]')
    expect(r).toContain('> [data-testid="tracklist-row"]')
    expect(r).toContain('linear-gradient(90deg, var(--sc-accent) 0 3px, transparent 3px)')
    expect(r).toContain('color-mix(in oklab, var(--sc-accent) 16%, transparent)')
  })

  it("styles the playing row in its own colour and strength: wash, fade or outline, and can colour the title", () => {
    const own = { playingRow: true, playingColor: '#ff0088', playingStrength: 30 }
    const wash = rule(look({ ...own, playingStyle: 'wash' }), '[data-sc-playing]')
    expect(wash).toContain('color-mix(in oklab, #ff0088 30%, transparent)')
    expect(wash).not.toContain('0 3px')
    expect(rule(look({ ...own, playingStyle: 'fade' }), '[data-sc-playing]')).toContain('linear-gradient(90deg, color-mix(in oklab, #ff0088 60%, transparent), transparent 75%)')
    expect(rule(look({ ...own, playingStyle: 'outline' }), '[data-sc-playing]')).toContain('box-shadow: inset 0 0 0 1.5px #ff0088')
    const title = rule(look({ ...own, playingTitle: true }), '[aria-colindex="2"] > div > div[data-encore-id="text"]')
    expect(title).toContain('[data-sc-playing]')
    expect(title).toContain('color: #ff0088')
    expect(look({ ...own, playingRow: false, playingTitle: true })).not.toContain('data-sc-playing')
  })

  it('styles playlists too (their list is "playlist-tracklist", not "track-list")', () => {
    expect(rule(look({ rows: 'striped' }), 'aria-rowindex$="0"')).toContain('[data-testid="playlist-tracklist"]')
  })

  it('keeps album header rules off artist pages, which share the entity header', () => {
    expect(rule(look({ headerHeight: 'tall' }), 'min-height: 420px')).toContain(':not([data-testid="artist-page"] *)')
  })

  it('paints a custom backdrop colour and fades the backdrop by strength', () => {
    const css = look({ backdrop: 'custom', backdropColor: '#ff8800', backdropStrength: 40 })
    expect(rule(css, '> :not(:last-child)')).toContain('#ff8800')
    const faded = rules(css).filter(r => r.includes('opacity: 0.4'))
    expect(faded.map(r => r.split('{')[0]?.trim())).toEqual([expect.stringContaining('> :not(:last-child)'), expect.stringContaining('[data-testid="entity-header"] + div')])
    expect(look({ backdropStrength: 100 })).toBe(look())
  })

  it('sets the title weight, spacing and case on page titles and artist names', () => {
    const css = look({ titleWeight: 'black', titleSpacing: 'tight', titleUppercase: true })
    const r = rule(css, 'font-weight: 900')
    expect(r).toContain('[data-testid="entityTitle"] h1')
    expect(r).toContain('[data-encore-id="adaptiveTitle"]')
    expect(r).toContain('letter-spacing: -0.04em')
    expect(r).toContain('text-transform: uppercase')
  })

  it('sizes and shapes the big play button, icon included', () => {
    const css = look({ playSize: 'large', playShape: 'pill' })
    expect(rule(css, 'height: 72px')).toContain('[data-testid="action-bar-row"] [data-testid="play-button"]')
    expect(rule(css, 'width: 115px')).toContain('[data-testid="play-button"]')
    expect(rule(css, 'svg')).toContain('width: 32px')
    expect(rule(look({ playShape: 'rounded' }), 'border-radius')).toContain('[data-testid="play-button"] > span')
  })

  it("paints the sticky bar that appears on scroll like the header, a shade darker so it stands apart", () => {
    const bar = rule(look({ backdrop: 'accent' }), '[data-testid="topbar"] > :first-child')
    expect(bar).toContain('#main-view:has(:not([data-testid="artist-page"] *) > [data-testid="entity-header"])')
    expect(bar).toContain('color-mix(in oklab, color-mix(in oklab, var(--sc-accent) 62%, var(--sc-background)) 82%, black)')
    expect(bar).toContain('box-shadow')
    // With Spotify's cover colour (also under a banner), only the contrast changes.
    expect(rule(look({ headerLayout: 'banner' }), '[data-testid="topbar"] > :first-child')).toContain('color-mix(in oklab, var(--background-base) 82%, black)')
    expect(look()).not.toContain('topbar')
  })

  it("shapes and sizes the sticky bar's play button too, scaled to fit the bar", () => {
    const css = look({ playSize: 'large', playShape: 'pill' })
    const bar = '[data-testid="topbar-content"] [data-testid="play-button"]'
    expect(rule(css, `${bar} {`)).toContain('width: 90px')
    expect(rule(css, `${bar} {`)).toContain('height: 56px')
    expect(rule(css, `${bar} svg`)).toContain('width: 28px')
  })

  it('turns song covers into CDs: a circle with a hole in the middle', () => {
    const r = rule(look({ thumbnails: 'cd' }), '[aria-colindex="2"] > img')
    expect(r).toContain('border-radius: 50%')
    expect(r).toContain('mask-image: radial-gradient(circle closest-side, transparent 0 25%, #000 calc(25% + 0.5px))')
  })

  it("spins the playing song's cover, and holds it still while paused", () => {
    const css = look({ playingSpin: true })
    expect(rule(css, 'animation:')).toContain('[data-sc-playing] [aria-colindex="2"] > img')
    expect(rule(css, 'animation:')).toContain('sc-cover-spin')
    expect(rule(css, 'animation-play-state: paused')).toContain('[data-sc-playing="paused"]')
    expect(css).toContain('@keyframes sc-cover-spin')
    expect(look()).not.toContain('sc-cover-spin')
  })

  it('rounds or hides row thumbnails, recolours or hides track numbers, hides the column header', () => {
    expect(rule(look({ thumbnails: 'circle' }), '[aria-colindex="2"] > img')).toContain('border-radius: 50%')
    expect(rule(look({ thumbnails: 'hidden' }), '[aria-colindex="2"] > img')).toContain('display: none')
    expect(rule(look({ indexStyle: 'accent' }), '[aria-colindex="1"]')).toContain('var(--sc-accent)')
    expect(rule(look({ indexStyle: 'hidden' }), '[aria-colindex="1"]')).toContain('visibility: hidden')
    expect(rule(look({ hideColumnHeader: true }), 'display: none')).toContain('> :first-child:has([role="row"][aria-rowindex="1"])')
  })

  it('restyles the artist banner and its colour band, resizes it with the header, and scales the name', () => {
    const tint = look({ artistBanner: 'tint' })
    expect(rule(tint, 'grayscale(1)')).toContain('[data-testid="background-image"]')
    expect(rule(tint, 'mix-blend-mode: color')).toContain('var(--sc-accent)')
    expect(rule(tint, '[data-testid="artist-page"] [data-testid="entity-header"] + div > :first-child')).toContain('var(--sc-accent)')
    expect(rule(look({ artistBanner: 'none' }), 'display: none')).toContain('[data-testid="background-image"]')
    const tall = look({ artistBannerHeight: 'tall' })
    expect(rule(tall, 'height: 540px')).toContain('[data-testid="artist-page"] [data-testid="entity-header"]')
    expect(rule(tall, 'height: 540px')).toContain(':has(> [data-testid="background-image"])')
    expect(rule(look({ artistNameScale: 0.7 }), 'zoom')).toContain('[data-testid="adaptiveEntityTitle"]')
  })

  it('never nests :has() (Chromium drops such rules)', () => {
    const css = look({
      backdrop: 'cover-blur', headerHeight: 'compact', headerLayout: 'centred', coverSize: 160, coverRadius: 0, coverShadow: 'lifted', titleScale: 1.2, rows: 'outlined', playingRow: true,
      backdropStrength: 50, titleWeight: 'light', playSize: 'small', playShape: 'rounded', thumbnails: 'hidden', indexStyle: 'hidden', hideColumnHeader: true, artistBanner: 'tint', artistBannerHeight: 'tall', artistNameScale: 1.2,
    })
    for (const r of rules(css)) expect(r).not.toMatch(/:has\([^)]*:has\(/)
  })
})
