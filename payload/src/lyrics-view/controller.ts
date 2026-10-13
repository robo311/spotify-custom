// Our animated lyrics (theme.lyrics.animated), Spicy Lyrics style: while Spotify's lyrics view is open and the song
// has synced lyrics, a host inside the view (above Spotify's scroll area, below its header row) draws them word by
// word, and Spotify's own lines are hidden (parts/lyrics.ts, keyed on LYRICS_VIEW_SLOT.ownAttr). Without synced
// lyrics, or if anything fails, Spotify's view shows as usual.
import type { LyricsAnimation, PlaybackState, PlaybackTrack } from '../types'
import { LYRICS_VIEW_SLOT as SLOT } from '../parts'
import { spotify, type LyricLine, type TrackLyrics } from '../spotify'
import { createLyricsDom, type LineColours, type LyricsDom, type Typography } from './render'
import { buildTimeline } from './timing'

export interface LyricsViewController {
  /** Re-check after the theme's lyrics options changed. */
  refresh(): void
  dispose(): void
}

export interface LyricsSource {
  onPlayback(fn: (s: PlaybackState | null) => void): () => void
  loadLyrics(trackUri: string, signal?: AbortSignal): Promise<TrackLyrics | null>
  playbackTime(): { positionMs: number; durationMs: number | null } | null
  seekTo(ms: number): void
}

/** A song whose first line comes later than this opens with an instrumental break (dots). */
const INTRO_MS = 3000
/** How often typography and colours are re-read from Spotify's lines while showing (theme edits, per-song colours). */
const LOOK_MS = 1000

/** Pure: lyric lines with an opening break when the singing starts late. */
export function withIntro(lines: readonly LyricLine[]): LyricLine[] {
  const first = lines.at(0)
  return first && first.startMs > INTRO_MS ? [{ startMs: 0, endMs: null, text: '', syllables: null }, ...lines] : [...lines]
}

function readLook(): { type: Typography; colours: LineColours } | null {
  const line = document.querySelector(SLOT.line)
  const colorHost = document.querySelector(SLOT.colorHost)
  if (!line || !colorHost) return null
  const l = getComputedStyle(line)
  const c = getComputedStyle(colorHost)
  const v = (name: string) => c.getPropertyValue(name).trim()
  return {
    type: { font: l.fontFamily, size: l.fontSize, weight: l.fontWeight, align: l.textAlign === 'center' ? 'center' : 'start', zoom: l.zoom || '1' },
    colours: {
      sung: v('--lyrics-color-active') || '#fff',
      rest: v('--lyrics-color-inactive') || 'rgb(255 255 255 / 0.5)',
      past: v('--sc-lyrics-past') || v('--lyrics-color-passed') || '#fff',
    },
  }
}

