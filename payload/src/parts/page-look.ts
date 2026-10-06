// Album, playlist, song and artist pages (theme.pageStyle): the header's backdrop, height and layout, the cover, the
// title, the big play button and the sticky bar, and the artist banner (song lists: track-list-look.ts). Spotify
// paints the header with cover-derived colours set inline, so the overrides are !important (renderRules). The page's
// own cover image and colour come from the runtime (--sc-page-cover-url / --sc-page-cover-color, see runtime.ts).
import type { PageStyle } from '../types'
import { renderRules, type CssRule, type Declarations } from './css'
import * as S from './selectors'
import { trackListKeyframes, trackListRules } from './track-list-look'

export const PAGE_COVER_URL_VAR = '--sc-page-cover-url'
export const PAGE_COVER_COLOR_VAR = '--sc-page-cover-color'

interface Backdrop {
  header: Declarations
  fade: Declarations
}

/** A wash of one colour: strong at the top of the header, fading into the page under it. */
const wash = (color: string): Backdrop => ({
  header: { background: `linear-gradient(color-mix(in oklab, ${color} 62%, var(--sc-background)), color-mix(in oklab, ${color} 28%, var(--sc-background)))` },
  fade: { 'background-image': `linear-gradient(color-mix(in oklab, ${color} 26%, transparent), transparent)` },
})

const THEME_BACKDROP: Backdrop = {
  header: { background: 'linear-gradient(var(--sc-elevated), var(--sc-background))' },
  fade: { 'background-image': 'linear-gradient(color-mix(in oklab, var(--sc-elevated) 55%, transparent), transparent)' },
}

function backdropOf(s: PageStyle): Backdrop | null {
  switch (s.backdrop) {
    case 'accent':
      return wash('var(--sc-accent)')
    case 'custom':
      return wash(s.backdropColor ?? 'var(--sc-accent)')
    case 'theme':
      return THEME_BACKDROP
    case 'none':
      return { header: { background: 'none' }, fade: { background: 'none' } }
    default:
      return null
  }
}

// The cover itself, heavily blurred and darkened, melting into the page below the header.
const COVER_BLUR: CssRule[] = [
  { selector: S.ENTITY_HEADER, decls: { overflow: 'clip' } },
  {
    selector: S.HEADER_BACKDROP,
    decls: {
      background: `var(${PAGE_COVER_URL_VAR}, none) center / cover no-repeat, var(--sc-background)`,
      filter: 'blur(48px) saturate(1.35) brightness(0.55)',
      transform: 'scale(1.25)',
      'mask-image': 'linear-gradient(#000 55%, transparent)',
    },
  },
  { selector: S.ACTION_BACKDROP, decls: { 'background-image': 'none' } },
]


const COVER_SHADOWS: Record<Exclude<PageStyle['coverShadow'], 'spotify'>, string> = {
  none: 'none',
  lifted: '0 24px 48px -12px rgb(0 0 0 / .65), 0 8px 16px -8px rgb(0 0 0 / .5)',
  glow: `0 0 0 1px rgb(255 255 255 / .06), 0 18px 70px -8px color-mix(in oklab, var(${PAGE_COVER_COLOR_VAR}, var(--sc-accent)) 80%, transparent)`,
}

/** A compact centred header's title, relative to the Title size setting. */
const COMPACT_CENTRED_TITLE = 0.85

const BANNER_PX: Record<PageStyle['headerHeight'], string> = { compact: '300px', spotify: '404px', tall: '520px' }

/**
 * The cover as a wide banner behind the title, like artist pages (albums and songs only, see BANNER_HEADER). It replaces
 * whatever the backdrop setting paints there, blur included, and the small cover is hidden.
 */
