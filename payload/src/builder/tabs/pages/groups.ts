// Which Pages sub-tab each page setting lives in. General = settings that apply to every kind of page (titles, the
// play button, track lists: playlists and artists' Popular list use them too); albums = the header and cover of
// album, song and playlist pages; artists = the artist banner and name.
import type { PageStyle } from '../../../types'
import { defaultPageStyle } from '../../../theme/model'

export type PagesTabId = 'general' | 'albums' | 'artists'

export const PAGE_GROUPS: Record<PagesTabId, readonly (keyof PageStyle)[]> = {
  general: ['titleWeight', 'titleSpacing', 'titleUppercase', 'playSize', 'playShape', 'rows', 'thumbnails', 'playingSpin', 'indexStyle', 'playingRow', 'playingStyle', 'playingColor', 'playingStrength', 'playingTitle', 'equaliserColor', 'hideColumnHeader'],
  albums: ['backdrop', 'backdropColor', 'backdropStrength', 'headerLayout', 'headerHeight', 'coverSize', 'coverRadius', 'coverShadow', 'titleScale'],
  artists: ['artistBanner', 'artistBannerHeight', 'artistNameScale'],
}

export function resetGroup(page: PageStyle, tab: PagesTabId): PageStyle {
  const d = defaultPageStyle()
  return { ...page, ...Object.fromEntries(PAGE_GROUPS[tab].map(key => [key, d[key]])) }
}

export function isGroupCustomised(page: PageStyle, tab: PagesTabId): boolean {
  const d = defaultPageStyle()
  return PAGE_GROUPS[tab].some(key => page[key] !== d[key])
}

/** Sets one page setting; coalesceKey merges a slider drag into one undo step. */
export type PageEdit = <K extends keyof PageStyle>(key: K, value: PageStyle[K], coalesceKey?: string) => void
