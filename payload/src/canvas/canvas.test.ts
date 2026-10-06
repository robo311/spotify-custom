import { afterEach, describe, expect, it } from 'vitest'
import { coverTargets, OVERLAY_CLASS, syncOverlays } from './overlay'

afterEach(() => {
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
