// Lyrics settings the lyrics CSS tests start from: Spotify's own look and layout.
import { defaultLyrics, defaultLyricsAnimation, defaultNowPlaying } from '../../theme/model'
import type { LayoutConfig, LyricsStyle } from '../../types'

export const SPOTIFY_LYRICS: LyricsStyle = { ...defaultLyrics(), animated: { ...defaultLyricsAnimation(), on: false } }
export const SPOTIFY_LYRICS_LAYOUT: LayoutConfig = {
  hidden: [],
  compactPlayer: false,
  librarySide: 'left',
  searchPosition: 'centre',
  nowPlaying: defaultNowPlaying(),
  lyricsKeepLibrary: false,
  lyricsImmersive: false,
  lyricsNowPlaying: false,
  lyricsNowPlayingVideo: true,
  lyricsNowPlayingQueue: true,
  lyricsLibraryFloating: false,
  lyricsPanelFloating: false,
}
