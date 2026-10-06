// Song progress bar styles (theme.effects.progressBar). Pure CSS on top of Spotify's own bar, so seeking,
// dragging, hover and keyboard keep working. Spotify translates a full-width fill inside a clip box and exposes
// the played share as --progress-bar-transform; everything here keys off that. Motion runs only while playing
// (read from the play/pause glyph), uses transform/opacity/mask-position, and stops for prefers-reduced-motion.
import type { ProgressStyle } from '../types'
import { PLAY_GLYPHS } from '../icons'
import { renderRules, type CssRule } from './css'
import * as S from './selectors'

/** Scopes: the bar at rest, while hovered/keyboard-focused, and while music plays (no play triangle shown). */
const BAR = S.PB_ROOT
const HOT = `${S.PB_ROOT}:is(:hover, :has(:focus-visible))`
const PLAYING = `${S.PLAYER_CONTROLS}:not(:has(${S.PLAYER_PLAY_PAUSE} :is(${PLAY_GLYPHS}))) ${S.PB_ROOT}`

const PB = `${BAR} ${S.PB_BAR}`
const TRACK = `${BAR} ${S.PB_TRACK}`
const FILL_CLIP = `${BAR} ${S.PB_FILL_CLIP}`
const FILL = `${BAR} ${S.PB_FILL}`
const KNOB = `${BAR} ${S.PB_KNOB}`

/** The bar's accent: the progress-bar part's accent if set, else the theme accent (both feed this variable). */
const ACCENT = 'var(--is-active-fg-color, var(--sc-accent))'
const PLAYED = 'var(--progress-bar-transform)'
/** Clips to the played part (optionally reaching `extra` past the playhead and `bleed` above/below/left). */
const playedClip = (bleed = '0px', extra = '0px') => `inset(-${bleed} calc(100% - ${PLAYED} - ${extra}) -${bleed} -${bleed})`
const SPRING = 'cubic-bezier(.34,1.56,.64,1)'
const EASE = 'cubic-bezier(.2,.8,.2,1)'
const SWEEP = 'cubic-bezier(.45,0,.55,1)'

/** Every style draws the played part in the accent (Spotify's resting fill is plain white). */
const BASE: CssRule[] = [{ selector: PB, decls: { '--fg-color': ACCENT } }]

// glow: soft accent halo around the played part; on hover the bar thickens and the knob springs in.
// The track is repainted by a pseudo-element so it can thicken without stretching the knob (a sibling).
const GLOW: CssRule[] = [
  { selector: TRACK, decls: { background: 'transparent' } },
  {
    selector: `${TRACK}::before`,
    decls: {
      content: '""',
      position: 'absolute',
      inset: '0',
      'border-radius': 'var(--progress-bar-radius)',
      background: 'var(--bg-color)',
      'pointer-events': 'none',
      transition: `scale 220ms ${EASE}`,
    },
  },
  {
    selector: FILL_CLIP,
    decls: {
      'box-shadow': `0 0 10px 1px color-mix(in oklab, ${ACCENT} 70%, transparent)`,
      'clip-path': playedClip('14px', '4px'),
      transition: `scale 220ms ${EASE}`,
    },
  },
  { selector: `${HOT} ${S.PB_TRACK}::before, ${HOT} ${S.PB_FILL_CLIP}`, decls: { scale: '1 1.75' } },
  {
    selector: KNOB,
    decls: {
      'box-shadow': `0 0 10px color-mix(in oklab, ${ACCENT} 80%, transparent)`,
      animation: `sc-pb-knob-pop 340ms ${SPRING} both`,
    },
  },
]

