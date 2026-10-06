// The curated, customisable parts of Spotify's UI. Each part is a data recipe: which elements it is, which
// properties the builder offers, and where each property lands. Adding a part = adding one recipe.
import type { PartDef, PartStyle } from '../types'
import { anyOf, renderRules, within, type CssRule } from './css'
import { normaliseTarget, propRules, type StyleProp, type TargetSpec } from './style-props'
import * as S from './selectors'

export interface PartRecipe {
  id: string
  label: string
  description: string
  /** Root element(s) of the part. */
  selectors: string[]
  hideable: boolean
  /** Only on some pages (Home, playlists…): 'missing' then means "not on this page", not "broken". */
  pageSpecific?: boolean
  /** Offered properties and where each applies (relative to the root). Key order = order shown in the builder. */
  targets: Partial<Record<StyleProp, TargetSpec[]>>
  /** Size slider range for parts that offer `size`. */
  size?: { min: number; max: number; default: number }
  /** Spotify's own corner radius here, when it isn't the theme's (round buttons). */
  radius?: number
}

const ROOT = '&'
const ROOT_CLIPPED = { sel: ROOT, clip: true }
const PROGRESS_VARS = { fill: ['--fg-color', '--is-active-fg-color'], track: ['--bg-color'], radius: ['--progress-bar-radius'] }

export const PART_RECIPES: PartRecipe[] = [
  {
    id: 'sidebar',
    label: 'Sidebar',
    description: 'Your library on the side',
    selectors: [S.LEFT_SIDEBAR],
    hideable: true,
    targets: { background: [ROOT], text: [ROOT], accent: [ROOT], radius: [ROOT_CLIPPED] },
  },
  {
    id: 'topBar',
    label: 'Top bar',
    description: 'Navigation and search strip at the top',
    selectors: [S.TOP_BAR],
    hideable: false,
    targets: { background: [ROOT], text: [ROOT] },
  },
  {
    id: 'main',
    label: 'Main view',
    description: 'The big area in the middle where pages open',
    selectors: [S.MAIN_VIEW],
    hideable: false,
    targets: { background: [ROOT], text: [ROOT], accent: [ROOT], radius: [ROOT_CLIPPED] },
  },
  {
    id: 'rightPanel',
    label: 'Right panel',
    description: 'Now playing, queue and friend activity',
    selectors: [S.RIGHT_SIDEBAR],
    hideable: true,
    targets: { background: [ROOT], text: [ROOT], accent: [ROOT], radius: [ROOT_CLIPPED] },
  },
  {
    id: 'playerBar',
    label: 'Player bar',
    description: 'Playback controls along the bottom',
    selectors: [S.PLAYER_BAR],
    hideable: false,
    // The track title has a hard-coded white, so it needs the colour directly.
    targets: { background: [ROOT], text: [ROOT, S.NOW_PLAYING_TITLE, S.NOW_PLAYING_LINK], accent: [ROOT] },
  },
  {
    id: 'cards',
    label: 'Cards',
    description: 'Album, playlist and artist tiles',
    selectors: [S.CARD],
    hideable: false,
    pageSpecific: true,
    targets: { background: [ROOT], text: [ROOT], radius: [ROOT, S.CARD_IMAGE] },
  },
  {
    id: 'buttons',
    label: 'Buttons',
    description: 'Follow, filter chips and other buttons',
    selectors: S.BUTTONS,
    hideable: false,
    pageSpecific: true,
    targets: { background: [S.BUTTON_FILL], text: [ROOT, S.BUTTON_FILL], radius: [ROOT, S.BUTTON_FILL] },
  },
  {
    id: 'playButton',
    label: 'Play button',
    description: 'The big round play buttons',
    selectors: [S.CARD_PLAY_BUTTON, S.PLAYER_PLAY_PAUSE],
    hideable: false,
    targets: { background: [S.BUTTON_FILL], text: [S.BUTTON_FILL], radius: [ROOT, S.BUTTON_FILL] },
  },
  {
    id: 'progressBar',
    label: 'Progress bar',
    description: 'How far into the song you are',
    selectors: [S.PLAYBACK_PROGRESS],
    hideable: false,
    targets: {
      accent: [{ sel: S.PROGRESS_BAR, vars: PROGRESS_VARS.fill }],
      background: [{ sel: S.PROGRESS_BAR, vars: PROGRESS_VARS.track }],
      radius: [{ sel: S.PROGRESS_BAR, vars: PROGRESS_VARS.radius }],
    },
  },
  {
    id: 'volumeBar',
    label: 'Volume bar',
    description: 'Volume slider',
    selectors: [S.VOLUME_BAR],
    hideable: false,
    targets: {
      accent: [{ sel: S.PROGRESS_BAR, vars: PROGRESS_VARS.fill }],
      background: [{ sel: S.PROGRESS_BAR, vars: PROGRESS_VARS.track }],
      radius: [{ sel: S.PROGRESS_BAR, vars: PROGRESS_VARS.radius }],
    },
  },
  {
    id: 'searchBox',
    label: 'Search box',
    description: 'The search field in the top bar',
    selectors: [S.SEARCH_FORM],
    hideable: false,
    // The input paints var(--background-elevated-*), so the chosen colour goes into exactly those variables.
    targets: {
      background: [{ sel: ROOT, vars: ['--background-elevated-base', '--background-elevated-highlight'] }],
      text: [ROOT, S.SEARCH_INPUT],
      radius: [S.SEARCH_INPUT],
    },
  },
  {
    id: 'homeButton',
    label: 'Home button',
    description: 'The round Home button in the top bar',
    selectors: [S.HOME_BUTTON],
    hideable: false,
    targets: {
      background: [{ sel: ROOT, hover: ':hover' }],
      text: [ROOT],
      radius: [ROOT],
      size: [ROOT, { sel: 'svg', scale: 0.5 }],
    },
    size: { min: 32, max: 56, default: 48 },
    radius: 24,
  },
  {
    id: 'shortcuts',
    label: 'Shortcut cards',
    description: 'Quick picks at the top of Home',
    selectors: [S.SHORTCUT_CARD],
    hideable: false,
    pageSpecific: true,
    // Spotify hard-codes the card text white and the hover fill, so both are set directly.
    targets: {
      background: [{ sel: ROOT, hover: ':is(:hover, :focus-within, [data-context-menu-open="true"])' }],
      text: [ROOT, S.SHORTCUT_TEXT],
      radius: [ROOT],
    },
  },
  {
    id: 'stats',
    label: 'Your listening',
    description: 'Your top artists and songs on Home',
    selectors: [S.STATS_SHELF],
    hideable: false,
    pageSpecific: true,
    // Our own shelf, drawn in a shadow root: it reads these variables (ext/stats/styles.ts).
    targets: {
      background: [{ vars: ['--sc-stats-surface'] }],
      text: [{ vars: ['--sc-stats-text'] }, { vars: ['--sc-stats-subdued'], fade: 70 }],
      accent: [{ vars: ['--sc-stats-accent'] }],
      radius: [{ vars: ['--sc-stats-radius'] }],
    },
  },
  {
    id: 'npvCards',
    label: 'Now playing cards',
    description: 'Artist, credits and queue cards in the Now playing panel',
    selectors: [S.NPV_CARDS],
    hideable: false,
    pageSpecific: true,
    targets: { background: [ROOT], text: [ROOT], accent: [ROOT], radius: [ROOT_CLIPPED] },
  },
  {
    id: 'shelfHeaders',
    label: 'Section titles',
    description: 'Titles above each row on Home',
    selectors: [S.SHELF_TITLE, S.SHELF_SEE_ALL],
    hideable: false,
    pageSpecific: true,
    targets: { text: [ROOT] },
  },
]

