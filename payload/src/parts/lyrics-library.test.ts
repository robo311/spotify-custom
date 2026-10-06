import { afterEach, describe, expect, it, vi } from 'vitest'
import { startLyricsLibrary } from './lyrics-library'

function sidebar(): HTMLElement {
  const el = document.getElementById('Desktop_LeftSidebar_Id')
  if (!el) throw new Error('no sidebar')
  return el
}

function setUp(lyricsOpen: boolean) {
  document.body.innerHTML = '<div data-testid="root"><div><div id="Desktop_LeftSidebar_Id"></div></div></div>'
  if (lyricsOpen) document.documentElement.setAttribute('data-cinema-npv-postenter', '')
}

/** What Spotify does when the lyrics view opens or closes. */
function spotifyLyrics(open: boolean) {
  if (open) {
    document.documentElement.setAttribute('data-cinema-npv-postenter', '')
    sidebar().inert = true
  } else {
    document.documentElement.removeAttribute('data-cinema-npv-postenter')
    sidebar().inert = false
  }
}

afterEach(() => {
  document.documentElement.removeAttribute('data-cinema-npv-postenter')
  document.body.innerHTML = ''
})

describe('startLyricsLibrary', () => {
  it('makes the kept library usable when Spotify marks it inert in the lyrics view', async () => {
    setUp(false)
    const ctl = startLyricsLibrary(() => true)
    spotifyLyrics(true)
    await vi.waitFor(() => {
      expect(sidebar().inert).toBe(false)
    })
    ctl.dispose()
  })

  it('leaves Spotify alone when the library is not kept', async () => {
    setUp(false)
    const ctl = startLyricsLibrary(() => false)
    spotifyLyrics(true)
    await new Promise(r => requestAnimationFrame(r))
    await new Promise(r => requestAnimationFrame(r))
    expect(sidebar().inert).toBe(true)
    ctl.dispose()
  })

  it('does not touch an inert library outside the lyrics view', async () => {
    setUp(false)
    const ctl = startLyricsLibrary(() => true)
    sidebar().inert = true
    await new Promise(r => requestAnimationFrame(r))
    await new Promise(r => requestAnimationFrame(r))
    expect(sidebar().inert).toBe(true)
    ctl.dispose()
  })

  it('applies right away when already open, and gives inert back when the option is turned off', () => {
    setUp(true)
    sidebar().inert = true
    let keep = true
    const ctl = startLyricsLibrary(() => keep)
    expect(sidebar().inert).toBe(false)
    keep = false
    ctl.refresh()
    expect(sidebar().inert).toBe(true)
    ctl.dispose()
  })

  it('gives inert back on dispose while the lyrics view is still open', () => {
    setUp(true)
    sidebar().inert = true
    const ctl = startLyricsLibrary(() => true)
    expect(sidebar().inert).toBe(false)
    ctl.dispose()
    expect(sidebar().inert).toBe(true)
  })
})
