// A song's radio. Spotify's "Go to song radio" asks spclient for the "inspired by" mix seeded with the song and opens
// that playlist (seen on Spotify 1.3.4); we make the same request with the session headers the app already uses.
import { waitForHeaders } from './capture'
import { isRecord } from './fiber'
import { hooksState } from './state'

const HEADER_WAIT_MS = 20_000
const RADIO_URL = (trackUri: string) =>
  `https://spclient.wg.spotify.com/inspiredby-mix/v2/seed_to_playlist/${encodeURIComponent(trackUri)}?response-format=json`

const doFetch = (url: string, init?: RequestInit) => (hooksState().originalFetch ?? window.fetch.bind(window))(url, init)

/** Pure: the radio playlist's URI from the response, or null. */
export function radioUriOf(body: unknown): string | null {
  const items = isRecord(body) ? body.mediaItems : null
  const first: unknown = Array.isArray(items) ? items[0] : null
  const uri = isRecord(first) ? first.uri : null
  return typeof uri === 'string' && uri.startsWith('spotify:') ? uri : null
}

/** The URI of the song's radio playlist (null if Spotify has none). Rejects on network or session failures. */
export async function songRadio(trackUri: string): Promise<string | null> {
  const headers = await waitForHeaders(HEADER_WAIT_MS)
  const forwarded: Record<string, string> = {}
  for (const name of ['authorization', 'app-platform', 'spotify-app-version'] as const) {
    const value = headers[name]
    if (value) forwarded[name] = value
  }
  const response = await doFetch(RADIO_URL(trackUri), { headers: forwarded })
  if (!response.ok) throw new Error(`Song radio: ${response.status}`)
  return radioUriOf(await response.json())
}
