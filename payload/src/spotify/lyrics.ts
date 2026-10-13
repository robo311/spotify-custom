// A track's lyrics with their timing, from Spotify's color-lyrics service (the user's own session; the same request
// Spotify's lyrics view makes). Most tracks are line-synced; some carry syllable timing, whose shape isn't documented,
// so it is only kept when it adds up to the line's text exactly.
import { waitForHeaders } from './capture'
import { hooksState } from './state'

const LYRICS_URL = (trackId: string) => `https://spclient.wg.spotify.com/color-lyrics/v2/track/${trackId}?format=json&vocalRemoval=false&market=from_token`
const HEADER_WAIT_MS = 20_000
/** Lines Spotify uses for instrumental breaks. */
const INSTRUMENTAL = /^[\s♪♫]*$/

export interface LyricSyllable {
  startMs: number
  /** How many characters of the line's text it covers (in order). */
  chars: number
}

export interface LyricLine {
  startMs: number
  /** Spotify sends 0 when it doesn't know; null then. */
  endMs: number | null
  /** Empty for an instrumental break. */
  text: string
  syllables: LyricSyllable[] | null
}

export interface TrackLyrics {
  synced: boolean
  lines: LyricLine[]
  provider: string
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const text = (v: unknown): string => (typeof v === 'string' ? v : '')
/** Spotify sends times as strings of digits; numbers are accepted too. */
const ms = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : NaN
  return Number.isFinite(n) && n >= 0 ? n : null
}

function syllablesOf(raw: unknown, words: string): LyricSyllable[] | null {
  const syllables: LyricSyllable[] = []
  for (const s of list(raw)) {
    const startMs = isRecord(s) ? ms(s.startTimeMs) : null
    const chars = isRecord(s) ? ms(s.numChars) : null
    if (startMs === null || chars === null || chars === 0) return null
    syllables.push({ startMs, chars })
  }
  const covered = syllables.reduce((sum, s) => sum + s.chars, 0)
  return syllables.length > 0 && covered === Array.from(words).length ? syllables : null
}

/** Pure: a color-lyrics response → lyrics, or null when it holds none. */
export function parseLyrics(response: unknown): TrackLyrics | null {
  const lyrics = isRecord(response) ? response.lyrics : undefined
  if (!isRecord(lyrics)) return null
  const lines: LyricLine[] = []
  for (const raw of list(lyrics.lines)) {
    if (!isRecord(raw)) continue
    const startMs = ms(raw.startTimeMs)
    if (startMs === null) continue
    const words = text(raw.words)
    const lineText = INSTRUMENTAL.test(words) ? '' : words
    const end = ms(raw.endTimeMs)
    lines.push({ startMs, endMs: end !== null && end > 0 ? end : null, text: lineText, syllables: lineText ? syllablesOf(raw.syllables, lineText) : null })
  }
  if (lines.length === 0) return null
  const syncType = text(lyrics.syncType)
  return {
    synced: syncType === 'LINE_SYNCED' || syncType === 'SYLLABLE_SYNCED',
    lines,
    provider: text(lyrics.providerDisplayName) || text(lyrics.provider),
  }
}

/** Pure: the id of a track uri (only tracks have lyrics), or null. */
export function trackIdOf(uri: string): string | null {
  return /^spotify:track:([A-Za-z0-9]{22})$/.exec(uri)?.[1] ?? null
}

const doFetch = (url: string, init?: RequestInit) => (hooksState().originalFetch ?? window.fetch.bind(window))(url, init)

/** The track's lyrics; null when it has none. Rejects on network or session failures. */
export async function loadLyrics(trackUri: string, signal?: AbortSignal): Promise<TrackLyrics | null> {
  const id = trackIdOf(trackUri)
  if (!id) return null
  const headers = await waitForHeaders(HEADER_WAIT_MS)
  const forwarded: Record<string, string> = {}
  for (const name of ['authorization', 'app-platform', 'spotify-app-version'] as const) {
    const value = headers[name]
    if (value) forwarded[name] = value
  }
  const response = await doFetch(LYRICS_URL(id), { headers: forwarded, signal })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Lyrics: ${response.status}`)
  return parseLyrics(await response.json())
}
