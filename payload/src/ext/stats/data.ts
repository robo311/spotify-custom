// Stats data: the `userTopContent` query (the one behind Spotify's profile page) and its mapping into view models.
// Verified on Spotify 1.3.3: timeRange accepts SHORT_TERM, MID_TERM and LONG_TERM; sortBy AFFINITY.
import type { ExtensionContext } from '../../types'

export const TOP_CONTENT_OPERATION = 'userTopContent'
/** Enough for the longest list the shelf can show (theme.homeStyle.statsCount); shorter lists are sliced. */
export const TOP_LIMIT = 10

export const TIME_RANGES = [
  { id: 'SHORT_TERM', label: '4 weeks', phrase: 'last 4 weeks' },
  { id: 'MID_TERM', label: '6 months', phrase: 'last 6 months' },
  { id: 'LONG_TERM', label: '12 months', phrase: 'last 12 months' },
] as const

export type TimeRange = (typeof TIME_RANGES)[number]['id']
export type TopKind = 'artists' | 'tracks'

export interface ImageSource {
  url: string
  width: number
}

export interface TopItem {
  uri: string
  path: string | null // in-app path, e.g. /artist/<id>
  name: string
  subtitle: string
  images: ImageSource[]
}

export interface TopContent {
  artists: TopItem[]
  tracks: TopItem[]
}

export class StatsShapeError extends Error {
  constructor(where: string) {
    super(`Unexpected userTopContent response at ${where}`)
    this.name = 'StatsShapeError'
  }
}

export function isTimeRange(value: unknown): value is TimeRange {
  return TIME_RANGES.some(range => range.id === value)
}

export function topContentVariables(range: TimeRange, limit = TOP_LIMIT): object {
  const input = { offset: 0, limit, sortBy: 'AFFINITY', timeRange: range }
  return { includeTopArtists: true, topArtistsInput: input, includeTopTracks: true, topTracksInput: input }
}

// ---- narrowing helpers (the response is untrusted: Spotify can change it any day) ----

type Json = Record<string, unknown>
const isRecord = (value: unknown): value is Json => typeof value === 'object' && value !== null
const field = (value: unknown, key: string): unknown => (isRecord(value) ? value[key] : undefined)
const text = (value: unknown): string => (typeof value === 'string' ? value : '')
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

/** spotify:artist:ID → /artist/ID */
export function uriToPath(uri: string): string | null {
  const [scheme, type, id] = uri.split(':')
  return scheme === 'spotify' && type && id ? `/${type}/${id}` : null
}

function images(sources: unknown): ImageSource[] {
  return list(sources)
    .map(source => ({ url: text(field(source, 'url')), width: Number(field(source, 'width')) || 0 }))
    .filter(source => source.url !== '')
    .sort((a, b) => a.width - b.width)
}

function toArtist(data: unknown): TopItem | null {
  if (field(data, '__typename') !== 'Artist') return null
  const uri = text(field(data, 'uri'))
  return {
    uri,
    path: uriToPath(uri),
    name: text(field(field(data, 'profile'), 'name')),
    subtitle: 'Artist',
    images: images(field(field(field(data, 'visuals'), 'avatarImage'), 'sources')),
  }
}

function toTrack(data: unknown): TopItem | null {
  if (field(data, '__typename') !== 'Track') return null
  const uri = text(field(data, 'uri'))
  const artistNames = list(field(field(data, 'artists'), 'items'))
    .map(artist => text(field(field(artist, 'profile'), 'name')))
    .filter(Boolean)
  return {
    uri,
    path: uriToPath(uri),
    name: text(field(data, 'name')),
    subtitle: artistNames.join(', '),
    images: images(field(field(field(data, 'albumOfTrack'), 'coverArt'), 'sources')),
  }
}

function page(profile: unknown, key: string, toItem: (data: unknown) => TopItem | null): TopItem[] {
  const pageValue = field(profile, key)
  if (!isRecord(pageValue)) throw new StatsShapeError(`me.profile.${key}`)
  return list(pageValue.items)
    .map(item => toItem(field(item, 'data')))
    .filter((item): item is TopItem => item !== null && item.uri !== '' && item.name !== '')
}

/** Pure: response `data` → view model. Throws StatsShapeError when the structure itself is gone. */
export function mapTopContent(data: unknown): TopContent {
  const profile = field(field(data, 'me'), 'profile')
  if (!isRecord(profile)) throw new StatsShapeError('me.profile')
  return { artists: page(profile, 'topArtists', toArtist), tracks: page(profile, 'topTracks', toTrack) }
}

/** Smallest image at least `minWidth` wide (falls back to the largest available). */
export function pickImage(sources: ImageSource[], minWidth: number): string | null {
  return (sources.find(source => source.width >= minWidth) ?? sources.at(-1))?.url ?? null
}

const CACHE_TTL_MS = 30 * 60_000

export interface TopContentSource {
  load(range: TimeRange): Promise<TopContent>
}

/** Per-range cache so switching tabs and ranges is instant; failed loads aren't cached. */
export function createTopContentSource(query: ExtensionContext['spotify']['query'], now = () => Date.now()): TopContentSource {
  const cache = new Map<TimeRange, { at: number; content: Promise<TopContent> }>()
  return {
    load(range) {
      const hit = cache.get(range)
      if (hit && now() - hit.at < CACHE_TTL_MS) return hit.content
      const content = query(TOP_CONTENT_OPERATION, topContentVariables(range)).then(mapTopContent)
      cache.set(range, { at: now(), content })
      content.catch(() => cache.delete(range))
      return content
    },
  }
}
