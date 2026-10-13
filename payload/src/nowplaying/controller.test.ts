import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PlaybackState } from '../types'
import { startLyricsColumn, type PlaybackSource } from './controller'

const GRID = '<div data-testid="root"><div id="grid"><div id="Desktop_LeftSidebar_Id"></div></div></div>'
const LYRICS_ATTR = 'data-cinema-npv-postenter'

const state = (name: string): PlaybackState => ({
  track: {
    uri: `spotify:track:${name}`,
    name,
    artists: [{ name: 'Artist', uri: 'spotify:artist:a' }],
    album: { name: 'Album', uri: 'spotify:album:b' },
    image: 'https://i.scdn.co/image/x',
    thumb: null,
    canvasId: null,
    video: false,
  },
  paused: false,
  next: [{ uri: 'spotify:track:n', name: 'Next one', artists: [{ name: 'B', uri: '' }], album: { name: '', uri: '' }, image: null, thumb: null, canvasId: null, video: false }],
})

function fakeSource() {
  let listener: ((s: PlaybackState | null) => void) | null = null
  const source: PlaybackSource & { emit(s: PlaybackState | null): void; active(): boolean } = {
    onPlayback(fn) {
      listener = fn
      fn(state('first'))
      return () => {
        listener = null
      }
    },
    emit: s => listener?.(s),
    active: () => listener !== null,
    loadCanvas: () => Promise.resolve(null),
  }
  return source
}

const ALL = { video: true, queue: true, collapsed: false }
const host = () => document.getElementById('sc-lyrics-npv')
const shadowText = () => host()?.shadowRoot?.textContent ?? ''
const ready = () => document.documentElement.hasAttribute('data-sc-lyrics-npv')

const reducedMotion = () => vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)

/** Replaces Element.animate with animations that finish only when told to. */
function fakeAnimations() {
  const started: { keyframes: Keyframe[]; finish(): void }[] = []
  vi.spyOn(HTMLElement.prototype, 'animate').mockImplementation((keyframes) => {
    const animation = { onfinish: null as (() => void) | null, cancel: vi.fn() }
    started.push({ keyframes: keyframes as Keyframe[], finish: () => animation.onfinish?.() })
    return animation as unknown as Animation
  })
  return started
}

afterEach(() => {
  vi.restoreAllMocks()
  document.documentElement.removeAttribute(LYRICS_ATTR)
  document.body.innerHTML = ''
})

