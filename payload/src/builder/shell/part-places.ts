// Which tab each curated part is styled in; its section there has the part's id. Pick mode links to it.
import type { TabId } from '../context'

export const PART_PLACES: Readonly<Partial<Record<string, TabId>>> = {
  sidebar: 'library',
  topBar: 'topbar',
  main: 'pages',
  rightPanel: 'nowplaying',
  playerBar: 'player',
  cards: 'look',
  buttons: 'look',
  cardPlayButton: 'look',
  playerPlayButton: 'player',
  progressBar: 'player',
  volumeBar: 'player',
  searchBox: 'topbar',
  homeButton: 'topbar',
  shortcuts: 'home',
  stats: 'home',
  lyricsColumn: 'lyrics',
  npvCards: 'nowplaying',
  shelfHeaders: 'home',
}
