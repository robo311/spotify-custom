// Icons to choose from for single buttons (theme.iconOverrides): Lucide (ISC), drawn in the 'line' pack style.
// Ids are stored in themes and share codes, so never rename one; add new ids instead.
import {
  Archive, Armchair, AudioLines, Bell, BellDot, BellRing, Binoculars, Bird, Blocks, Bot, Castle, Cat, Compass, Contact,
  Crown, Disc3, Dog, Flame, Flower2, Gamepad2, Ghost, Globe, Handshake, Headphones, Heart, House, HouseHeart, Inbox,
  LayoutGrid, Leaf, Library, Mail, Map as MapIcon, Megaphone, MessageCircle, Moon, Music, Orbit, PartyPopper, Radio,
  Rocket, ScanSearch, Search, Shapes, Smile, Sofa, Sparkles, SquareLibrary, Star, Store, Sun, Telescope, Tent, UserRound,
  Users, UsersRound, Zap,
} from 'lucide-static'
import { toLineIcon } from './packs'

export interface GalleryIcon {
  id: string
  label: string
  svg: string
}

const SOURCE: [id: string, label: string, svg: string][] = [
  // Home
  ['house', 'House', House],
  ['house-heart', 'Sweet home', HouseHeart],
  ['castle', 'Castle', Castle],
  ['tent', 'Tent', Tent],
  ['sofa', 'Sofa', Sofa],
  ['armchair', 'Armchair', Armchair],
  ['store', 'Store', Store],
  // Search & browse
  ['search', 'Magnifier', Search],
  ['scan-search', 'Scan', ScanSearch],
  ['telescope', 'Telescope', Telescope],
  ['binoculars', 'Binoculars', Binoculars],
  ['compass', 'Compass', Compass],
  ['map', 'Map', MapIcon],
  ['globe', 'Globe', Globe],
  ['layout-grid', 'Grid', LayoutGrid],
  ['blocks', 'Blocks', Blocks],
  ['shapes', 'Shapes', Shapes],
  ['archive', 'Crate', Archive],
  ['library', 'Library', Library],
  ['square-library', 'Shelf', SquareLibrary],
  // People
  ['users', 'Friends', Users],
  ['users-round', 'Crew', UsersRound],
  ['user-round', 'Person', UserRound],
  ['contact', 'Contact', Contact],
  ['handshake', 'Handshake', Handshake],
  ['message', 'Chat', MessageCircle],
  ['smile', 'Smile', Smile],
  ['party', 'Party', PartyPopper],
  // News
  ['bell', 'Bell', Bell],
  ['bell-ring', 'Ringing bell', BellRing],
  ['bell-dot', 'Bell with dot', BellDot],
  ['megaphone', 'Megaphone', Megaphone],
  ['mail', 'Mail', Mail],
  ['inbox', 'Inbox', Inbox],
  ['sparkles', 'Sparkles', Sparkles],
  // Music & fun
  ['music', 'Note', Music],
  ['headphones', 'Headphones', Headphones],
  ['disc', 'Vinyl', Disc3],
  ['radio', 'Radio', Radio],
  ['waveform', 'Waveform', AudioLines],
  ['star', 'Star', Star],
  ['heart', 'Heart', Heart],
  ['flame', 'Flame', Flame],
  ['zap', 'Zap', Zap],
  ['crown', 'Crown', Crown],
  ['rocket', 'Rocket', Rocket],
  ['orbit', 'Orbit', Orbit],
  ['ghost', 'Ghost', Ghost],
  ['cat', 'Cat', Cat],
  ['dog', 'Dog', Dog],
  ['bird', 'Bird', Bird],
  ['flower', 'Flower', Flower2],
  ['leaf', 'Leaf', Leaf],
  ['sun', 'Sun', Sun],
  ['moon', 'Moon', Moon],
  ['game', 'Game', Gamepad2],
  ['bot', 'Robot', Bot],
]

export const ICON_GALLERY: GalleryIcon[] = SOURCE.map(([id, label, svg]) => ({ id, label, svg: toLineIcon(svg) }))

const BY_ID = new Map(ICON_GALLERY.map(icon => [icon.id, icon.svg]))

export function galleryIcon(id: string): string | undefined {
  return BY_ID.get(id)
}
