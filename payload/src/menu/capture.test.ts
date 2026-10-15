import { describe, expect, it, vi } from 'vitest'
import { itemFacts, readMenu } from './capture'

type Props = Record<string, unknown>

/** A menu item whose fiber chain carries `chain` (nearest first), like Spotify's (button → li → item component). */
function li(label: string, chain: Props[], attrs: Record<string, string> = {}, tag = 'button'): HTMLLIElement {
  const item = document.createElement('li')
  item.setAttribute('role', 'presentation')
  const el = document.createElement(tag)
  el.setAttribute('role', 'menuitem')
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<svg viewBox="0 0 16 16"><path d="M0 0h16"/></svg><span>${label}</span>`
  let fiber: Props | null = { memoizedProps: { role: 'menu' }, return: null }
  for (const props of [...chain].reverse()) fiber = { memoizedProps: props, return: fiber }
  ;(el as unknown as Props).__reactFiber$test = { memoizedProps: { className: 'x', role: 'menuitem' }, return: fiber }
  item.append(el)
  return item
}

function menu(...items: HTMLElement[]): HTMLUListElement {
  const ul = document.createElement('ul')
  ul.setAttribute('role', 'menu')
  ul.append(...items)
  return ul
}

const TRACK = 'spotify:track:7u0yW2XPSJozIGdUSRET19'

describe('itemFacts', () => {
  it('takes the nearest menuAction with its divider, and the uri/uris further up', () => {
    const facts = itemFacts([
      { role: 'presentation' },
      { menuAction: 'go-to-radio', divider: 'before' },
      { menuAction: 'outer', divider: 'after' },
      { uri: TRACK, uris: [TRACK, 7] },
    ])
    expect(facts).toMatchObject({ key: 'go-to-radio', divider: 'before', uri: TRACK, uris: [TRACK] })
  })

  it('has no key for items without a menuAction (e.g. the multi-artist submenu)', () => {
    const setIsOpen = vi.fn()
    const facts = itemFacts([{ setIsOpen, divider: undefined }, { trackUri: TRACK }])
    expect(facts.key).toBeNull()
    facts.setOpen?.(true)
    expect(setIsOpen).toHaveBeenCalledWith(true)
  })
})

describe('readMenu', () => {
  it('reads keys, labels, icons, state and submenus, and tells a song menu by its uris', () => {
    const ul = menu(
      li('Add to playlist', [{ menuAction: 'add-to-playlist', uris: [TRACK, 'spotify:track:2'] }], { 'aria-expanded': 'false' }),
      li('Remove', [{ menuAction: 'delete', shortcut: 'backspace' }, { uris: [TRACK], playlistUri: 'spotify:playlist:x' }]),
      li('Go to album', [{ menuAction: 'go-to-album' }], {}, 'a'),
      li('Mystery', [{ divider: 'both' }], { 'aria-disabled': 'true', 'aria-checked': 'true' }),
    )
    const div = document.createElement('div') // Spotify's divider element: not an item
    ul.insertBefore(div, ul.children[2])
    const m = readMenu(ul)
    expect(m.items.map(i => i.key)).toEqual(['add-to-playlist', 'delete', 'go-to-album', 'unknown:3'])
    expect(m.items[0]).toMatchObject({ label: 'Add to playlist', submenu: true, disabled: false })
    expect(m.items[0]?.icon?.tagName.toLowerCase()).toBe('svg')
    expect(m.items[0]?.icon).not.toBe(ul.querySelector('svg')) // a clone, never Spotify's node
    expect(m.items[2]?.element.tagName).toBe('A')
    expect(m.items[3]).toMatchObject({ disabled: true, checked: true, divider: 'both', submenu: false })
    expect(m.song).toBe(true)
    expect(m.uris).toEqual([TRACK, 'spotify:track:2'])
  })

  it('is not a song menu when no item is about a song', () => {
    const m = readMenu(menu(li('Download', [{ menuAction: 'download', uri: 'spotify:playlist:37i9' }])))
    expect(m.song).toBe(false)
    expect(m.uris).toEqual([])
  })

  it("falls back to an item's own song uri", () => {
    const m = readMenu(menu(li('Queue', [{ menuAction: 'add-to-queue' }, { uri: TRACK }])))
    expect(m.uris).toEqual([TRACK])
  })
})
