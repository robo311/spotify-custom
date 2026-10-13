import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultLyricsAnimation } from '../theme/model'
import type { LyricsAnimation, PlaybackState } from '../types'
import type { TrackLyrics } from '../spotify'
import { startLyricsView, withIntro, type LyricsSource } from './controller'

const TRACK = { uri: 'spotify:track:2nopDUxom21JoMzFXj9wS0', name: 'Hands Up', artists: [], album: { name: '', uri: '' }, image: null, thumb: null, canvasId: null }
const SYNCED: TrackLyrics = {
  synced: true,
  provider: 'Musixmatch',
  lines: [
    { startMs: 1000, endMs: null, text: 'We back on track', syllables: null },
    { startMs: 4000, endMs: null, text: 'Hands up', syllables: null },
  ],
}

function layout() {
  document.body.innerHTML = `
    <div data-testid="root"><div><nav id="Desktop_LeftSidebar_Id"></nav>
      <div class="view"><div data-overlayscrollbars></div></div>
    </div></div>`
  const view = document.querySelector('.view')
  if (!view) throw new Error('no view')
  return view
}

const open = () => document.documentElement.setAttribute('data-cinema-npv-postenter', '')
const frames = () => new Promise(resolve => setTimeout(resolve, 40))

function fakeSource(lyrics: TrackLyrics | null) {
  let push: (s: PlaybackState | null) => void = () => undefined
  const loadLyrics = vi.fn(() => Promise.resolve(lyrics))
  const seekTo = vi.fn()
  const source: LyricsSource = {
    onPlayback: fn => {
      push = fn
      return () => undefined
    },
    loadLyrics,
    playbackTime: () => ({ positionMs: 2000, durationMs: 10_000 }),
    seekTo,
  }
  return { source, loadLyrics, seekTo, play: () => push({ track: TRACK, next: [], paused: false }) }
}

const ON: LyricsAnimation = { ...defaultLyricsAnimation(), on: true }

afterEach(() => {
  document.documentElement.removeAttribute('data-cinema-npv-postenter')
  document.documentElement.removeAttribute('data-sc-lyrics-own')
  document.body.innerHTML = ''
})

describe('startLyricsView', () => {
  it("draws synced lyrics inside the open lyrics view and hides Spotify's", async () => {
    const view = layout()
    open()
    const { source, play } = fakeSource(SYNCED)
    const c = startLyricsView(() => ON, source)
    play()
    await frames()
    const host = view.querySelector('#sc-lyrics-view')
    expect(host?.shadowRoot?.querySelectorAll('.line')).toHaveLength(2)
    expect(document.documentElement.hasAttribute('data-sc-lyrics-own')).toBe(true)
    expect(host?.shadowRoot?.querySelector('.line.active')?.textContent).toBe('We back on track')
    c.dispose()
    expect(view.querySelector('#sc-lyrics-view')).toBeNull()
    expect(document.documentElement.hasAttribute('data-sc-lyrics-own')).toBe(false)
  })

  it('seeks to a line when it is clicked', async () => {
    const view = layout()
    open()
    const { source, seekTo, play } = fakeSource(SYNCED)
    const c = startLyricsView(() => ON, source)
    play()
    await frames()
    view.querySelector('#sc-lyrics-view')?.shadowRoot?.querySelectorAll<HTMLElement>('.line')[1]?.click()
    expect(seekTo).toHaveBeenCalledWith(4000)
    c.dispose()
  })

  it("leaves Spotify's view alone without synced lyrics, while the view is closed, or when off", async () => {
    const view = layout()
    open()
    const unsynced = fakeSource({ ...SYNCED, synced: false })
    const a = startLyricsView(() => ON, unsynced.source)
    unsynced.play()
    await frames()
    expect(view.querySelector('#sc-lyrics-view')).toBeNull()
    a.dispose()

    document.documentElement.removeAttribute('data-cinema-npv-postenter')
    const closed = fakeSource(SYNCED)
    const b = startLyricsView(() => ON, closed.source)
    closed.play()
    await frames()
    expect(view.querySelector('#sc-lyrics-view')).toBeNull()
    b.dispose()

    open()
    const off = fakeSource(SYNCED)
    const c = startLyricsView(() => ({ ...ON, on: false }), off.source)
    off.play()
    await frames()
    expect(off.loadLyrics).not.toHaveBeenCalled()
    c.dispose()
  })
})

