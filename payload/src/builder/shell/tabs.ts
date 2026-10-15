// The drawer's tabs as data: adding a tab = one entry here (and its id in TAB_IDS) plus its component.
// Grouped: what the whole theme shares, then one tab per area of Spotify in the order they sit on screen, then the rest.
import type { FunctionComponent } from 'preact'
import { AudioLines, CirclePlay, CodeXml, Disc3, House, LibraryBig, MicVocal, Palette, PanelRight, PanelTop, Sparkles, SquareMenu } from 'lucide-static'
import type { TabId } from '../context'
import { ThemesTab } from '../tabs/ThemesTab'
import { LookTab } from '../tabs/LookTab'
import { TopBarTab } from '../tabs/TopBarTab'
import { LibraryTab } from '../tabs/LibraryTab'
import { HomeTab } from '../tabs/HomeTab'
import { PagesTab } from '../tabs/PagesTab'
import { LyricsTab } from '../tabs/LyricsTab'
import { NowPlayingTab } from '../tabs/NowPlayingTab'
import { PlayerTab } from '../tabs/PlayerTab'
import { ReactiveTab } from '../tabs/ReactiveTab'
import { MenuTab } from '../tabs/MenuTab'
import { AdvancedTab } from '../tabs/AdvancedTab'

export type TabGroup = 'theme' | 'areas' | 'more'

export interface TabDef {
  id: TabId
  label: string
  icon: string
  group: TabGroup
  Component: FunctionComponent
}

export const TABS: readonly TabDef[] = [
  { id: 'themes', label: 'Themes', icon: Sparkles, group: 'theme', Component: ThemesTab },
  { id: 'look', label: 'Look', icon: Palette, group: 'theme', Component: LookTab },
  { id: 'topbar', label: 'Top bar', icon: PanelTop, group: 'areas', Component: TopBarTab },
  { id: 'library', label: 'Library', icon: LibraryBig, group: 'areas', Component: LibraryTab },
  { id: 'home', label: 'Home', icon: House, group: 'areas', Component: HomeTab },
  { id: 'pages', label: 'Pages', icon: Disc3, group: 'areas', Component: PagesTab },
  { id: 'lyrics', label: 'Lyrics', icon: MicVocal, group: 'areas', Component: LyricsTab },
  { id: 'nowplaying', label: 'Now playing', icon: PanelRight, group: 'areas', Component: NowPlayingTab },
  { id: 'player', label: 'Player', icon: CirclePlay, group: 'areas', Component: PlayerTab },
  { id: 'reactive', label: 'Reactive', icon: AudioLines, group: 'more', Component: ReactiveTab },
  { id: 'menu', label: 'Menu', icon: SquareMenu, group: 'more', Component: MenuTab },
  { id: 'advanced', label: 'Advanced', icon: CodeXml, group: 'more', Component: AdvancedTab },
]
