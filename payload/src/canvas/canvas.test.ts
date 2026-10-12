import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Theme } from '../types'
import { startCanvasCover } from './index'
import { coverTargets, OVERLAY_CLASS, syncOverlays } from './overlay'

vi.mock('../spotify', () => ({
  spotify: {
    onPlayback: () => () => undefined,
    onNavigate: () => () => undefined,
    currentPath: () => '/',
    uriToPath: () => null,
  },
}))

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

function mount(): void {
  document.body.innerHTML = `
    <div data-testid="now-playing-widget"><div data-testid="CoverSlotCollapsed__container"><img></div></div>
    <div id="main-view"><section data-testid="album-page"><div data-testid="entity-header">
      <div class="backdrop"></div>
      <div><button class="cover"><img></button><div class="text"><h1>Album</h1></div></div>
    </div></section></div>`
}

const q = (s: string) => document.querySelector(s)

describe('coverTargets', () => {
  it('puts the video on the player bar cover, and on the album header only when that album is playing', () => {
    mount()
    expect(coverTargets({ banner: false, onPlayingAlbum: false, album: true, playerBar: true })).toEqual([q('[data-testid="CoverSlotCollapsed__container"]')])
    expect(coverTargets({ banner: false, onPlayingAlbum: true, album: true, playerBar: true })).toEqual([q('[data-testid="CoverSlotCollapsed__container"]'), q('.cover')])
  })

  it('uses only the places that are turned on', () => {
    mount()
    expect(coverTargets({ banner: false, onPlayingAlbum: true, album: true, playerBar: false })).toEqual([q('.cover')])
    expect(coverTargets({ banner: false, onPlayingAlbum: true, album: false, playerBar: true })).toEqual([q('[data-testid="CoverSlotCollapsed__container"]')])
  })

  it('fills the banner instead of the (hidden) cover in the banner layout', () => {
    mount()
    expect(coverTargets({ banner: true, onPlayingAlbum: true, album: true, playerBar: true })).toContain(q('.backdrop'))
  })
})

describe('syncOverlays', () => {
  const stream = new MediaStream()

  it('adds one muted video per target, keeps it on the next sync, and removes it from places no longer wanted', () => {
    mount()
    const bar = q('[data-testid="CoverSlotCollapsed__container"]')
    const cover = q('.cover')
    if (!bar || !cover) throw new Error('fixture')
    syncOverlays([bar, cover], stream)
    const first = bar.querySelector(`video.${OVERLAY_CLASS}`)
    expect(first).not.toBeNull()
    expect((first as HTMLVideoElement).muted).toBe(true)
    syncOverlays([bar, cover], stream)
    expect(document.querySelectorAll(`video.${OVERLAY_CLASS}`)).toHaveLength(2)
    expect(bar.querySelector(`video.${OVERLAY_CLASS}`)).toBe(first)
    syncOverlays([bar], stream)
    expect(cover.querySelector(`.${OVERLAY_CLASS}`)).toBeNull()
    syncOverlays([], null)
    expect(document.querySelectorAll(`.${OVERLAY_CLASS}`)).toHaveLength(0)
  })
})

describe('startCanvasCover', () => {
  const theme = { effects: { canvasAlbum: false, canvasPlayerBar: true }, pageStyle: { headerLayout: 'default' } } as unknown as Theme

  /** Puts Spotify's panel Canvas video on the page; each captureStream() hands out a stream with its own track. */
  function mountPanel() {
    document.body.insertAdjacentHTML('beforeend', '<div data-testid="NPV_Panel_OpenDiv"><video></video></div>')
    const video = document.querySelector('[data-testid="NPV_Panel_OpenDiv"] video')
    if (!video) throw new Error('fixture')
    const tracks: { stop: ReturnType<typeof vi.fn> }[] = []
    Object.assign(video, {
      captureStream: () => {
        const track = { stop: vi.fn() }
        tracks.push(track)
        const stream = new MediaStream()
        Object.assign(stream, { getTracks: () => [track] })
        return stream
      },
    })
    return { video, tracks }
  }

  it('stops the previous mirror when re-capturing, when the panel video goes, and on dispose', () => {
    mount()
    const { video, tracks } = mountPanel()
    const cover = startCanvasCover(() => theme)
    expect(tracks).toHaveLength(1)

    video.dispatchEvent(new Event('loadeddata'))
    expect(tracks).toHaveLength(2)
    expect(tracks[0]?.stop).toHaveBeenCalled()
    expect(tracks[1]?.stop).not.toHaveBeenCalled()

    video.parentElement?.remove()
    cover.refresh()
    expect(tracks[1]?.stop).toHaveBeenCalled()

    const again = mountPanel()
    cover.refresh()
    cover.dispose()
    expect(again.tracks[0]?.stop).toHaveBeenCalled()
  })

  it('leaves its style element alone when nothing changed', () => {
    mount()
    mountPanel()
    const cover = startCanvasCover(() => theme)
    const style = document.getElementById('sc-canvas-cover')
    if (!style) throw new Error('style missing')
    const watcher = new MutationObserver(() => undefined)
    watcher.observe(style, { childList: true, characterData: true, subtree: true })
    cover.refresh()
    expect(watcher.takeRecords()).toHaveLength(0)
    watcher.disconnect()
    cover.dispose()
  })
})
