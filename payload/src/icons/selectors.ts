// Where each replaceable icon lives in Spotify's UI. Buttons are found by data-testid; state is read from
// language-independent signals (never aria-label): play vs pause from the glyph geometry, muted from the
// volume slider's value.
import type { IconName } from './names'

export interface IconTarget {
  /** Ancestor condition, prepended with a descendant combinator (state held outside the button). */
  scope?: string
  /** The button (or icon container) whose <svg> gets replaced. */
  button: string
  /** Extra condition appended to the button selector (state filters). */
  when?: string
}

// Spotify's play triangle comes in two sizes (16px and 24px glyphs). Anything else in a play/pause button is "pause".
/** Selector list matching the play triangle path; a play/pause button containing it is paused. */
export const PLAY_GLYPHS = 'path[d^="M3 1.713"], path[d^="m7.05 3.606"]'
const SHOWS_PLAY = `:has(${PLAY_GLYPHS})`
const SHOWS_PAUSE = `:has(path):not(:has(${PLAY_GLYPHS}))`

// Spotify picks its "volume off" glyph exactly when the slider value is 0 (muted, or volume at zero);
// React mirrors that value into the range input's value attribute.
const VOLUME_BAR = '[data-testid="volume-bar"]'
const SLIDER_AT_ZERO = ':has(input[type="range"][value="0"])'
const MUTE_BUTTON = '[data-testid="volume-bar-toggle-mute-button"]'

const PLAYER_PLAY_PAUSE = '[data-testid="control-button-playpause"]'
const CARD_PLAY_BUTTON = '[data-testid="play-button"][data-encore-id="buttonPrimary"]'

export const ICON_TARGETS: Record<IconName, IconTarget[]> = {
  play: [
    { button: PLAYER_PLAY_PAUSE, when: SHOWS_PLAY },
    { button: CARD_PLAY_BUTTON, when: SHOWS_PLAY },
  ],
  pause: [
    { button: PLAYER_PLAY_PAUSE, when: SHOWS_PAUSE },
    { button: CARD_PLAY_BUTTON, when: SHOWS_PAUSE },
  ],
  next: [{ button: '[data-testid="control-button-skip-forward"]' }],
  prev: [{ button: '[data-testid="control-button-skip-back"]' }],
  // Shuffle loses its test id while disabled; it is then the only id-less button among the playback controls.
  shuffle: [
    { button: '[data-testid="control-button-shuffle"]' },
    { button: '[data-testid="general-controls"] button:not([data-testid])' },
  ],
  // aria-checked="mixed" = repeat-one; Spotify's own glyph shows the "1", so keep it in that state.
  repeat: [{ button: '[data-testid="control-button-repeat"]', when: ':not([aria-checked="mixed"])' }],
  home: [{ button: '[data-testid="home-button"]' }],
  search: [{ button: '[data-testid="search-icon"]' }],
  // The library toggle has no stable hook in Spotify 1.3.3; packs may ship the icon for future use.
  library: [],
  queue: [{ button: '[data-testid="control-button-queue"]' }],
  lyrics: [{ button: '[data-testid="lyrics-button"]' }],
  volume: [{ scope: `${VOLUME_BAR}:not(${SLIDER_AT_ZERO})`, button: MUTE_BUTTON }],
  volumeMuted: [{ scope: `${VOLUME_BAR}${SLIDER_AT_ZERO}`, button: MUTE_BUTTON }],
  // Top bar: the browse button sits inside the search field.
  browse: [{ button: '[data-testid="global-nav-bar"] [data-testid="browse-button"]' }],
  notifications: [{ button: '[data-testid="whats-new-feed-button"]' }],
  friends: [{ button: '[data-testid="friend-activity-button"]' }],
}

/** Selector for the <svg> elements a target replaces. */
export function targetSvgSelector(target: IconTarget): string {
  const button = `${target.button}${target.when ?? ''} svg`
  return target.scope ? `${target.scope} ${button}` : button
}

/** Every <svg> an icon name replaces, as one selector (e.g. to copy Spotify's own glyph for a preview). */
export function iconSvgSelector(name: IconName): string {
  return ICON_TARGETS[name].map(targetSvgSelector).join(', ')
}