describe('startLyricsView across a song change', () => {
  // Tearing the view down on every skip let Spotify's own lines flash through, dropped the cover panel and replayed
  // the entrance: the whole page jumped. The view stays; only its lines fade out and back in.
  it('keeps the view while the next lyrics load, then swaps in the new lines', async () => {
    const view = layout()
    open()
    let push: (s: PlaybackState | null) => void = () => undefined
    let resolveNext: (l: TrackLyrics) => void = () => undefined
    const loadLyrics = vi
      .fn<LyricsSource['loadLyrics']>()
      .mockResolvedValueOnce(SYNCED)
      .mockImplementationOnce(() => new Promise(resolve => (resolveNext = resolve)))
    const source: LyricsSource = {
      onPlayback: fn => {
        push = fn
        return () => undefined
      },
      loadLyrics,
      playbackTime: () => ({ positionMs: 2000, durationMs: 10_000 }),
      seekTo: () => undefined,
    }
    const c = startLyricsView(() => ON, source)
    push({ track: TRACK, next: [], paused: false })
    await frames()
    const host = view.querySelector('#sc-lyrics-view')
    push({ track: { ...TRACK, uri: 'spotify:track:7nopDUxom21JoMzFXj9wS0', name: 'Next' }, next: [], paused: false })
    await frames()
    expect(view.querySelector('#sc-lyrics-view')).toBe(host)
    expect(document.documentElement.hasAttribute('data-sc-lyrics-own')).toBe(true)
    expect(host?.shadowRoot?.querySelector('.lines')?.classList.contains('leaving')).toBe(true)
    resolveNext({ ...SYNCED, lines: [{ startMs: 500, endMs: null, text: 'Brand new', syllables: null }] })
    await frames()
    expect(view.querySelector('#sc-lyrics-view')).toBe(host)
    expect(host?.shadowRoot?.querySelector('.line')?.textContent).toBe('Brand new')
    expect(host?.shadowRoot?.querySelector('.lines')?.classList.contains('leaving')).toBe(false)
    c.dispose()
  })

  it("hands back to Spotify's view when the next song has no synced lyrics", async () => {
    const view = layout()
    open()
    let push: (s: PlaybackState | null) => void = () => undefined
    const loadLyrics = vi.fn<LyricsSource['loadLyrics']>().mockResolvedValueOnce(SYNCED).mockResolvedValueOnce(null)
    const source: LyricsSource = {
      onPlayback: fn => {
        push = fn
        return () => undefined
      },
      loadLyrics,
      playbackTime: () => ({ positionMs: 2000, durationMs: 10_000 }),
      seekTo: () => undefined,
    }
    const c = startLyricsView(() => ON, source)
    push({ track: TRACK, next: [], paused: false })
    await frames()
    push({ track: { ...TRACK, uri: 'spotify:track:7nopDUxom21JoMzFXj9wS0' }, next: [], paused: false })
    await frames()
    expect(view.querySelector('#sc-lyrics-view')).toBeNull()
    expect(document.documentElement.hasAttribute('data-sc-lyrics-own')).toBe(false)
    c.dispose()
  })
})

describe('startLyricsView after a failed load', () => {
  it('tries again when the lyrics view next opens', async () => {
    const view = layout()
    open()
    const { source, loadLyrics, play } = fakeSource(SYNCED)
    loadLyrics.mockImplementationOnce(() => Promise.reject(new Error('No Spotify session captured yet')))
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const c = startLyricsView(() => ON, source)
    play()
    await frames()
    expect(view.querySelector('#sc-lyrics-view')).toBeNull()
    document.documentElement.removeAttribute('data-cinema-npv-postenter')
    open()
    await frames()
    expect(loadLyrics).toHaveBeenCalledTimes(2)
    expect(view.querySelector('#sc-lyrics-view')).not.toBeNull()
    c.dispose()
  })
})

describe('withIntro', () => {
  it('opens with a break when the singing starts late', () => {
    expect(withIntro(SYNCED.lines)).toHaveLength(2)
    const late = withIntro([{ startMs: 12_000, endMs: null, text: 'hi', syllables: null }])
    expect(late[0]).toEqual({ startMs: 0, endMs: null, text: '', syllables: null })
  })
})