export function startLyricsView(options: () => LyricsAnimation, source: LyricsSource = spotify): LyricsViewController {
  const html = document.documentElement
  let running = false
  let track: PlaybackTrack | null = null
  let lyrics: TrackLyrics | null = null
  let loading: AbortController | null = null
  let host: HTMLElement | null = null
  let dom: LyricsDom | null = null
  let frame = 0
  let lastLook = 0
  let stopPlayback: (() => void) | null = null
  let warned = false
  /** The last load failed (network, or no session yet): retried when the lyrics view next opens. */
  let failed = false
  let checkFrame = 0
  /** The lyrics the view is drawing. */
  let rendered: TrackLyrics | null = null

  const isOpen = () => html.matches(SLOT.open)

  const stopLoop = () => {
    if (frame) cancelAnimationFrame(frame)
    frame = 0
  }

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick)
    if (!dom) return
    if (now - lastLook > LOOK_MS) {
      lastLook = now
      const look = readLook()
      if (look) dom.setLook(look.type, look.colours)
    }
    const t = source.playbackTime()
    if (t) dom.update(t.positionMs, t.durationMs)
  }

  const hide = () => {
    stopLoop()
    dom?.dispose()
    dom = null
    host?.remove()
    host = null
    rendered = null
    if (html.hasAttribute(SLOT.ownAttr)) html.removeAttribute(SLOT.ownAttr)
  }

  /** current: the lyrics to draw, or null to keep the view (and its cover panel) while the next song's load. */
  const show = (viewHost: Element, current: TrackLyrics | null) => {
    if (!host) {
      host = document.createElement('div')
      host.id = SLOT.hostId
      dom = createLyricsDom(host.attachShadow({ mode: 'open' }), ms => source.seekTo(ms))
      dom.setOptions(options())
      dom.setTrack(track)
    }
    if (current && current !== rendered) {
      rendered = current
      dom?.setLyrics(buildTimeline(withIntro(current.lines), source.playbackTime()?.durationMs ?? null), current.provider)
    }
    if (host.parentElement !== viewHost) viewHost.append(host)
    if (!html.hasAttribute(SLOT.ownAttr)) html.setAttribute(SLOT.ownAttr, '')
    if (!frame) {
      lastLook = 0
      frame = requestAnimationFrame(tick)
    }
  }

  /** Shows or hides the view to match: lyrics view open, synced lyrics loaded for the current track. */
  const check = () => {
    if (running && failed && !loading && isOpen()) {
      load(track)
      return
    }
    const viewHost = document.querySelector(SLOT.viewHost)
    // While the next song's lyrics load, a view that is showing stays (its lines faded out) instead of flashing
    // Spotify's lines and dropping the cover panel; it goes only once they turn out not to be synced.
    const nextOnTheWay = host !== null && loading !== null
    if (running && isOpen() && viewHost && (lyrics?.synced || nextOnTheWay)) show(viewHost, lyrics?.synced ? lyrics : null)
    else hide()
  }
  const scheduleCheck = () => {
    if (!checkFrame) {
      checkFrame = requestAnimationFrame(() => {
        checkFrame = 0
        check()
      })
    }
  }

  const load = (next: PlaybackTrack | null) => {
    loading?.abort()
    loading = null
    lyrics = null
    failed = false
    if (!next) {
      hide()
      return
    }
    dom?.clearLyrics()
    const controller = new AbortController()
    loading = controller
    source
      .loadLyrics(next.uri, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return
        loading = null
        lyrics = result
        check()
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        loading = null
        failed = true
        hide() // Spotify's own view until the next open retries
        if (!warned) {
          warned = true
          console.warn("[spotify-custom] lyrics couldn't be loaded; showing Spotify's own", error)
        }
      })
  }

  // The lyrics view opening and closing shows as attributes on <html>; Spotify rebuilds the view (and so drops our
  // host) as it opens, which shows as children of the layout grid changing.
  const htmlObserver = new MutationObserver(records => {
    if (records.some(r => r.attributeName !== SLOT.ownAttr)) scheduleCheck()
  })
  const gridObserver = new MutationObserver(scheduleCheck)

  const start = () => {
    running = true
    htmlObserver.observe(html, { attributes: true })
    const grid = document.querySelector(SLOT.grid)
    if (grid) gridObserver.observe(grid, { childList: true })
    stopPlayback = source.onPlayback(state => {
      const next = state?.track ?? null
      if (next?.uri !== track?.uri) {
        track = next
        load(next)
      } else track = next
      dom?.setTrack(track)
    })
  }

  const stop = () => {
    running = false
    htmlObserver.disconnect()
    gridObserver.disconnect()
    stopPlayback?.()
    stopPlayback = null
    loading?.abort()
    loading = null
    if (checkFrame) cancelAnimationFrame(checkFrame)
    checkFrame = 0
    lyrics = null
    track = null
    hide()
  }

  const refresh = () => {
    const on = options().on
    if (on && !running) start()
    else if (!on && running) stop()
    else if (running) dom?.setOptions(options())
  }
  refresh()

  return { refresh, dispose: stop }
}