// flow: gradient fill (accent → lighter, hue-shifted accent) with a sheen sweeping up to the playhead.
// The sheen layer spans the track; its band sits in its right 35%, so translating it from -100% to
// (played − 65%) moves the band from off-left to the playhead, whatever the progress.
const FLOW: CssRule[] = [
  {
    selector: FILL,
    decls: {
      'background-image': `linear-gradient(90deg, ${ACCENT}, oklch(from ${ACCENT} min(calc(l + 0.18), 0.95) c calc(h + 40)))`,
    },
  },
  { selector: FILL_CLIP, decls: { 'clip-path': playedClip() } },
  {
    selector: `${FILL_CLIP}::after`,
    decls: {
      content: '""',
      position: 'absolute',
      inset: '0',
      background: 'linear-gradient(90deg, transparent 65%, rgb(255 255 255 / 0.85) 88%, transparent 100%)',
      opacity: '0',
      'pointer-events': 'none',
    },
  },
  { selector: `${PLAYING} ${S.PB_FILL_CLIP}::after`, decls: { opacity: '1', animation: `sc-pb-sheen 2.5s ${SWEEP} infinite` } },
]

// wave: the played part becomes a moving sine (Android-style squiggle); the rest stays a flat track. When
// paused, the wave flattens into a straight line.
const WAVE_TILE = { width: 20, height: 12 }
const WAVE_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WAVE_TILE.width}" height="${WAVE_TILE.height}">` +
  '<path d="M0 6 Q5 1 10 6 T20 6" fill="none" stroke="#000" stroke-width="2.5"/></svg>'
const WAVE_MASK_IMAGE = `url("data:image/svg+xml,${encodeURIComponent(WAVE_SVG)}")`
const SETTLE = `380ms ${EASE}`

const WAVE: CssRule[] = [
  {
    selector: TRACK,
    decls: { background: `linear-gradient(90deg, transparent ${PLAYED}, var(--bg-color) ${PLAYED})` },
  },
  {
    selector: FILL_CLIP,
    decls: { height: `${WAVE_TILE.height}px`, top: '50%', translate: '0 -50%', 'border-radius': '0', 'clip-path': playedClip() },
  },
  {
    selector: FILL,
    decls: {
      height: '100%',
      'border-radius': '0',
      'background-color': ACCENT,
      // Longhands only: mask-position is animated, and an !important value would freeze it.
      'mask-image': WAVE_MASK_IMAGE,
      'mask-size': `${WAVE_TILE.width}px ${WAVE_TILE.height}px`,
      'mask-repeat': 'repeat-x',
      scale: '1 0.2',
      opacity: '0',
      transition: `scale ${SETTLE}, opacity ${SETTLE}`,
    },
  },
  {
    selector: `${FILL_CLIP}::before`,
    decls: {
      content: '""',
      position: 'absolute',
      left: '0',
      right: '0',
      top: '50%',
      height: 'var(--progress-bar-height)',
      translate: '0 -50%',
      'border-radius': 'var(--progress-bar-radius)',
      background: ACCENT,
      'pointer-events': 'none',
      transition: `opacity ${SETTLE}`,
    },
  },
  { selector: `${PLAYING} ${S.PB_FILL}`, decls: { scale: '1 1', opacity: '1', animation: 'sc-pb-wave 1s linear infinite' } },
  { selector: `${PLAYING} ${S.PB_FILL_CLIP}::before`, decls: { opacity: '0' } },
]

// segments: an LED level meter. Track and played part are cut into blocks by the same mask, the played part lights
// whole blocks up to the one under the playhead, and that block blinks brighter while playing. Spotify's fill stops
// mid-block, so the clip box paints the accent itself and is clipped to the next block boundary.
const SEG = { lit: 6, period: 8 }
const SEG_MASK = `repeating-linear-gradient(90deg, #000 0 ${SEG.lit}px, transparent ${SEG.lit}px ${SEG.period}px)`
const SEG_END = `round(up, ${PLAYED}, ${SEG.period}px)`

