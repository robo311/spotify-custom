// Where the shortcut buttons go: song rows in the main view's track lists, rows in the right panel's Queue and
// Recently played tabs, and the playing song in the player bar. Each surface watches one container, batched per frame,
// and keeps one button group per row. Rows are reused for other songs while scrolling, so every pass re-reads each
// row's song and the group follows it.
import type { PlaybackState } from '../types'
import { createGroup, type Group, type GroupOptions } from './group'
import { songOfElement, type Song } from './song'
import { HISTORY_PANEL, MAIN_VIEW, MORE_BUTTON, PANEL, PANEL_ROW, PLAYER_TITLE, PLAYER_WIDGET, ROW_ACTIONS_CELL, TRACK_ROW } from './selectors'

/** Spotify may unmount a container (the panel when closed); a slow check re-attaches the observer. */
const REATTACH_MS = 1000
/** A reused row gets a new index (track lists) or a new title id (the panel). */
const RECYCLE_ATTRIBUTES = ['aria-rowindex', 'id']

type GroupSettings = Omit<GroupOptions, 'always' | 'tabbable'>

/** Watches the container matched by `selector`: calls `pass` once per frame after changes, and when it (re)appears. */
function watch(selector: string, pass: (container: Element) => void): () => void {
  let container: Element | null = null
  let frame = 0
  const schedule = () => {
    if (frame === 0) {
      frame = requestAnimationFrame(() => {
        frame = 0
        if (container?.isConnected) pass(container)
      })
    }
  }
  const observer = new MutationObserver(schedule)
  const attach = () => {
    const found = document.querySelector(selector)
    if (found === container) return
    observer.disconnect()
    container = found
    if (!found) return
    observer.observe(found, { childList: true, subtree: true, attributes: true, attributeFilter: RECYCLE_ATTRIBUTES })
    schedule()
  }
  attach()
  const timer = window.setInterval(attach, REATTACH_MS)
  return () => {
    window.clearInterval(timer)
    observer.disconnect()
    if (frame !== 0) cancelAnimationFrame(frame)
  }
}

interface RowSurface {
  container: string
  rows: string
  /** Puts the host in the row, before Spotify's own buttons. */
  place(row: Element, host: HTMLElement): void
  queued(row: Element, song: Song): boolean
  /** Re-place the host when Spotify re-rendered the spot (false while it is still where place() put it). */
  misplaced(row: Element, host: HTMLElement): boolean
}

function startRows(surface: RowSurface, settings: GroupSettings): () => void {
  const groups = new Map<Element, Group>()
  const pass = (container: Element) => {
    for (const [row, group] of groups) {
      if (!row.isConnected) {
        group.dispose()
        groups.delete(row)
      }
    }
    for (const row of container.querySelectorAll(surface.rows)) {
      const song = songOfElement(row)
      let group = groups.get(row)
      if (!group) {
        if (!song) continue
        group = createGroup({ ...settings, always: false, tabbable: false })
        groups.set(row, group)
      }
      if (!group.host.isConnected || surface.misplaced(row, group.host)) surface.place(row, group.host)
      group.show(song, song !== null && surface.queued(row, song))
    }
  }
  const stop = watch(surface.container, pass)
  return () => {
    stop()
    for (const group of groups.values()) group.dispose()
    groups.clear()
  }
}

const lastCell = (row: Element) => row.querySelector(ROW_ACTIONS_CELL)

export function startTrackRows(settings: GroupSettings): () => void {
  return startRows(
    {
      container: MAIN_VIEW,
      rows: TRACK_ROW,
      place(row, host) {
        const cell = lastCell(row)
        if (cell) cell.insertBefore(host, cell.firstChild)
      },
      misplaced: (row, host) => host.parentElement !== lastCell(row),
      queued: () => false,
    },
    settings,
  )
}

export function startQueueRows(settings: GroupSettings): () => void {
  return startRows(
    {
      container: PANEL,
      rows: PANEL_ROW,
      place(row, host) {
        const more = row.querySelector(MORE_BUTTON)
        if (more?.parentElement) more.parentElement.insertBefore(host, more)
        else row.append(host)
      },
      misplaced: (row, host) => !row.contains(host),
      // Recently played rows are history; queue rows carry the uid remove-from-queue needs.
      queued: (row, song) => row.closest(HISTORY_PANEL) === null && song.uid !== null,
    },
    settings,
  )
}

function playingSong(state: PlaybackState | null): Song | null {
  const track = state?.track
  if (!track) return null
  return { uri: track.uri, uid: null, albumUri: track.album.uri || null, artistUri: track.artists[0]?.uri || null }
}

/** After the block holding the song's title (and before Spotify's own add button). */
function placeInPlayerBar(widget: Element, host: HTMLElement) {
  const title = widget.querySelector(PLAYER_TITLE)
  let block: Element | null = title
  while (block && block.parentElement !== widget) block = block.parentElement
  if (block) block.after(host)
  else widget.append(host)
}

export function startPlayerBar(settings: GroupSettings): () => void {
  const group = createGroup({ ...settings, always: true, tabbable: true })
  const stopWatch = watch(PLAYER_WIDGET, widget => {
    if (group.host.parentElement !== widget) placeInPlayerBar(widget, group.host)
  })
  const stopPlayback = settings.source.onPlayback(state => group.show(playingSong(state), false))
  return () => {
    stopPlayback()
    stopWatch()
    group.dispose()
  }
}
