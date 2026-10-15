// What's new: a short showcase of the latest release's features, played on the tour's overlay. On each release, set
// `id` to the version and replace the steps; the sparkle button lights up again for everyone who saw an older one.
import type { TourStep } from './steps'

export interface WhatsNew {
  id: string // the release that introduced these features
  label: string // headline, in the sparkle's tooltip
  steps: readonly TourStep[]
}

export const WHATS_NEW: WhatsNew = {
  id: '0.4.0',
  label: 'your own right-click menu',
  steps: [
    {
      tab: 'menu',
      target: '[data-tour="menu-layout"]',
      title: 'Your own right-click menu',
      body: 'Right-click a song: the menu now wears your theme’s colours. Keep Spotify’s order, use the Spotify Custom layout, or make it yours here: drag items around, hide what you never use, and split the list with separators or named groups.',
    },
    {
      tab: 'menu',
      target: '[data-tour="menu-playlists"]',
      title: 'A better Add to playlist',
      body: 'The playlist list shows covers and keeps your folders. Sort it A–Z, in your library’s order or your own, and pin the playlists you add to most so they’re always on top.',
    },
    {
      tab: 'menu',
      target: '[data-tour="menu-shortcuts"]',
      title: 'One click instead of three',
      body: 'Put up to three buttons, like Add to queue or Like, right on song rows, on the rows in your queue and next to the song in the player bar.',
    },
  ],
}