const SEGMENTS: CssRule[] = [
  { selector: TRACK, decls: { background: 'transparent' } },
  {
    selector: `${TRACK}::before`,
    decls: {
      content: '""',
      position: 'absolute',
      inset: '0',
      background: 'var(--bg-color)',
      'mask-image': SEG_MASK,
      'pointer-events': 'none',
      transition: `scale 220ms ${EASE}`,
    },
  },
  {
    selector: FILL_CLIP,
    decls: {
      background: ACCENT,
      'border-radius': '0',
      'mask-image': SEG_MASK,
      'clip-path': `inset(0 calc(100% - ${SEG_END}) 0 0)`,
      transition: `scale 220ms ${EASE}`,
    },
  },
  { selector: `${HOT} ${S.PB_TRACK}::before, ${HOT} ${S.PB_FILL_CLIP}`, decls: { scale: '1 1.75' } },
  {
    selector: `${FILL_CLIP}::after`,
    decls: {
      content: '""',
      position: 'absolute',
      top: '0',
      bottom: '0',
      left: `calc(${SEG_END} - ${SEG.period}px)`,
      width: `${SEG.period}px`,
      background: `oklch(from ${ACCENT} min(calc(l + 0.25), 0.97) c h)`,
      visibility: 'hidden',
      'pointer-events': 'none',
    },
  },
  { selector: `${PLAYING} ${S.PB_FILL_CLIP}::after`, decls: { visibility: 'visible', animation: 'sc-pb-seg-blink 1.2s steps(1) infinite' } },
]

// stripes: darker diagonal stripes over the played part, sliding while playing. The stripe layer starts one tile
// left of the track, so sliding it by exactly one tile loops seamlessly.
const STRIPE_TILE = 12
const STRIPE = `oklch(from ${ACCENT} calc(l * 0.72) c h)`

const STRIPES: CssRule[] = [
  { selector: FILL_CLIP, decls: { 'clip-path': playedClip() } },
  {
    selector: `${FILL_CLIP}::after`,
    decls: {
      content: '""',
      position: 'absolute',
      top: '0',
      bottom: '0',
      left: `-${STRIPE_TILE}px`,
      right: '0',
      'background-image': `linear-gradient(135deg, ${STRIPE} 25%, transparent 25% 50%, ${STRIPE} 50% 75%, transparent 75%)`,
      'background-size': `${STRIPE_TILE}px ${STRIPE_TILE}px`,
      'pointer-events': 'none',
    },
  },
  { selector: `${PLAYING} ${S.PB_FILL_CLIP}::after`, decls: { animation: 'sc-pb-stripes 1s linear infinite' } },
]

// Every declaration we emit is !important, and !important beats animations — so properties that keyframes
// animate (translate of the sheen and stripes, mask-position of the wave, opacity of the blink) are never declared
// in the rules above.
const KEYFRAMES: Record<Exclude<ProgressStyle, 'spotify'>, string> = {
  glow: '@keyframes sc-pb-knob-pop { from { scale: 0; } to { scale: 1; } }',
  flow: `@keyframes sc-pb-sheen { from { translate: -100% 0; } to { translate: calc(${PLAYED} - 65%) 0; } }`,
  wave: `@keyframes sc-pb-wave { from { mask-position: 0 50%; } to { mask-position: ${WAVE_TILE.width}px 50%; } }`,
  segments: '@keyframes sc-pb-seg-blink { 50% { opacity: 0; } }',
  stripes: `@keyframes sc-pb-stripes { from { translate: 0 0; } to { translate: ${STRIPE_TILE}px 0; } }`,
}

const STYLES: Record<Exclude<ProgressStyle, 'spotify'>, CssRule[]> = { glow: GLOW, flow: FLOW, wave: WAVE, segments: SEGMENTS, stripes: STRIPES }

const REDUCED_MOTION =
  `@media (prefers-reduced-motion: reduce) { ${BAR} *, ${BAR} *::before, ${BAR} *::after ` +
  '{ animation: none !important; transition: none !important; } }'

export function compileProgress(style: ProgressStyle): string {
  if (style === 'spotify') return ''
  return [renderRules([...BASE, ...STYLES[style]]), KEYFRAMES[style], REDUCED_MOTION].join('\n')
}