function bannerRules(s: PageStyle): CssRule[] {
  const header = S.BANNER_HEADER
  const px = BANNER_PX[s.headerHeight]
  return [
    { selector: header, decls: { height: px, 'min-height': '0', 'max-height': 'none', 'padding-top': '0', overflow: 'clip' } },
    {
      selector: `${header} > :not(:last-child)`,
      decls: {
        background: `linear-gradient(transparent 35%, rgb(0 0 0 / .55)), var(${PAGE_COVER_URL_VAR}, none) center 35% / cover no-repeat, var(--sc-background)`,
        filter: 'none',
        transform: 'none',
        'mask-image': 'none',
      },
    },
    { selector: `${header} > :last-child > :has(img):not(:last-child)`, decls: { display: 'none' } },
    { selector: `${header} > :last-child`, decls: { 'align-items': 'flex-end' } },
    { selector: `${header} [data-testid="entityTitle"] h1`, decls: { 'text-shadow': '0 2px 24px rgb(0 0 0 / .35)' } },
  ]
}

function headerRules(s: PageStyle): CssRule[] {
  const rules: CssRule[] = []
  const backdrop = backdropOf(s)
  if (s.backdrop === 'cover-blur') rules.push(...COVER_BLUR)
  else if (backdrop) rules.push({ selector: S.HEADER_BACKDROP, decls: backdrop.header }, { selector: S.ACTION_BACKDROP, decls: backdrop.fade })
  if (s.backdropStrength < 100) {
    const opacity = { opacity: String(s.backdropStrength / 100) }
    rules.push({ selector: S.HEADER_BACKDROP, decls: opacity }, { selector: S.ACTION_BACKDROP, decls: opacity })
  }
  if (s.headerHeight === 'compact') rules.push({ selector: S.ENTITY_HEADER, decls: { 'min-height': '0', 'max-height': 'none', height: 'auto', 'padding-top': '24px' } })
  if (s.headerHeight === 'tall') rules.push({ selector: S.ENTITY_HEADER, decls: { 'min-height': '420px', 'max-height': 'none', height: 'auto' } })
  if (s.headerLayout === 'centred') {
    rules.push(
      { selector: S.ENTITY_HEADER, decls: { 'max-height': 'none', height: 'auto' } },
      { selector: S.HEADER_CONTENT, decls: { 'flex-direction': 'column', 'align-items': 'center', 'justify-content': 'flex-end', gap: '20px', 'padding-top': '32px', 'text-align': 'center' } },
      // Spotify aligns the cover itself (align-self) and lets the text block shrink to fit, which in a column
      // would squeeze the title to a sliver.
      { selector: S.HEADER_COVER, decls: { 'align-self': 'center', margin: '0' } },
      { selector: S.HEADER_TEXT, decls: { 'align-items': 'center', 'text-align': 'center', width: '100%', 'max-width': '100%' } },
      { selector: `${S.HEADER_TEXT} > div`, decls: { 'justify-content': 'center' } },
      // The title's wrapper would shrink to the text in a centred column; Spotify then fits the font to that narrow box
      // and wraps it. Stretched, the title gets the full width (Spotify's own h1 rule left-aligns it, hence its own rule).
      { selector: `${S.HEADER_TEXT} > :has([data-testid="entityTitle"])`, decls: { 'align-self': 'stretch', width: '100%' } },
      { selector: S.HEADER_TITLE, decls: { 'text-align': 'center' } },
    )
    // Stacked, the cover alone is most of Spotify's header height: compact keeps the cover and saves the space around it.
    if (s.headerHeight === 'compact') {
      rules.push({ selector: S.ENTITY_HEADER, decls: { 'padding-top': '0' } }, { selector: S.HEADER_CONTENT, decls: { 'padding-top': '8px', gap: '12px' } })
    }
  }
  if (s.coverSize !== null) {
    const px = `${s.coverSize}px`
    rules.push(
      { selector: S.HEADER_COVER, decls: { width: px, height: px, 'min-width': px, 'flex-shrink': '0' } },
      { selector: `${S.HEADER_COVER} img`, decls: { width: '100%', height: '100%' } },
    )
  }
  if (s.coverRadius !== null) {
    rules.push({ selector: `${S.HEADER_COVER}, ${S.HEADER_COVER} > div, ${S.HEADER_COVER} img`, decls: { 'border-radius': `${s.coverRadius}px`, overflow: 'clip' } })
  }
  if (s.coverShadow !== 'spotify') rules.push({ selector: `${S.HEADER_COVER} > div, ${S.HEADER_COVER} img`, decls: { 'box-shadow': COVER_SHADOWS[s.coverShadow] } })
  if (s.headerLayout === 'banner') rules.push(...bannerRules(s))
  const titleZoom = Math.round(s.titleScale * (s.headerLayout === 'centred' && s.headerHeight === 'compact' ? COMPACT_CENTRED_TITLE : 1) * 100) / 100
  if (titleZoom !== 1) rules.push({ selector: S.HEADER_TITLE, decls: { zoom: String(titleZoom) } })
  return rules
}

