// Which bits of the theme a part's editor can change, as edit-session slices: the part's own style, whether it's
// hidden, and any part-specific extras (e.g. the progress bar's animation style, Home's card layout).
import type { HomeStyle, IconChoice, PartStyle, ProgressStyle, Theme } from '../../types'
import { defaultHomeStyle, SPOTIFY_NPV_CARD_GAP } from '../../theme/model'
import type { Slice } from './edit-session'
import { lookup } from './record'
import { isPartEdited, resetPart, setHidden } from './theme-edits'

/** An extra slice; `reset` (when given) is what Reset puts back, and differing from it counts as customised. */
interface ExtraSlice extends Slice {
  reset?: unknown
}

const partStyleSlice = (partId: string): Slice => ({
  read: t => lookup(t.parts, partId),
  write: (t, v) => {
    const { [partId]: _old, ...rest } = t.parts
    t.parts = v === undefined ? rest : { ...rest, [partId]: v as PartStyle }
  },
})

const hiddenSlice = (partId: string): Slice => ({
  read: t => t.layout.hidden.includes(partId),
  write: (t, v) => setHidden(partId, v === true)(t),
})

const homeStyleSlice = (key: keyof HomeStyle): ExtraSlice => ({
  read: t => t.homeStyle[key],
  write: (t, v) => {
    t.homeStyle = { ...t.homeStyle, [key]: v }
  },
  reset: defaultHomeStyle()[key],
})

const iconSlice = (name: string): ExtraSlice => ({
  read: t => lookup(t.iconOverrides, name),
  write: (t, v) => {
    const { [name]: _old, ...rest } = t.iconOverrides
    t.iconOverrides = v === undefined ? rest : { ...rest, [name]: v as IconChoice }
  },
  reset: undefined,
})

/** Extra theme slices edited by part-specific controls, keyed by part id. */
const EXTRA_SLICES: Partial<Record<string, ExtraSlice[]>> = {
  progressBar: [
    {
      read: (t: Theme) => t.effects.progressBar,
      write: (t: Theme, v: unknown) => {
        t.effects.progressBar = v as ProgressStyle
      },
    },
  ],
  homeButton: [iconSlice('home')],
  searchBox: [iconSlice('search'), iconSlice('browse')],
  topBar: [iconSlice('notifications'), iconSlice('friends')],
  shortcuts: [homeStyleSlice('shortcutSize'), homeStyleSlice('shortcutColumns')],
  npvCards: [
    {
      read: (t: Theme) => t.layout.nowPlaying.cardGap,
      write: (t: Theme, v: unknown) => {
        t.layout.nowPlaying = { ...t.layout.nowPlaying, cardGap: typeof v === 'number' ? v : SPOTIFY_NPV_CARD_GAP }
      },
      reset: SPOTIFY_NPV_CARD_GAP,
    },
  ],
  stats: [homeStyleSlice('statsLayout'), homeStyleSlice('statsCount'), homeStyleSlice('statsRanks'), homeStyleSlice('statsGlow')],
}

const resettable = (partId: string) => (EXTRA_SLICES[partId] ?? []).filter(s => 'reset' in s)

export function partSlices(partId: string): Slice[] {
  return [partStyleSlice(partId), hiddenSlice(partId), ...(EXTRA_SLICES[partId] ?? [])]
}

/** Reset for a part's editor: its style and hidden flag, plus the extras that have a reset value. */
export function resetPartFully(partId: string) {
  return (t: Theme) => {
    resetPart(partId)(t)
    for (const slice of resettable(partId)) slice.write(t, slice.reset)
  }
}

export function isPartCustomised(theme: Theme, partId: string): boolean {
  return isPartEdited(theme, partId) || resettable(partId).some(s => JSON.stringify(s.read(theme)) !== JSON.stringify(s.reset))
}
