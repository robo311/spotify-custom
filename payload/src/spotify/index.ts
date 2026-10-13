// Spotify internals adapter: the only module that knows how Spotify's private GraphQL and router work.
// Everything here is best-effort; callers must handle rejections (Spotify can change internals in any update).
import { loadCanvas } from './canvas'
import { installFetchHook } from './capture'
import { query } from './graphql'
import { loadLyrics } from './lyrics'
import { onPlayback, onPlaying, playbackTime, seekTo } from './player'
import { currentPath, navigate, onNavigate, uriToPath } from './router'
import { trackUriOfRow } from './tracklist'

export { SpotifyQueryError, type SpotifyQueryFailure } from './graphql'

/** Must run as early as possible (document start): hooks fetch to learn auth headers + GraphQL hashes. Idempotent across hot reloads. */
export function installSpotifyHooks(): void {
  installFetchHook()
}

export type { CanvasMedia } from './canvas'
export type { LyricLine, LyricSyllable, TrackLyrics } from './lyrics'
export const spotify = { query, navigate, onNavigate, currentPath, uriToPath, onPlayback, onPlaying, trackUriOfRow, loadCanvas, loadLyrics, playbackTime, seekTo }
