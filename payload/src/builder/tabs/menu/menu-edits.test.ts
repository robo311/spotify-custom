import { MENU_ITEMS, OURS, STOCK } from '../../../menu'
import type { PlaylistNode } from '../../../spotify'
import { defaultMenuSettings, MENU_GROUP_LABEL_MAX } from '../../../theme/model'
import type { MenuEntry, MenuSettings } from '../../../types'
import {
  addGroup,
  addItem,
  addSeparator,
  editLayout,
  flattenPlaylists,
  missingItems,
  moveEntry,
  orderPlaylists,
  removeEntry,
  reorderPlaylists,
  resetLayout,
  setGroupLabel,
  setHidden,
  shortcutChoices,
  shownLayout,
  toggleShortcut,
  togglePin,
} from './menu-edits'

const menu = (patch: Partial<MenuSettings> = {}): MenuSettings => ({ ...defaultMenuSettings(), ...patch })
const keys = (layout: readonly MenuEntry[]) => layout.map(e => (e.kind === 'item' ? e.key : e.kind === 'group' ? `#${e.label}` : '—'))

describe('the layout on screen', () => {
  it('is the preset’s layout; Stock shows Spotify’s order with its dividers', () => {
    expect(shownLayout(menu({ preset: 'stock' }))).toEqual(STOCK)
    expect(shownLayout(menu({ preset: 'ours' }))).toEqual(OURS)
    expect(shownLayout(menu({ preset: 'custom', custom: [] }))).toEqual(OURS)
    const custom: MenuEntry[] = [{ kind: 'item', key: 'share' }]
    expect(shownLayout(menu({ preset: 'custom', custom }))).toEqual(custom)
  })
})

describe('editing the layout', () => {
  it('copies a built-in preset into Custom first, then applies the edit', () => {
    const m = menu({ preset: 'stock', custom: [{ kind: 'item', key: 'share' }] })
    editLayout(m, addSeparator)
    expect(m.preset).toBe('custom')
    expect(m.custom).toEqual([...STOCK, { kind: 'separator' }])
    expect(STOCK.at(-1)?.kind).toBe('item') // the preset itself is untouched
  })

  it('forks from ours when Custom has not been edited yet', () => {
    const m = menu({ preset: 'custom', custom: [] })
    editLayout(m, l => setHidden(l, 0, true))
    expect(m.custom[0]).toEqual({ kind: 'item', key: 'add-to-playlist', hidden: true })
    expect(m.custom).toHaveLength(OURS.length)
  })

  it('edits Custom in place once it has a layout', () => {
    const m = menu({ preset: 'custom', custom: [{ kind: 'item', key: 'share' }] })
    editLayout(m, l => addGroup(l, 'Go'))
    expect(m.custom).toEqual([{ kind: 'item', key: 'share' }, { kind: 'group', label: 'Go' }])
  })

  it('adds and removes separators and groups, but never removes an item', () => {
    const layout: MenuEntry[] = [{ kind: 'item', key: 'share' }]
    addSeparator(layout)
    addGroup(layout, 'Later')
    expect(keys(layout)).toEqual(['share', '—', '#Later'])
    removeEntry(layout, 1)
    expect(keys(layout)).toEqual(['share', '#Later'])
    removeEntry(layout, 0)
    expect(keys(layout)).toEqual(['share', '#Later'])
    removeEntry(layout, 1)
    expect(keys(layout)).toEqual(['share'])
  })

  it('hides and shows an item, dropping the flag when shown', () => {
    const layout: MenuEntry[] = [{ kind: 'item', key: 'share' }, { kind: 'separator' }]
    setHidden(layout, 0, true)
    expect(layout[0]).toEqual({ kind: 'item', key: 'share', hidden: true })
    setHidden(layout, 0, false)
    expect(layout[0]).toEqual({ kind: 'item', key: 'share' })
    setHidden(layout, 1, true)
    expect(layout[1]).toEqual({ kind: 'separator' })
  })

  it(`caps group labels at ${MENU_GROUP_LABEL_MAX} characters`, () => {
    const layout: MenuEntry[] = [{ kind: 'group', label: 'A' }]
    setGroupLabel(layout, 0, 'x'.repeat(60))
    expect(layout[0]).toEqual({ kind: 'group', label: 'x'.repeat(MENU_GROUP_LABEL_MAX) })
  })

  it('moves rows', () => {
    const layout: MenuEntry[] = [{ kind: 'item', key: 'a' }, { kind: 'separator' }, { kind: 'item', key: 'b' }]
    moveEntry(layout, 2, 0)
    expect(keys(layout)).toEqual(['b', 'a', '—'])
  })

  it('lists catalog items the layout never mentions, and adds them at the end', () => {
    const [first, second] = [MENU_ITEMS[1].key, MENU_ITEMS[3].key]
    const layout: MenuEntry[] = MENU_ITEMS.filter(i => i.key !== first && i.key !== second).map(i => ({ kind: 'item', key: i.key }))
    expect(missingItems(layout).map(i => i.key)).toEqual([first, second])
    addItem(layout, second)
    expect(layout.at(-1)).toEqual({ kind: 'item', key: second })
    expect(missingItems(OURS)).toEqual([])
  })

  it('resets to the Spotify Custom layout, discarding Custom', () => {
    const m = menu({ preset: 'custom', custom: [{ kind: 'item', key: 'share' }] })
    resetLayout(m)
    expect(m).toMatchObject({ preset: 'ours', custom: [] })
  })
})

