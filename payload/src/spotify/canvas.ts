// Canvas videos (the looping clips Spotify shows in its Now playing panel). The player state names a track's Canvas
// by file id; Spotify's manifest service (the user's own session) lists its encodings as segment files on a CDN, and
// Spotify's panel player streams one into Media Source Extensions. This loads the same files, so a <video> of ours
// can play the Canvas where Spotify's panel isn't mounted (the lyrics view). This client plays VP9 webm, not H.264.
import { waitForHeaders } from './capture'
import { hooksState } from './state'

const MANIFEST_URL = (fileId: string) => `https://spclient.wg.spotify.com/manifests/v9/json/sources/${fileId}/options/supports_drm`
const FILE_ID = /^[0-9a-f]{32}$/
const HEADER_WAIT_MS = 20_000

/** The encoding to load: its manifest id, file type (for the URL templates) and the MSE type it plays as. */
export interface CanvasProfile {
  id: number
  fileType: string
  mime: string
}

/** A Canvas ready for a SourceBuffer of `mime`: the init segment first, then the media segments in order. */
export interface CanvasMedia {
  mime: string
  segments: ArrayBuffer[]
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const text = (v: unknown): string => (typeof v === 'string' ? v : '')
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

/** Pure: a track's looping Canvas video id from its player-state metadata (null for still images or none). */
export function canvasIdOf(metadata: unknown): string | null {
  if (!isRecord(metadata) || !text(metadata['canvas.type']).startsWith('VIDEO')) return null
  const id = text(metadata['canvas.fileId'])
  return FILE_ID.test(id) ? id : null
}

const firstContent = (manifest: unknown) => (isRecord(manifest) ? list(manifest.contents)[0] : undefined)

/** Pure: the smallest encoding this client plays that is at least `minWidth` wide (else the widest it plays). */
export function pickProfile(manifest: unknown, minWidth: number, playable: (mime: string) => boolean): CanvasProfile | null {
  const content = firstContent(manifest)
  const profiles = list(isRecord(content) ? content.profiles : undefined)
    .filter(isRecord)
    .map(p => ({ id: num(p.id), fileType: text(p.file_type), mime: `${text(p.mime_type)}; codecs="${text(p.video_codec)}"`, width: num(p.video_width) }))
    .filter(p => p.fileType !== '' && playable(p.mime))
    .sort((a, b) => a.width - b.width)
  const chosen = profiles.find(p => p.width >= minWidth) ?? profiles.at(-1)
  return chosen ? { id: chosen.id, fileType: chosen.fileType, mime: chosen.mime } : null
}

/** Pure: the init segment's URL, then each media segment's (one per segment length, until the video ends). */
export function canvasUrls(manifest: unknown, profile: CanvasProfile): string[] {
  if (!isRecord(manifest)) return []
  const content = firstContent(manifest)
  const base = text(list(manifest.base_urls)[0])
  const length = num(isRecord(content) ? content.segment_length : undefined)
  const end = num(isRecord(content) ? content.end_time_millis : undefined) / 1000
  if (!base.startsWith('https://') || length <= 0) return []
  const fill = (template: string, timestamp?: number) =>
    base +
    template
      .replaceAll('{{profile_id}}', String(profile.id))
      .replaceAll('{{file_type}}', profile.fileType)
      .replaceAll('{{segment_timestamp}}', String(timestamp ?? ''))
  const urls = [fill(text(manifest.initialization_template))]
  for (let t = 0; t < end; t += length) urls.push(fill(text(manifest.segment_template), t))
  return urls
}

const doFetch = (url: string, init?: RequestInit) => (hooksState().originalFetch ?? window.fetch.bind(window))(url, init)

async function fetchManifest(fileId: string): Promise<unknown> {
  const headers = await waitForHeaders(HEADER_WAIT_MS)
  const response = await doFetch(MANIFEST_URL(fileId), { headers: { authorization: headers.authorization } })
  if (!response.ok) throw new Error(`Canvas manifest: ${response.status}`)
  return response.json()
}

/**
 * Loads a Canvas for a video about `minWidth` pixels wide, or resolves null when this client can't play any of its
 * encodings. Rejects on network or session failures (callers keep the cover then).
 */
export async function loadCanvas(fileId: string, minWidth: number, signal?: AbortSignal): Promise<CanvasMedia | null> {
  if (!FILE_ID.test(fileId)) return null
  const manifest = await fetchManifest(fileId)
  const profile = pickProfile(manifest, minWidth, mime => MediaSource.isTypeSupported(mime))
  if (!profile) return null
  const urls = canvasUrls(manifest, profile)
  if (urls.length < 2) return null
  const segments = await Promise.all(
    urls.map(async url => {
      const response = await doFetch(url, { signal })
      if (!response.ok) throw new Error(`Canvas segment: ${response.status}`)
      return response.arrayBuffer()
    }),
  )
  return { mime: profile.mime, segments }
}
