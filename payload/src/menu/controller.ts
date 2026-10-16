// startMenu: while settings.enabled, every Spotify context menu is drawn as our panel instead. Song menus follow the
// user's layout, every other menu keeps Spotify's order; each row runs Spotify's own (hidden) item, Spotify's
// submenus are mirrored, and "Add to playlist" in song menus is ours.
import type { MenuSettings } from '../types'
import { spotify } from '../spotify'
import { presetLayout } from './catalog'
import type { CapturedItem, CapturedMenu } from './capture'
import { readMenu } from './capture'
import { arrange } from './layout'
import type { Entry, Level, PanelRow } from './model'
import { closePlaylistPicker } from './picker'
import { showPlaylistMenu, type PlaylistApi } from './playlist-menu'
import type { Anchor, Rect } from './position'
import { watchMenus, type SpotifyMenu } from './spotify-menu'
import { openStack, type MenuStack } from './stack'
import { hideToast } from './toast'

export interface MenuController {
  /** Re-read the settings (layout, preset, on/off). */
  refresh(): void
  dispose(): void
}

const HOST_ID = 'sc-menu'
/** A right-click this recent placed the menu: open at the cursor (else where Spotify put its menu). */
const POINTER_FRESH_MS = 800

let warnedSub = false

/** Rows of one Spotify menu (layout null = Spotify's order), and the item behind each entry id. */
function rowsOf(menu: CapturedMenu, layout: Parameters<typeof arrange>[0]): { rows: PanelRow[]; items: Map<string, CapturedItem> } {
  const items = new Map<string, CapturedItem>()
  const rows = arrange(layout, menu.items).map((row): PanelRow => {
    if (row.kind !== 'item') return row
    const item = row.item
    const id = String(menu.items.indexOf(item))
    items.set(id, item)
    const entry: Entry = {
      id,
      label: item.label,
      icon: item.icon ? { kind: 'svg', node: item.icon } : item.image ? { kind: 'image', src: item.image } : undefined,
      disabled: item.disabled,
      checked: item.checked,
      submenu: item.submenu,
    }
    return { kind: 'item', entry }
  })
  return { rows, items }
}

export function startMenu(getSettings: () => MenuSettings, api: PlaylistApi = spotify): MenuController {
  let stopWatching: (() => void) | null = null
  let stack: MenuStack | null = null
  let lastPress: { x: number; y: number; at: number } | null = null

  const onContextMenu = (e: MouseEvent) => {
    if (e.isTrusted) lastPress = { x: e.clientX, y: e.clientY, at: performance.now() }
  }

  const closeStack = () => {
    stack?.dispose()
    stack = null
  }

  const opened = (menu: SpotifyMenu) => {
    closeStack()
    const settings = getSettings()
    const captured = menu.read()
    if (captured.items.length === 0) {
      menu.release()
      return
    }
    const layout = captured.song ? presetLayout(settings.preset, settings.custom) : null
    const rect = menu.list.getBoundingClientRect()
    const press = lastPress && performance.now() - lastPress.at < POINTER_FRESH_MS ? lastPress : null
    const anchor: Anchor = { kind: 'point', x: press?.x ?? rect.left, y: press?.y ?? rect.top }

    const own = openStack(HOST_ID, () => finish())
    stack = own
    const finish = () => {
      if (stack === own) stack = null
      own.dispose()
      menu.close()
    }
    /** Runs Spotify's item; it closes its menu itself, or we do. */
    const run = (item: CapturedItem) => {
      if (stack === own) stack = null
      own.dispose()
      item.element.click()
      requestAnimationFrame(() => menu.close())
    }

    /** One of Spotify's submenus at `depth`, mirrored once Spotify has rendered it (hidden). */
    const spotifySub = (depth: number, trigger: CapturedItem, rect: Rect, from: string) => {
      void menu.openSub(trigger, depth).then(list => {
        if (stack !== own) return
        if (!list) {
          if (!warnedSub) console.warn("[spotify-custom] Spotify's submenu didn't open; showing Spotify's menu instead")
          warnedSub = true
          stack = null
          own.dispose()
          menu.release()
          return
        }
        const sub = rowsOf(readMenu(list), null)
        const shown = own.set(depth, level(sub.rows, () => sub.items, { kind: 'beside', rect }, trigger.label, depth, () => menu.closeSub(trigger)), from)
        if (!shown) menu.closeSub(trigger)
      })
    }

    type Items = () => Map<string, CapturedItem>
    const level = (rows: PanelRow[], items: Items, at: Anchor, label: string, depth: number, closed?: () => void): Level => ({
      rows,
      anchor: at,
      label,
      closed,
      activate: e => {
        const item = items().get(e.id)
        if (item) run(item)
      },
      open: (e, r) => {
        const item = items().get(e.id)
        if (!item) return
        if (depth === 0 && captured.song && item.key === 'add-to-playlist' && captured.uris.length > 0) {
          showPlaylistMenu(own, 1, { kind: 'beside', rect: r }, { uris: captured.uris, settings: settings.playlists, api, from: e.id, picked: finish })
        } else spotifySub(depth + 1, item, r, e.id)
      },
    })

    let top = rowsOf(captured, layout)
    own.set(0, level(top.rows, () => top.items, anchor, 'Menu', 0))

    menu.onClosed(() => {
      if (stack === own) stack = null
      own.dispose()
    })
    menu.onSubClosed(depth => own.truncate(depth))
    menu.onChange(() => {
      top = rowsOf(menu.read(), layout)
      own.update(0, { rows: top.rows })
    })
  }

  const start = () => {
    stopWatching = watchMenus(opened)
    window.addEventListener('contextmenu', onContextMenu, true)
  }

  const stop = () => {
    closeStack()
    stopWatching?.()
    stopWatching = null
    window.removeEventListener('contextmenu', onContextMenu, true)
  }

  const refresh = () => {
    const enabled = getSettings().enabled
    if (enabled && !stopWatching) start()
    else if (!enabled && stopWatching) stop()
  }
  refresh()

  return {
    refresh,
    dispose() {
      stop()
      closePlaylistPicker()
      hideToast()
    },
  }
}
