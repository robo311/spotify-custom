// Reads one of Spotify's open menus into plain items. The DOM has no stable per-item ids and its labels are
// localised, so each item's identity comes from React: the component a few fibers up from the button carries
// `menuAction` (e.g. 'add-to-queue'), Spotify's `divider`, and the item's `uri` / `uris`.
import type { LiveItem } from './layout'
import { MENU_ITEM } from './selectors'

export interface CapturedItem extends LiveItem {
  /** Spotify's menuAction, or `unknown:<index>` when it has none (it then lands with the layout's leftovers). */
  key: string
  label: string
  /** A clone of Spotify's icon. */
  icon: SVGElement | null
  disabled: boolean
  checked: boolean
  /** Opens one of Spotify's submenus. */
  submenu: boolean
  /** Spotify's own button or link: clicking it runs the item. */
  element: HTMLElement
  /** Spotify's open/close switch for a submenu trigger, when it has one. */
  setOpen: ((open: boolean) => void) | null
}

export interface CapturedMenu {
  items: CapturedItem[]
  /** A song menu (follows the user's layout); every other menu keeps Spotify's order. */
  song: boolean
  /** The songs the menu is about (for our "Add to playlist"). */
  uris: string[]
}

type Props = Record<string, unknown>

const MAX_DEPTH = 25

const isProps = (v: unknown): v is Props => typeof v === 'object' && v !== null

/** Memoized props from the element's fiber up to (not including) the menu list. */
export function propsChain(el: Element): Props[] {
  const key = Object.keys(el).find(k => k.startsWith('__reactFiber$'))
  let fiber: unknown = key ? (el as unknown as Props)[key] : null
  const chain: Props[] = []
  for (let depth = 0; isProps(fiber) && depth < MAX_DEPTH; depth++) {
    const props = fiber.memoizedProps
    if (isProps(props)) {
      if (props.role === 'menu') break
      chain.push(props)
    }
    fiber = fiber.return
  }
  return chain
}

export interface ItemFacts {
  key: string | null
  divider?: LiveItem['divider']
  uri: string | null
  uris: string[]
  setOpen: ((open: boolean) => void) | null
}

const DIVIDERS = new Set(['before', 'after', 'both'])
const isDivider = (v: unknown): v is NonNullable<LiveItem['divider']> => typeof v === 'string' && DIVIDERS.has(v)

/** Pure: what a fiber props chain says about one item. The nearest value wins. */
export function itemFacts(chain: readonly Props[]): ItemFacts {
  const facts: ItemFacts = { key: null, uri: null, uris: [], setOpen: null }
  for (const p of chain) {
    if (facts.key === null && typeof p.menuAction === 'string' && p.menuAction) {
      facts.key = p.menuAction
      if (isDivider(p.divider)) facts.divider = p.divider
    }
    if (!facts.divider && isDivider(p.divider)) facts.divider = p.divider
    if (facts.uri === null && typeof p.uri === 'string') facts.uri = p.uri
    if (facts.uris.length === 0 && Array.isArray(p.uris)) facts.uris = p.uris.filter((u): u is string => typeof u === 'string')
    if (!facts.setOpen && typeof p.setIsOpen === 'function') {
      const fn = p.setIsOpen as (open: boolean) => void
      facts.setOpen = open => fn(open)
    }
  }
  return facts
}

const isSongUri = (uri: string) => uri.startsWith('spotify:track:') || uri.startsWith('spotify:local:')

/** Reads every item of a ul[role=menu]. */
export function readMenu(list: Element): CapturedMenu {
  const items: CapturedItem[] = []
  let song = false
  let uris: string[] = []
  list.querySelectorAll<HTMLElement>(MENU_ITEM).forEach((element, index) => {
    const facts = itemFacts(propsChain(element))
    const svg = element.querySelector('svg')
    items.push({
      key: facts.key ?? `unknown:${index}`,
      divider: facts.divider,
      label: element.textContent.trim(),
      icon: svg ? (svg.cloneNode(true) as SVGElement) : null,
      disabled: element.getAttribute('aria-disabled') === 'true',
      checked: element.getAttribute('aria-checked') === 'true',
      submenu: element.hasAttribute('aria-expanded'),
      element,
      setOpen: facts.setOpen,
    })
    if ((facts.uri && isSongUri(facts.uri)) || facts.uris.some(isSongUri)) song = true
    // add-to-playlist carries every selected song; otherwise the item's own song.
    if (facts.key === 'add-to-playlist' && facts.uris.length > 0) uris = facts.uris
    else if (uris.length === 0 && facts.uri && isSongUri(facts.uri)) uris = [facts.uri]
  })
  return { items, song, uris }
}
