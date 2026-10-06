// Built-in icon packs. "spotify" leaves Spotify's icons untouched; "line" is a thin-stroke set in the
// JetBrains New UI spirit, built from Lucide (ISC licence). The others are drawn in their own pack-*.ts files.
import type { IconPack } from '../types'
import type { IconName } from './names'
import { BOLD_ICONS } from './pack-bold'
import { DUOTONE_ICONS } from './pack-duotone'
import { toOffsetIcon } from './pack-offset'
import { PIXEL_ICONS } from './pack-pixel'
import { SOFT_ICONS } from './pack-soft'
import play from 'lucide-static/icons/play.svg?raw'
import pause from 'lucide-static/icons/pause.svg?raw'
import skipForward from 'lucide-static/icons/skip-forward.svg?raw'
import skipBack from 'lucide-static/icons/skip-back.svg?raw'
import shuffle from 'lucide-static/icons/shuffle.svg?raw'
import repeat from 'lucide-static/icons/repeat.svg?raw'
import house from 'lucide-static/icons/house.svg?raw'
import search from 'lucide-static/icons/search.svg?raw'
import library from 'lucide-static/icons/library.svg?raw'
import listMusic from 'lucide-static/icons/list-music.svg?raw'
import micVocal from 'lucide-static/icons/mic-vocal.svg?raw'
import volume2 from 'lucide-static/icons/volume-2.svg?raw'
import volumeX from 'lucide-static/icons/volume-x.svg?raw'
import layoutGrid from 'lucide-static/icons/layout-grid.svg?raw'
import bell from 'lucide-static/icons/bell.svg?raw'
import users from 'lucide-static/icons/users.svg?raw'

const LINE_STROKE_WIDTH = '1.75'

/** Strips the licence comment and class, and sets our stroke width. The licence is credited in docs. */
export function toLineIcon(lucideSvg: string): string {
  return lucideSvg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\sclass="[^"]*"/, '')
    .replace(/stroke-width="[^"]*"/, `stroke-width="${LINE_STROKE_WIDTH}"`)
    .replace(/\s+/g, ' ')
    .trim()
}

const LINE_ICONS: Record<IconName, string> = {
  play: toLineIcon(play),
  pause: toLineIcon(pause),
  next: toLineIcon(skipForward),
  prev: toLineIcon(skipBack),
  shuffle: toLineIcon(shuffle),
  repeat: toLineIcon(repeat),
  home: toLineIcon(house),
  search: toLineIcon(search),
  library: toLineIcon(library),
  queue: toLineIcon(listMusic),
  lyrics: toLineIcon(micVocal),
  volume: toLineIcon(volume2),
  volumeMuted: toLineIcon(volumeX),
  browse: toLineIcon(layoutGrid),
  notifications: toLineIcon(bell),
  friends: toLineIcon(users),
}

const OFFSET_ICONS = Object.fromEntries(Object.entries(LINE_ICONS).map(([name, svg]) => [name, toOffsetIcon(svg)])) as Record<IconName, string>

export const SPOTIFY_PACK_ID = 'spotify'

export const BUILTIN_ICON_PACKS: IconPack[] = [
  { id: SPOTIFY_PACK_ID, name: 'Spotify', icons: {} },
  { id: 'line', name: 'Line', icons: LINE_ICONS },
  { id: 'duotone', name: 'Duotone', icons: DUOTONE_ICONS },
  { id: 'offset', name: 'Offset', icons: OFFSET_ICONS },
  { id: 'bold', name: 'Bold', icons: BOLD_ICONS },
  { id: 'soft', name: 'Soft', icons: SOFT_ICONS },
  { id: 'pixel', name: 'Pixel', icons: PIXEL_ICONS },
]
