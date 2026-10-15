import { describe, expect, it } from 'vitest'
import type { MenuEntry } from '../types'
import { arrange, type LiveItem, type Row } from './layout'
import { OURS, presetLayout } from './catalog'

// Live order of a song menu in Liked Songs (Spotify 1.3.4), with Spotify's own dividers.
const LIKED: LiveItem[] = [
  { key: 'add-to-playlist' },
  { key: 'add-to-liked-songs' },
  { key: 'add-to-queue' },
  { key: 'exclude-from-taste-profile' },
  { key: 'start-jam' },
  { key: 'sleep-timer' },
  { key: 'go-to-radio', divider: 'before' },
  { key: 'go-to-artist' },
  { key: 'go-to-album' },
  { key: 'show-credits' },
  { key: 'share', divider: 'before' },
]

const show = (rows: Row<LiveItem>[]) => rows.map(r => (r.kind === 'item' ? r.item.key : r.kind === 'group' ? `[${r.label}]` : '---'))

describe('arrange', () => {
  it('keeps Spotify order and dividers for the stock layout', () => {
    expect(show(arrange(null, LIKED))).toEqual([
      'add-to-playlist', 'add-to-liked-songs', 'add-to-queue', 'exclude-from-taste-profile', 'start-jam', 'sleep-timer',
      '---', 'go-to-radio', 'go-to-artist', 'go-to-album', 'show-credits', '---', 'share',
    ])
  })

  it("draws Spotify's divider on both sides (playlist menus' add-to-profile)", () => {
    const live: LiveItem[] = [{ key: 'mix' }, { key: 'add-to-profile', divider: 'both' }, { key: 'download' }]
    expect(show(arrange(null, live))).toEqual(['mix', '---', 'add-to-profile', '---', 'download'])
  })

  it('lays out our preset, skipping items this menu does not have', () => {
    expect(show(arrange(OURS, LIKED))).toEqual([
      'add-to-playlist', 'add-to-liked-songs', 'add-to-queue',
      '---', 'go-to-album', 'go-to-artist', 'go-to-radio', 'show-credits',
      '---', 'sleep-timer', 'start-jam', 'share',
      '---', 'exclude-from-taste-profile',
    ])
  })

  it('puts items the layout never mentions after the item Spotify shows before them, so new items never vanish', () => {
    const layout: MenuEntry[] = [{ kind: 'item', key: 'add-to-queue' }, { kind: 'separator' }, { kind: 'item', key: 'share' }]
    // Several artists: Spotify's "Go to artist" is a submenu without a key; it follows its neighbour.
    const live = [{ key: 'add-to-queue' }, { key: 'unknown:1' }, { key: 'share' }]
    expect(show(arrange(layout, live))).toEqual(['add-to-queue', 'unknown:1', '---', 'share'])
  })

  it('appends a leftover at the end when its neighbour is hidden or missing from the layout', () => {
    const layout: MenuEntry[] = [{ kind: 'item', key: 'share' }, { kind: 'item', key: 'add-to-queue', hidden: true }]
    expect(show(arrange(layout, [{ key: 'brand-new' }, { key: 'share' }]))).toEqual(['share', 'brand-new'])
    expect(show(arrange(layout, [{ key: 'add-to-queue' }, { key: 'brand-new' }, { key: 'share' }]))).toEqual(['share', 'brand-new'])
  })

  it('leaves hidden items out (they are not leftovers)', () => {
    const layout: MenuEntry[] = [{ kind: 'item', key: 'add-to-queue' }, { kind: 'item', key: 'share', hidden: true }]
    expect(show(arrange(layout, [{ key: 'share' }, { key: 'add-to-queue' }]))).toEqual(['add-to-queue'])
  })

  it('drops empty groups and stray separators', () => {
    const layout: MenuEntry[] = [
      { kind: 'separator' },
      { kind: 'group', label: 'Empty' },
      { kind: 'item', key: 'missing' },
      { kind: 'separator' },
      { kind: 'separator' },
      { kind: 'group', label: 'Queue' },
      { kind: 'item', key: 'add-to-queue' },
      { kind: 'separator' },
      { kind: 'group', label: 'Go' },
      { kind: 'item', key: 'go-to-album' },
      { kind: 'separator' },
    ]
    expect(show(arrange(layout, [{ key: 'add-to-queue' }, { key: 'go-to-album' }]))).toEqual(['[Queue]', 'add-to-queue', '[Go]', 'go-to-album'])
  })
})

describe('presetLayout', () => {
  it('gives null (Spotify order) for stock, ours for ours, and the saved layout for custom', () => {
    const custom: MenuEntry[] = [{ kind: 'item', key: 'share' }]
    expect(presetLayout('stock', custom)).toBeNull()
    expect(presetLayout('ours', custom)).toBe(OURS)
    expect(presetLayout('custom', custom)).toBe(custom)
  })

  it('falls back to ours when a custom layout is empty', () => {
    expect(presetLayout('custom', [])).toBe(OURS)
  })
})
