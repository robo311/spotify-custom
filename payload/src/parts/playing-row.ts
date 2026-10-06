// Marks the playing song's row in track lists (data-sc-playing on the row wrapper) for pageStyle.playingRow.
// Spotify marks it only when the song plays from that very list; this matches by track, so the row lights up
// whether the song plays from the album, a playlist, a radio station or the queue.
import { spotify } from '../spotify'
import { PLAYING_ROW_ATTR } from './track-list-look'
import { TRACK_LIST } from './selectors'

const ROWS = `${TRACK_LIST} [role="row"]`

/** Marks the row; its value is "paused" while the song is paused (so a spinning cover can stop). */
export function markPlayingRows(playingUri: string | null, uriOf: (row: Element) => string | null, paused = false): void {
  const value = paused ? 'paused' : ''
  for (const row of document.querySelectorAll(ROWS)) {
    const playing = playingUri !== null && uriOf(row) === playingUri
    if (!playing) row.removeAttribute(PLAYING_ROW_ATTR)
    else if (row.getAttribute(PLAYING_ROW_ATTR) !== value) row.setAttribute(PLAYING_ROW_ATTR, value)
  }
}

export function startPlayingRow(): () => void {
  let playing: string | null = null
  let paused = false
  const update = () => markPlayingRows(playing, spotify.trackUriOfRow, paused)
  const stopPlayback = spotify.onPlayback(state => {
    playing = state?.track?.uri ?? null
    update()
  })
  const stopPlaying = spotify.onPlaying(isPlaying => {
    paused = !isPlaying
    update()
  })

  // The list is virtual: rows are created and reused while scrolling, so re-mark after each batch of changes.
  let frame = 0
  const observer = new MutationObserver(() => {
    if (frame === 0) {
      frame = requestAnimationFrame(() => {
        frame = 0
        update()
      })
    }
  })
  const view = document.querySelector('#main-view')
  if (view) observer.observe(view, { childList: true, subtree: true })

  return () => {
    stopPlayback()
    stopPlaying()
    observer.disconnect()
    if (frame !== 0) cancelAnimationFrame(frame)
    for (const row of document.querySelectorAll(`[${PLAYING_ROW_ATTR}]`)) row.removeAttribute(PLAYING_ROW_ATTR)
  }
}
