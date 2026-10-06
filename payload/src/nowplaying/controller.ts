// Our own "Now playing" column beside the lyrics (layout.lyricsNowPlaying). Spotify unmounts its Now playing panel
// while the lyrics view is open, so we draw a lite one: a host element in the layout grid, placed and shown only
// inside the lyrics view by parts/lyrics.ts. It is kept rendered from Spotify's player state while the option is on,
// so Spotify's open transition already captures it in place rather than the column landing after it.
import { h, render } from 'preact'
import type { PlaybackState, PlaybackTrack } from '../types'
import { LYRICS_COLUMN_SLOT as SLOT } from '../parts'
import { spotify } from '../spotify'
import { Column } from './Column'
import { APP_ROOT, QUEUE_BUTTON } from './selectors'

export interface LyricsColumnController {
  /** Re-check after the layout changed (option turned on or off). */
  refresh(): void
  dispose(): void
}

export interface PlaybackSource {
  onPlayback(fn: (s: PlaybackState | null) => void): () => void
}

interface Mounted {
  host: HTMLElement
  body: HTMLElement
  observer: MutationObserver
  stopPlayback: (() => void) | null
}

const hasTrack = (s: PlaybackState | null): s is PlaybackState & { track: PlaybackTrack } => s?.track != null

function open(uri: string) {
  const path = spotify.uriToPath(uri)
  if (path) spotify.navigate(path)
}

export function startLyricsColumn(enabled: () => boolean, source: PlaybackSource = spotify): LyricsColumnController {
  let mounted: Mounted | null = null
  const html = document.documentElement

  const show = (m: Mounted, state: PlaybackState | null) => {
    if (!hasTrack(state)) {
      render(null, m.body)
      html.removeAttribute(SLOT.readyAttr)
      return
    }
    render(
      h(Column, { state, onOpen: open, onQueue: () => document.querySelector<HTMLElement>(QUEUE_BUTTON)?.click() }),
      m.body,
    )
    html.setAttribute(SLOT.readyAttr, '')
  }

  /** Attaches the host to the layout grid (again, if Spotify replaced it). */
  const attach = (m: Mounted) => {
    const grid = document.querySelector(SLOT.grid)
    if (grid && m.host.parentElement !== grid) grid.append(m.host)
  }

  const mount = () => {
    const host = document.createElement('div')
    host.id = SLOT.hostId
    const body = document.createElement('div')
    body.style.display = 'contents'
    host.attachShadow({ mode: 'open' }).append(body)

    let frame = 0
    const observer = new MutationObserver(() => {
      if (frame === 0) {
        frame = requestAnimationFrame(() => {
          frame = 0
          if (mounted) attach(mounted)
        })
      }
    })
    // The app root's children change only if Spotify rebuilds the layout grid.
    observer.observe(document.querySelector(APP_ROOT) ?? document.body, { childList: true })
    const m: Mounted = { host, body, observer, stopPlayback: null }
    mounted = m
    attach(m)
    m.stopPlayback = source.onPlayback(state => show(m, state))
  }

  const unmount = () => {
    const m = mounted
    if (!m) return
    mounted = null
    m.observer.disconnect()
    m.stopPlayback?.()
    render(null, m.body)
    m.host.remove()
    html.removeAttribute(SLOT.readyAttr)
  }

  const refresh = () => {
    if (enabled() && !mounted) mount()
    else if (!enabled() && mounted) unmount()
  }
  refresh()

  return { refresh, dispose: unmount }
}
