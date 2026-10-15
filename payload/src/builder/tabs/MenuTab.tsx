// Menu: our right-click menu for songs (layout presets and editor), its "Add to playlist" submenu, and one-click
// shortcut buttons. All personal settings, not part of the theme, so none of it travels in share codes.
import { LayoutSection } from './menu/LayoutSection'
import { PlaylistsSection } from './menu/PlaylistsSection'
import { ShortcutsSection } from './menu/ShortcutsSection'

export function MenuTab() {
  return (
    <>
      <LayoutSection />
      <PlaylistsSection />
      <ShortcutsSection />
    </>
  )
}
