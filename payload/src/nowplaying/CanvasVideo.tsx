// The track's Canvas over the hero cover, like Spotify's Now playing panel shows it. Loaded only once the column is on
// screen (it stays rendered, hidden, while the lyrics view is closed); it plays only while the song plays and the column
// is on screen. It fades in over the cover once its first frame is in (a paused song shows it still), and the cover
// stays if anything fails. Skipped with reduced motion.
import { useEffect, useRef, useState } from 'preact/hooks'
import type { CanvasMedia } from '../spotify'
import { playSegments } from './play-segments'

export type CanvasLoader = (fileId: string, minWidth: number, signal: AbortSignal) => Promise<CanvasMedia | null>

const canPlay = () => typeof MediaSource !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface CanvasVideoProps {
  fileId: string
  load: CanvasLoader
  /** The song is paused: so is the video. */
  paused: boolean
}

export function CanvasVideo({ fileId, load, paused }: CanvasVideoProps) {
  const ref = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)
  const [onScreen, setOnScreen] = useState(false)

  useEffect(() => {
    const video = ref.current
    if (!video || !canPlay()) return
    const abort = new AbortController()
    let detach: (() => void) | null = null
    let started = false
    const start = () => {
      started = true
      const width = Math.round(video.clientWidth * window.devicePixelRatio)
      load(fileId, width, abort.signal).then(
        media => {
          if (media && !abort.signal.aborted) detach = playSegments(video, media)
        },
        (e: unknown) => {
          if (!abort.signal.aborted) console.warn('[spotify-custom] Canvas unavailable, showing the cover', e)
        },
      )
    }
    const visibility = new IntersectionObserver(entries => {
      const visible = entries.some(e => e.isIntersecting)
      setOnScreen(visible)
      if (visible && !started) start()
    })
    visibility.observe(video)
    return () => {
      visibility.disconnect()
      abort.abort()
      detach?.()
    }
  }, [fileId, load])

  // Plays only while the song plays and the column is on screen (autoplay starts it once the stream is attached).
  const play = onScreen && !paused
  useEffect(() => {
    const video = ref.current
    if (!video) return
    if (!play) video.pause()
    else if (video.readyState > 0) void video.play().catch(() => undefined)
  }, [play])

  return <video ref={ref} class={`hero-video${ready ? ' ready' : ''}`} muted loop autoplay={play} playsInline aria-hidden="true" onLoadedData={() => setReady(true)} />
}
