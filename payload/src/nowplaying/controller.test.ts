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
  },
  next: [{ uri: 'spotify:track:n', name: 'Next one', artists: [{ name: 'B', uri: '' }], album: { name: '', uri: '' }, image: null, thumb: null }],
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
  }
  return source
}

const host = () => document.getElementById('sc-lyrics-npv')
const shadowText = () => host()?.shadowRoot?.textContent ?? ''
const ready = () => document.documentElement.hasAttribute('data-sc-lyrics-npv')

afterEach(() => {
  document.documentElement.removeAttribute(LYRICS_ATTR)
  document.body.innerHTML = ''
})

describe('startLyricsColumn', () => {
  it('puts a host in the layout grid only while enabled', () => {
    document.body.innerHTML = GRID
    let on = false
    const ctl = startLyricsColumn(() => on, fakeSource())
    expect(host()).toBeNull()
    on = true
    ctl.refresh()
    expect(host()?.parentElement?.id).toBe('grid')
    on = false
    ctl.refresh()
    expect(host()).toBeNull()
    ctl.dispose()
  })

  // Rendered ahead of time (CSS keeps it hidden outside the lyrics view), so Spotify's open transition already
  // captures the final layout instead of the column landing as a jump afterwards.
  it('follows playback while enabled and is ready before the lyrics view opens', () => {
    document.body.innerHTML = GRID
    const source = fakeSource()
    const ctl = startLyricsColumn(() => true, source)
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
    const ctl = startLyricsColumn(() => true, fakeSource())
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
    const ctl = startLyricsColumn(() => true, { onPlayback: fn => (fn(null), () => undefined) })
    expect(ready()).toBe(false)
    expect(shadowText()).toBe('')
    ctl.dispose()
  })

  it('cleans up everything on dispose', () => {
    document.body.innerHTML = GRID
    document.documentElement.setAttribute(LYRICS_ATTR, '')
    const source = fakeSource()
    const ctl = startLyricsColumn(() => true, source)
    expect(ready()).toBe(true)
    ctl.dispose()
    expect(host()).toBeNull()
    expect(ready()).toBe(false)
    expect(source.active()).toBe(false)
  })
})