describe('shortcut buttons', () => {
  it('adds in order up to three and removes', () => {
    const list = ['add-to-queue'] as MenuSettings['shortcuts']['rows']
    toggleShortcut(list, 'share')
    toggleShortcut(list, 'go-to-album')
    toggleShortcut(list, 'go-to-artist')
    expect(list).toEqual(['add-to-queue', 'share', 'go-to-album'])
    toggleShortcut(list, 'add-to-queue')
    expect(list).toEqual(['share', 'go-to-album'])
  })

  it('offers Remove from queue only in the queue', () => {
    expect(shortcutChoices('rows')).not.toContain('remove-from-queue')
    expect(shortcutChoices('playerBar')).not.toContain('remove-from-queue')
    expect(shortcutChoices('queue')).toContain('remove-from-queue')
  })
})

describe('Add to playlist submenu', () => {
  const tree: PlaylistNode[] = [
    { kind: 'playlist', uri: 'p:b', name: 'beta', image: null },
    { kind: 'folder', uri: 'f:1', name: 'Mixes', children: [{ kind: 'playlist', uri: 'p:a', name: 'Alpha', image: 'https://i.scdn.co/image/x' }] },
    { kind: 'playlist', uri: 'p:c', name: 'Gamma', image: null },
  ]
  const flat = flattenPlaylists(tree)
  const settings = (patch: Partial<MenuSettings['playlists']> = {}) => ({ ...defaultMenuSettings().playlists, ...patch })
  const uris = (list: readonly { uri: string }[]) => list.map(p => p.uri)

  it('flattens folders in library order, remembering the folder', () => {
    expect(flat).toEqual([
      { uri: 'p:b', name: 'beta', image: null, folder: null },
      { uri: 'p:a', name: 'Alpha', image: 'https://i.scdn.co/image/x', folder: 'Mixes' },
      { uri: 'p:c', name: 'Gamma', image: null, folder: null },
    ])
  })

  it('shows pinned playlists first, then by the chosen sort', () => {
    expect(uris(orderPlaylists(flat, settings()))).toEqual(['p:b', 'p:a', 'p:c'])
    expect(uris(orderPlaylists(flat, settings({ sort: 'name' })))).toEqual(['p:a', 'p:b', 'p:c'])
    expect(uris(orderPlaylists(flat, settings({ sort: 'custom', order: ['p:c'] })))).toEqual(['p:c', 'p:b', 'p:a'])
    expect(uris(orderPlaylists(flat, settings({ sort: 'name', pinned: ['p:c', 'p:missing', 'p:b'] })))).toEqual(['p:c', 'p:b', 'p:a'])
  })

  it('pins at the end of the pinned ones and unpins', () => {
    const p = settings({ pinned: ['p:a'] })
    togglePin(p, 'p:c')
    expect(p.pinned).toEqual(['p:a', 'p:c'])
    togglePin(p, 'p:a')
    expect(p.pinned).toEqual(['p:c'])
  })

  it('a custom reorder writes the pinned order and the order of the rest, keeping playlists not loaded now', () => {
    const p = settings({ sort: 'custom', pinned: ['p:a', 'p:c'], order: ['p:gone'] })
    const visible = orderPlaylists(flat, p) // a, c, b
    reorderPlaylists(p, [visible[1], visible[0], visible[2]])
    expect(p.pinned).toEqual(['p:c', 'p:a'])
    expect(p.order).toEqual(['p:b', 'p:gone'])
  })
})
