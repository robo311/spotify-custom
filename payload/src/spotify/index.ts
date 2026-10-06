// Spotify internals adapter: the only module that knows how Spotify's private GraphQL and router work.
// Everything here is best-effort; callers must handle rejections (Spotify can change internals in any update).
import { installFetchHook } from './capture'
import { query } from './graphql'
import { onPlayback, onPlaying } from './player'
import { currentPath, navigate, onNavigate, uriToPath } from './router'
import { trackUriOfRow } from './tracklist'

export { SpotifyQueryError, type SpotifyQueryFailure } from './graphql'

/** Must run as early as possible (document start): hooks fetch to learn auth headers + GraphQL hashes. Idempotent across hot reloads. */
export function installSpotifyHooks(): void {
  installFetchHook()
}

export const spotify = { query, navigate, onNavigate, currentPath, uriToPath, onPlayback, onPlaying, trackUriOfRow }