/** CSS for one part's overrides. Only properties the recipe offers are compiled; unknown ones are ignored. */
export function compileRecipe(recipe: PartRecipe, style: PartStyle): string {
  const root = anyOf(recipe.selectors)
  const rules: CssRule[] = []
  for (const [prop, specs] of Object.entries(recipe.targets) as [StyleProp, TargetSpec[]][]) {
    const value = style[prop]
    if (value === undefined || value === '') continue
    for (const spec of specs) {
      const target = normaliseTarget(spec)
      rules.push(...propRules(prop, value, within(root, target.sel), target))
    }
  }
  return renderRules(rules)
}

/** Gradients can only be painted, not stored in a colour variable. */
const takesGradient = (recipe: PartRecipe) => (recipe.targets.background ?? []).every(spec => normaliseTarget(spec).paint)

function toPartDef(recipe: PartRecipe): PartDef {
  return {
    id: recipe.id,
    label: recipe.label,
    description: recipe.description,
    selectors: recipe.selectors,
    props: Object.keys(recipe.targets) as StyleProp[],
    hideable: recipe.hideable,
    pageSpecific: recipe.pageSpecific === true,
    gradient: takesGradient(recipe),
    ...(recipe.size ? { size: recipe.size } : {}),
    ...(recipe.radius !== undefined ? { radius: recipe.radius } : {}),
    compile: style => compileRecipe(recipe, style),
  }
}

export const PARTS: PartDef[] = PART_RECIPES.map(toPartDef)
