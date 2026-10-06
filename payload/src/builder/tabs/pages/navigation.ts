// Shortcuts from the Pages tab to a page where a change shows: the playing song's album or artist, and Spotify's own
// column chooser.
import { spotify } from '../../../spotify'
import { COLUMN_MENU_TARGET, TRACK_LIST } from '../../selectors'

function openPlaying(uriOf: (track: { album: { uri: string }; artists: { uri: string }[] }) => string | undefined) {
  const stop = spotify.onPlayback(state => {
    const uri = state?.track ? uriOf(state.track) : undefined
    const path = uri ? spotify.uriToPath(uri) : null
    if (path) spotify.navigate(path)
  })
  stop()
}

export const openPlayingAlbum = () => openPlaying(track => track.album.uri)
export const openPlayingArtist = () => openPlaying(track => track.artists[0]?.uri)

/** Opens Spotify's own column chooser (its right-click menu on the column titles), at the top of the list. */
function openColumnMenu(): boolean {
  const target = document.querySelector(COLUMN_MENU_TARGET)
  const list = document.querySelector(TRACK_LIST)?.getBoundingClientRect()
  if (!target || !list) return false
  // The titles may be hidden (Hide column titles), so the menu is placed by the list, not by the title itself.
  target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, clientX: list.x + 24, clientY: Math.max(list.y, 80) + 8 }))
  return true
}

/** On a page without a track list, the playing album is opened first and the menu follows once its list is there. */
export function chooseColumns() {
  if (openColumnMenu()) return
  openPlayingAlbum()
  const view = document.querySelector('#main-view')
  if (!view) return
  const observer = new MutationObserver(() => {
    if (openColumnMenu()) stop()
  })
  const timer = setTimeout(() => stop(), 5000)
  const stop = () => {
    observer.disconnect()
    clearTimeout(timer)
  }
  observer.observe(view, { childList: true, subtree: true })
}