const TITLE_WEIGHTS: Record<Exclude<PageStyle['titleWeight'], 'spotify'>, string> = { light: '300', regular: '400', black: '900' }
const TITLE_SPACING: Record<Exclude<PageStyle['titleSpacing'], 'spotify'>, string> = { tight: '-0.04em', wide: '0.06em' }

function titleRules(s: PageStyle): CssRule[] {
  const decls: Declarations = {}
  if (s.titleWeight !== 'spotify') decls['font-weight'] = TITLE_WEIGHTS[s.titleWeight]
  if (s.titleSpacing !== 'spotify') decls['letter-spacing'] = TITLE_SPACING[s.titleSpacing]
  if (s.titleUppercase) decls['text-transform'] = 'uppercase'
  return [{ selector: S.PAGE_TITLES, decls }]
}

type PlaySizes = Record<PageStyle['playSize'], { button: number; icon: number }>

/** Under the header; and in the 64px sticky bar, where Spotify's own button is smaller, so every size steps down. */
const PLAY_SIZES: readonly { selector: string; px: PlaySizes }[] = [
  { selector: S.PAGE_PLAY_BUTTON, px: { small: { button: 48, icon: 20 }, spotify: { button: 56, icon: 24 }, large: { button: 72, icon: 32 } } },
  { selector: S.TOP_BAR_PLAY_BUTTON, px: { small: { button: 40, icon: 20 }, spotify: { button: 48, icon: 24 }, large: { button: 56, icon: 28 } } },
]

function playRules(s: PageStyle): CssRule[] {
  if (s.playSize === 'spotify' && s.playShape === 'spotify') return []
  return PLAY_SIZES.flatMap(({ selector, px }) => {
    const { button, icon } = px[s.playSize]
    const width = s.playShape === 'pill' ? Math.round(button * 1.6) : button
    const rules: CssRule[] = [
      { selector, decls: { width: `${width}px`, height: `${button}px` } },
      { selector: `${selector} > span`, decls: { width: '100%', height: '100%', 'inline-size': '100%', 'block-size': '100%', 'min-block-size': '0' } },
    ]
    if (s.playSize !== 'spotify') rules.push({ selector: `${selector} svg`, decls: { width: `${icon}px`, height: `${icon}px` } })
    if (s.playShape === 'rounded') rules.push({ selector: `${selector} > span`, decls: { 'border-radius': '30%' } })
    return rules
  })
}

/**
 * The bar that sticks to the top once the header scrolls away: the header's colour (Spotify's cover colour when the
 * header shows the cover: its own, blurred, or as a banner), a shade darker with a soft edge so it doesn't melt into
 * the page under it.
 */