describe('startLyricsColumn', () => {
  it('puts a host in the layout grid only while enabled', () => {
    document.body.innerHTML = GRID
    let on = false
    const ctl = startLyricsColumn(() => on, () => ALL, fakeSource())
    expect(host()).toBeNull()
    on = true
    ctl.refresh()
    expect(host()?.parentElement?.id).toBe('grid')
    on = false
    ctl.refresh()
    expect(host()).toBeNull()
    ctl.dispose()
  })

  it("layers the track's Canvas over the cover when it has one", () => {
    document.body.innerHTML = GRID
    const source = fakeSource()
    const ctl = startLyricsColumn(() => true, () => ALL, source)
    const video = () => host()?.shadowRoot?.querySelector('video.hero-video')
    expect(video()).toBeFalsy()
    const first = state('first')
    if (first.track) source.emit({ ...first, track: { ...first.track, uri: 'spotify:track:c', canvasId: '780e3d4553633463b21ee4cea8eff783' } })
    expect(video()).toBeTruthy()
    expect(host()?.shadowRoot?.querySelector('.hero-img')).toBeTruthy() // the cover stays under it until the video plays
    ctl.dispose()
  })

  it('shows the cover, not the Canvas, while the music video plays', () => {
    document.body.innerHTML = GRID
    const source = fakeSource()
    const ctl = startLyricsColumn(() => true, () => ALL, source)
    const first = state('first')
    if (first.track) source.emit({ ...first, track: { ...first.track, canvasId: '780e3d4553633463b21ee4cea8eff783', video: true } })
    expect(host()?.shadowRoot?.querySelector('video.hero-video')).toBeFalsy()
    expect(host()?.shadowRoot?.querySelector('img.hero-img')).toBeTruthy()
    ctl.dispose()
  })

  it('leaves the Canvas out when the theme turns the video off, and brings it back on refresh', () => {
    document.body.innerHTML = GRID
    const source = fakeSource()
    let video = false
    const ctl = startLyricsColumn(() => true, () => ({ ...ALL, video }), source)
    const first = state('first')
    if (first.track) source.emit({ ...first, track: { ...first.track, canvasId: '780e3d4553633463b21ee4cea8eff783' } })
    const layer = () => host()?.shadowRoot?.querySelector('video.hero-video')
    expect(layer()).toBeFalsy()
    video = true
    ctl.refresh()
    expect(layer()).toBeTruthy()
    ctl.dispose()
  })

  it('collapses to a strip from its button and expands again from the strip, remembering the choice', () => {
    reducedMotion()
    document.body.innerHTML = GRID
    let collapsed = false
    const saved: boolean[] = []
    const setCollapsed = (on: boolean) => {
      saved.push(on)
      collapsed = on
    }
    const ctl = startLyricsColumn(() => true, () => ({ ...ALL, collapsed }), fakeSource(), setCollapsed)
    const root = () => host()?.shadowRoot
    const isCollapsed = () => document.documentElement.hasAttribute('data-sc-lyrics-npv-collapsed')
    expect(isCollapsed()).toBe(false)
    root()?.querySelector<HTMLButtonElement>('button[aria-label="Collapse Now playing"]')?.click()
    expect(saved).toEqual([true])
    expect(isCollapsed()).toBe(true)
    expect(root()?.querySelector('.npv')?.classList.contains('collapsed')).toBe(true)
    // The content stays underneath (revealed faintly on hover), out of reach of clicks and assistive tech.
    expect(root()?.querySelector('.peek')?.hasAttribute('inert')).toBe(true)
    expect(root()?.querySelector('.peek .title')?.textContent).toBe('first')
    expect(root()?.querySelector('button[aria-label="Collapse Now playing"]')).toBeNull()
    root()?.querySelector<HTMLButtonElement>('button[aria-label="Expand Now playing"]')?.click()
    expect(saved).toEqual([true, false])
    expect(isCollapsed()).toBe(false)
    expect(root()?.querySelector('.peek')).toBeNull()
    ctl.dispose()
  })

  // The column's width slides between the strip and its full width; the lyrics follow it. Folding, the content keeps
  // showing (fading out) until the strip takes over at the end.
  it('slides between the strip and its full width', () => {
    document.body.innerHTML = GRID
    const animations = fakeAnimations()
    let collapsed = false
    const ctl = startLyricsColumn(() => true, () => ({ ...ALL, collapsed }), fakeSource(), on => (collapsed = on))
    const html = document.documentElement
    const root = () => host()?.shadowRoot
    root()?.querySelector<HTMLButtonElement>('.fold')?.click()
    expect(collapsed).toBe(true)
    expect(animations.at(-1)?.keyframes.at(-1)).toEqual({ width: '48px' })
    expect(html.hasAttribute('data-sc-lyrics-npv-sliding')).toBe(true)
    expect(host()?.getAttribute('data-sliding')).toBe('out')
    expect(root()?.querySelector('.npv.collapsed')).toBeNull() // still the full column, on its way out
    animations.at(-1)?.finish()
    expect(root()?.querySelector('.npv.collapsed')).not.toBeNull()
    expect(html.hasAttribute('data-sc-lyrics-npv-collapsed')).toBe(true)
    expect(html.hasAttribute('data-sc-lyrics-npv-sliding')).toBe(false)
    expect(host()?.hasAttribute('data-sliding')).toBe(false)

    root()?.querySelector<HTMLButtonElement>('.unfold')?.click()
    expect(collapsed).toBe(false)
    expect(animations).toHaveLength(2) // from the strip's measured width (no layout here) to the full one
    expect(root()?.querySelector('.npv.collapsed')).toBeNull() // the full column slides in
    expect(host()?.getAttribute('data-sliding')).toBe('in')
    animations.at(-1)?.finish()
    expect(html.hasAttribute('data-sc-lyrics-npv-sliding')).toBe(false)
    ctl.dispose()
  })

  it('stays collapsed for the next song and drops the attribute on dispose', () => {
    document.body.innerHTML = GRID
    const source = fakeSource()
    const ctl = startLyricsColumn(() => true, () => ({ ...ALL, collapsed: true }), source)
    source.emit(state('second'))
    expect(host()?.shadowRoot?.querySelector('.npv.collapsed')).not.toBeNull()
    expect(document.documentElement.hasAttribute('data-sc-lyrics-npv-collapsed')).toBe(true)
    ctl.dispose()
    expect(document.documentElement.hasAttribute('data-sc-lyrics-npv-collapsed')).toBe(false)
  })

  it('drops Up next and lets the cover fill the column when the queue is off, and brings it back on refresh', () => {
    document.body.innerHTML = GRID
    let queue = false
    const ctl = startLyricsColumn(() => true, () => ({ ...ALL, queue }), fakeSource())
    const npv = () => host()?.shadowRoot?.querySelector('.npv')
    expect(host()?.shadowRoot?.querySelector('.next')).toBeNull()
    expect(npv()?.classList.contains('solo')).toBe(true)
    expect(shadowText()).toContain('first') // title and artist stay
    expect(shadowText()).toContain('Artist')
    queue = true
    ctl.refresh()
    expect(host()?.shadowRoot?.querySelector('.next')).not.toBeNull()
    expect(npv()?.classList.contains('solo')).toBe(false)
    ctl.dispose()
  })

  // Rendered ahead of time (CSS keeps it hidden outside the lyrics view), so Spotify's open transition already
  // captures the final layout instead of the column landing as a jump afterwards.
  it('follows playback while enabled and is ready before the lyrics view opens', () => {
    document.body.innerHTML = GRID
    const source = fakeSource()
    const ctl = startLyricsColumn(() => true, () => ALL, source)
    expect(source.active()).toBe(true)
    expect(ready()).toBe(true)
    expect(shadowText()).toContain('first')
    expect(shadowText()).toContain('Next one')

    source.emit(state('second'))
    expect(shadowText()).toContain('second')

    source.emit(null)
    expect(ready()).toBe(false)
    expect(shadowText()).toBe('')
    ctl.dispose()
    expect(source.active()).toBe(false)
  })

  it('re-attaches to the layout grid when Spotify rebuilds it', async () => {
    document.body.innerHTML = GRID
    const ctl = startLyricsColumn(() => true, () => ALL, fakeSource())
    const root = document.querySelector('[data-testid="root"]')
    const grid = document.getElementById('grid')
    const fresh = grid?.cloneNode(false) as HTMLElement
    fresh.append(document.createElement('div'))
    fresh.firstElementChild?.setAttribute('id', 'Desktop_LeftSidebar_Id')
    grid?.remove()
    root?.append(fresh)
    await vi.waitFor(() => {
      expect(host()?.parentElement).toBe(fresh)
    })
    ctl.dispose()
  })

  it('stays out of the way when the player is unavailable', () => {
    document.body.innerHTML = GRID
    document.documentElement.setAttribute(LYRICS_ATTR, '')
    const ctl = startLyricsColumn(() => true, () => ALL, { onPlayback: fn => (fn(null), () => undefined), loadCanvas: () => Promise.resolve(null) })
    expect(ready()).toBe(false)
    expect(shadowText()).toBe('')
    ctl.dispose()
  })

  it('cleans up everything on dispose', () => {
    document.body.innerHTML = GRID
    document.documentElement.setAttribute(LYRICS_ATTR, '')
    const source = fakeSource()
    const ctl = startLyricsColumn(() => true, () => ALL, source)
    expect(ready()).toBe(true)
    ctl.dispose()
    expect(host()).toBeNull()
    expect(ready()).toBe(false)
    expect(source.active()).toBe(false)
  })
})
