// The column itself, laid out like Spotify's own song detail: the cover full-bleed at the top, darkened towards its
// edges, with the album over its top and the title and artists over its bottom; then what's up next. Links open
// pages through Spotify's router; "Open queue" opens Spotify's queue panel, which the column then makes room for.
// (No Canvas video: Spotify plays it through its own internal player, and this client can't decode the raw file.)
import { Music } from 'lucide-static'
import type { PlaybackState, PlaybackTrack } from '../types'
import { COLUMN_CSS } from './styles'

const UP_NEXT_COUNT = 6

interface ColumnProps {
  state: PlaybackState & { track: PlaybackTrack }
  onOpen: (uri: string) => void
  onQueue: () => void
}

const artistNames = (track: PlaybackTrack) => track.artists.map(a => a.name).join(', ')

function Hero({ track, onOpen }: { track: PlaybackTrack; onOpen: (uri: string) => void }) {
  return (
    <div class="hero">
      {track.image ? (
        <img class="hero-img" src={track.image} alt="" />
      ) : (
        <div class="hero-img empty" aria-hidden="true" dangerouslySetInnerHTML={{ __html: Music }} />
      )}
      <div class="hero-shade" aria-hidden="true" />
      {track.album.uri && (
        <div class="hero-top">
          <button type="button" class="link context" onClick={() => onOpen(track.album.uri)}>
            {track.album.name}
          </button>
        </div>
      )}
      <div class="hero-info">
        <h2 class="title">
          <button type="button" class="link" onClick={() => onOpen(track.uri)}>
            {track.name}
          </button>
        </h2>
        <div class="artists">
          {track.artists.map((artist, i) => (
            <span key={artist.uri || artist.name}>
              {i > 0 && ', '}
              {artist.uri ? (
                <button type="button" class="link" onClick={() => onOpen(artist.uri)}>
                  {artist.name}
                </button>
              ) : (
                artist.name
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Column({ state, onOpen, onQueue }: ColumnProps) {
  const next = state.next.slice(0, UP_NEXT_COUNT)
  return (
    <aside class="npv" aria-label="Now playing">
      <style>{COLUMN_CSS}</style>
      <Hero key={state.track.uri} track={state.track} onOpen={onOpen} />
      {next.length > 0 && (
        <section class="next" aria-label="Up next">
          <div class="next-head">
            <h3 class="eyebrow">Up next</h3>
            <button type="button" class="ghost" onClick={onQueue}>
              Open queue
            </button>
          </div>
          <ol class="rows">
            {next.map((item, i) => (
              <li key={`${item.uri}-${i}`} class="row" style={{ '--i': i }}>
                {item.thumb ? <img class="thumb" src={item.thumb} alt="" /> : <span class="thumb" />}
                <span class="row-text">
                  <span class="row-name">{item.name}</span>
                  <span class="row-sub">{artistNames(item)}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </aside>
  )
}