function topBarRules(s: PageStyle): CssRule[] {
  if (s.backdrop === 'spotify' && s.headerLayout === 'spotify') return []
  const custom = s.backdropColor ?? 'var(--sc-accent)'
  const colour =
    s.headerLayout === 'banner'
      ? 'var(--background-base)'
      : {
          spotify: 'var(--background-base)',
          'cover-blur': 'var(--background-base)',
          accent: 'color-mix(in oklab, var(--sc-accent) 62%, var(--sc-background))',
          custom: `color-mix(in oklab, ${custom} 62%, var(--sc-background))`,
          theme: 'var(--sc-elevated)',
          none: 'var(--sc-surface)',
        }[s.backdrop]
  return [
    {
      selector: S.PAGE_TOP_BAR_FILL,
      decls: {
        'background-color': `color-mix(in oklab, ${colour} 82%, black)`,
        'background-image': 'none',
        'box-shadow': 'inset 0 -1px 0 rgb(255 255 255 / .06), 0 8px 20px -10px rgb(0 0 0 / .6)',
      },
    },
  ]
}

const ARTIST_HEADER_PX: Record<Exclude<PageStyle['artistBannerHeight'], 'spotify'>, string> = { compact: '280px', tall: '540px' }
const ARTIST_FADE_TO_PAGE = 'linear-gradient(transparent 40%, color-mix(in oklab, var(--sc-background) 85%, transparent))'

function artistRules(s: PageStyle): CssRule[] {
  const rules: CssRule[] = []
  switch (s.artistBanner) {
    case 'dim':
      rules.push({ selector: S.ARTIST_BANNER_IMAGE, decls: { filter: 'brightness(0.55)' } })
      break
    case 'blur':
      rules.push({ selector: S.ARTIST_BANNER, decls: { overflow: 'clip' } }, { selector: S.ARTIST_BANNER_IMAGE, decls: { filter: 'blur(24px) brightness(0.7)' } })
      break
    case 'tint':
      // A duotone: the photo in greys, its shade layer recoloured by the accent (blend mode "color" keeps the greys' light).
      rules.push(
        { selector: S.ARTIST_BANNER, decls: { isolation: 'isolate' } },
        { selector: S.ARTIST_BANNER_IMAGE, decls: { filter: 'grayscale(1) contrast(1.1) brightness(0.8)' } },
        { selector: S.ARTIST_BANNER_SHADE, decls: { 'background-image': 'linear-gradient(var(--sc-accent), var(--sc-accent))', 'mix-blend-mode': 'color' } },
        { selector: `${S.ARTIST_BANNER}::after`, decls: { content: '""', position: 'absolute', inset: '0', 'pointer-events': 'none', background: ARTIST_FADE_TO_PAGE } },
        { selector: S.ARTIST_ACTION_BACKDROP, decls: wash('var(--sc-accent)').fade },
      )
      break
    case 'none':
      rules.push(
        { selector: S.ARTIST_BANNER, decls: THEME_BACKDROP.header },
        { selector: `${S.ARTIST_BANNER_IMAGE}, ${S.ARTIST_BANNER_SHADE}`, decls: { display: 'none' } },
        { selector: S.ARTIST_ACTION_BACKDROP, decls: { background: 'none', ...THEME_BACKDROP.fade } },
      )
      break
  }
  if (s.artistBannerHeight !== 'spotify') {
    rules.push(
      { selector: `${S.ARTIST_HEADER}, ${S.ARTIST_BANNER}`, decls: { height: ARTIST_HEADER_PX[s.artistBannerHeight] } },
      { selector: S.ARTIST_HEADER, decls: { 'min-height': '0', 'max-height': 'none' } },
    )
  }
  if (s.artistNameScale !== 1) rules.push({ selector: S.ARTIST_NAME, decls: { zoom: String(s.artistNameScale) } })
  return rules
}

export function compilePageLook(style: PageStyle): string {
  const rules = [...headerRules(style), ...titleRules(style), ...playRules(style), ...topBarRules(style), ...trackListRules(style), ...artistRules(style)]
  return [trackListKeyframes(style), renderRules(rules)].filter(Boolean).join('\n')
}
