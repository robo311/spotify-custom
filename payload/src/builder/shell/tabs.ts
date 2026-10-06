// The drawer's tabs as data: adding a tab = one entry here plus its component.
import type { FunctionComponent } from 'preact'
import { AudioLines, CodeXml, Disc3, FolderHeart, House, MicVocal, MousePointerClick, Palette, PanelsTopLeft, Puzzle, Shapes, Share2, Sparkles } from 'lucide-static'
import type { TabId } from '../context'
import { StartTab } from '../tabs/StartTab'
import { ColoursTab } from '../tabs/ColoursTab'
import { PartsTab } from '../tabs/PartsTab'
import { LayoutTab } from '../tabs/LayoutTab'
import { LyricsTab } from '../tabs/LyricsTab'
import { ReactiveTab } from '../tabs/ReactiveTab'
import { HomeTab } from '../tabs/HomeTab'
import { PagesTab } from '../tabs/PagesTab'
import { LibraryTab } from '../tabs/LibraryTab'
import { IconsTab } from '../tabs/IconsTab'
import { ExtensionsTab } from '../tabs/ExtensionsTab'
import { ShareTab } from '../tabs/ShareTab'
import { AdvancedTab } from '../tabs/AdvancedTab'

export interface TabDef {
  id: TabId
  label: string
  icon: string
  Component: FunctionComponent
}

export const TABS: readonly TabDef[] = [
  { id: 'start', label: 'Start', icon: Sparkles, Component: StartTab },
  { id: 'colours', label: 'Colours', icon: Palette, Component: ColoursTab },
  { id: 'parts', label: 'Parts', icon: MousePointerClick, Component: PartsTab },
  { id: 'layout', label: 'Layout', icon: PanelsTopLeft, Component: LayoutTab },
  { id: 'lyrics', label: 'Lyrics', icon: MicVocal, Component: LyricsTab },
  { id: 'reactive', label: 'Reactive', icon: AudioLines, Component: ReactiveTab },
  { id: 'home', label: 'Home', icon: House, Component: HomeTab },
  { id: 'pages', label: 'Pages', icon: Disc3, Component: PagesTab },
  { id: 'library', label: 'Library', icon: FolderHeart, Component: LibraryTab },
  { id: 'icons', label: 'Icons', icon: Shapes, Component: IconsTab },
  { id: 'extensions', label: 'Extras', icon: Puzzle, Component: ExtensionsTab },
  { id: 'share', label: 'Share', icon: Share2, Component: ShareTab },
  { id: 'advanced', label: 'Advanced', icon: CodeXml, Component: AdvancedTab },
]
