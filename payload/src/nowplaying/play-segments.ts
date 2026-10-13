// Plays a Canvas (segments loaded by spotify.loadCanvas) in a <video> through Media Source Extensions: the only way this
// client decodes Spotify's Canvas files. Returns a disposer that detaches and frees the stream.
import type { CanvasMedia } from '../spotify'

export function playSegments(video: HTMLVideoElement, media: CanvasMedia): () => void {
  const source = new MediaSource()
  const url = URL.createObjectURL(source)
  let disposed = false

  source.addEventListener(
    'sourceopen',
    () => {
      const buffer = source.addSourceBuffer(media.mime)
      const queue = [...media.segments]
      const next = () => {
        if (disposed || source.readyState !== 'open') return
        const segment = queue.shift()
        if (segment) buffer.appendBuffer(segment)
        else source.endOfStream()
      }
      buffer.addEventListener('updateend', next)
      next()
    },
    { once: true },
  )
  video.src = url
  return () => {
    disposed = true
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}
