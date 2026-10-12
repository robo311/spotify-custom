// The guided tour as data: each step opens a tab and points at one real control. Adding a step = one entry here
// (plus a data-tour anchor on the control, if it has no stable class of its own).
import type { TabId } from '../context'

export interface TourStep {
  tab: TabId
  /** Selector inside the studio's shadow root; the step still shows (centred, no spotlight) if it isn't found. */
  target: string
  title: string
  body: string
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    tab: 'start',
    target: '.b-header',
    title: 'Your theme studio',
    body: 'Everything you change here shows up in Spotify straight away and saves itself. Changed your mind? Undo is always up here.',
  },
  {
    tab: 'start',
    target: '[data-tour="presets"]',
    title: 'Start from a preset',
    body: 'Hover a theme to try it on, click to keep it. Edit a preset and your version is saved under Your themes.',
  },
  {
    tab: 'parts',
    target: '.b-pickcta',
    title: 'Point and style',
    body: 'Press this, then click any part of Spotify, like the player bar or the sidebar, to restyle just that part. Esc when you’re done.',
  },
  {
    tab: 'colours',
    target: '[data-tour="accent"]',
    title: 'Colours',
    body: 'Pick an accent or try one of the suggestions. Every colour pair is checked for readability, with a one-click fix if something gets hard to read.',
  },
  {
    tab: 'start',
    target: '[data-tour="effects"]',
    title: 'Let the music choose',
    body: 'Album Mode takes your colours from the cover of whatever’s playing and morphs them as tracks change.',
  },
  {
    tab: 'pages',
    target: '[data-tour="pages"]',
    title: 'Album, playlist and artist pages',
    body: 'Restyle the pages you spend time on: titles, the play button, track lists and headers. General covers every page; Albums and Artists go further.',
  },
  {
    tab: 'lyrics',
    target: '[data-tour="lyrics"]',
    title: 'Lyrics',
    body: 'Give the lyrics view its own background, line colours, font and size. Show lyrics opens them so you can watch each change land.',
  },
  {
    tab: 'start',
    target: '.b-rail',
    title: 'There’s more',
    body: 'Layout moves and hides parts of the window, Home and Library rework those screens, Reactive makes the theme move with the music, and Icons swaps the whole icon set.',
  },
  {
    tab: 'share',
    target: '[data-tour="share"]',
    title: 'Share your look',
    body: 'Copy a code and send it to anyone. Paste theirs below to get exactly their theme.',
  },
  {
    tab: 'advanced',
    target: '[data-tour="advanced"]',
    title: 'For the curious',
    body: 'Know some CSS? Write your own on top of any theme. It applies as you type and is saved with the theme. The folder for hand-made themes, icon packs and extensions is here too.',
  },
  {
    tab: 'advanced',
    target: '[data-tour="replay"]',
    title: 'That’s the tour',
    body: 'Replay it any time from this button. Have fun making Spotify yours.',
  },
]
