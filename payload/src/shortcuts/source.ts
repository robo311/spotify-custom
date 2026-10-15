// What the shortcut buttons need from Spotify, as one interface so tests can pass fakes. The default is built from
// the spotify adapter and the menu module's playlist picker.
import type { MenuSettings, PlaybackState } from '../types'
import { openPlaylistPicker } from '../menu'
import { spotify } from '../spotify'

export interface ShortcutSource {
  addToQueue(uris: string[]): Promise<void>
  removeFromQueue(items: { uri: string; uid: string }[]): Promise<void>
  isLiked(uris: string[]): Promise<boolean[]>
  setLiked(uris: string[], liked: boolean): Promise<void>
  copyLink(uri: string): Promise<void>
  navigate(path: string): void
  uriToPath(uri: string): string | null
  onPlayback(fn: (state: PlaybackState | null) => void): () => void
  /** The song's radio playlist URI (what Spotify's "Go to song radio" opens). Absent until the adapter has it. */
  songRadio?: (trackUri: string) => Promise<string | null>
  openPlaylistPicker(at: { x: number; y: number }, uris: string[]): void
}

/** The adapter gains songRadio separately (it needs Spotify's session headers, which live in src/spotify). */
type Adapter = typeof spotify & { songRadio?: (trackUri: string) => Promise<string | null> }

export function spotifySource(getSettings: () => MenuSettings): ShortcutSource {
  const adapter: Adapter = spotify
  return {
    addToQueue: adapter.addToQueue,
    removeFromQueue: adapter.removeFromQueue,
    isLiked: adapter.isLiked,
    setLiked: adapter.setLiked,
    copyLink: adapter.copyLink,
    navigate: adapter.navigate,
    uriToPath: adapter.uriToPath,
    onPlayback: adapter.onPlayback,
    songRadio: adapter.songRadio,
    openPlaylistPicker: (at, uris) => openPlaylistPicker(at, uris, () => getSettings().playlists),
  }
}
