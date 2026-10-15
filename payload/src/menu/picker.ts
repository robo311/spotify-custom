// The "Add to playlist" menu on its own, opened at a point (the playlist shortcut button). One at a time.
import type { PlaylistMenuSettings } from '../types'
import { spotify } from '../spotify'
import { showPlaylistMenu, type PlaylistApi } from './playlist-menu'
import { openStack, type MenuStack } from './stack'

const HOST_ID = 'sc-menu-picker'

let picker: MenuStack | null = null

export function closePlaylistPicker(): void {
  picker?.dispose()
  picker = null
}

export function openPlaylistPicker(
  at: { x: number; y: number },
  uris: string[],
  settings: () => PlaylistMenuSettings,
  api: PlaylistApi = spotify,
): void {
  closePlaylistPicker()
  const stack = openStack(HOST_ID, closePlaylistPicker)
  picker = stack
  showPlaylistMenu(stack, 0, { kind: 'point', x: at.x, y: at.y }, { uris, settings: settings(), api, picked: closePlaylistPicker })
}
