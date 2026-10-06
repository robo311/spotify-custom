// "Duotone" icon pack: rounded 2px outlines over a 35% tint. The masks keep alpha, so the tint survives as a lighter
// shade of the button colour.
import type { IconName } from './names'

const LINE = 'stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'

/** `tint` is drawn at 35% (filled and outlined; give open paths fill="none"), `line` on top at full strength. */
function duo(tint: string, line: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g opacity=".35" fill="#000" ${LINE}>${tint}</g><g fill="none" ${LINE}>${line}</g></svg>`
}

const PLAY = '<path d="M7 4.8v14.4a1 1 0 0 0 1.5.9l11.6-7.2a1 1 0 0 0 0-1.7L8.5 3.9A1 1 0 0 0 7 4.8z"/>'
const PAUSE = '<rect x="5" y="4" width="4.5" height="16" rx="1.5"/><rect x="14.5" y="4" width="4.5" height="16" rx="1.5"/>'
const NEXT = '<path d="M4 5.8v12.4a1 1 0 0 0 1.6.8l8.6-6.2a1 1 0 0 0 0-1.6L5.6 5A1 1 0 0 0 4 5.8z"/>'
const PREV = '<path d="M20 5.8v12.4a1 1 0 0 1-1.6.8l-8.6-6.2a1 1 0 0 1 0-1.6L18.4 5a1 1 0 0 1 1.6.8z"/>'
const HOUSE = '<path d="M4 10l8-6.5 8 6.5v10a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>'
const LENS = '<circle cx="10.5" cy="10.5" r="6.5"/>'
const BOOKS = '<rect x="3" y="3" width="4" height="18" rx="1"/><rect x="9.5" y="3" width="4" height="18" rx="1"/>'
const NOTE_HEAD = '<circle cx="16.5" cy="18" r="2.5"/>'
const MIC = '<rect x="9" y="2" width="6" height="12" rx="3"/>'
const SPEAKER = '<path d="M3 10a1 1 0 0 1 1-1h3l5-4v14l-5-4H4a1 1 0 0 1-1-1z"/>'
const BELL = '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/>'
const HEAD = '<circle cx="9" cy="7" r="4"/>'
const BODY = '<path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2z"/>'

export const DUOTONE_ICONS: Record<IconName, string> = {
  play: duo(PLAY, PLAY),
  pause: duo(PAUSE, PAUSE),
  next: duo(NEXT, `${NEXT}<path d="M19 5v14"/>`),
  prev: duo(PREV, `${PREV}<path d="M5 5v14"/>`),
  shuffle: duo('<path fill="none" d="M2 17h4L16 7h6M19 4l3 3-3 3"/>', '<path d="M2 7h4l10 10h6M19 14l3 3-3 3"/>'),
  repeat: duo('<path fill="none" d="M21 13v2a3 3 0 0 1-3 3H3M7 22l-4-4 4-4"/>', '<path d="M3 11V9a3 3 0 0 1 3-3h15M17 2l4 4-4 4"/>'),
  home: duo(HOUSE, `${HOUSE}<path d="M2 11.5L12 3.5l10 8"/>`),
  search: duo(LENS, `${LENS}<path d="M21 21l-5.5-5.5"/>`),
  library: duo(BOOKS, `${BOOKS}<path d="M16 4.5l4.5 16"/>`),
  queue: duo(NOTE_HEAD, `${NOTE_HEAD}<path d="M3 5h13M3 11h10M3 17h7M19 18V5h3"/>`),
  lyrics: duo(MIC, `${MIC}<path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/>`),
  volume: duo(SPEAKER, `${SPEAKER}<path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>`),
  volumeMuted: duo(SPEAKER, `${SPEAKER}<path d="M16 9l6 6M22 9l-6 6"/>`),
  browse: duo(
    '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
    '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
  ),
  notifications: duo(BELL, `${BELL}<path d="M10 21a2 2 0 0 0 4 0"/>`),
  friends: duo(`${HEAD}${BODY}`, `${HEAD}${BODY}<path d="M16 3.1a4 4 0 0 1 0 7.8M22 21v-2a4 4 0 0 0-3-3.9"/>`),
}
