// What's new: a short showcase of the latest release's features, played on the tour's overlay. On each release, set
// `id` to the version and replace the steps; the sparkle button lights up again for everyone who saw an older one.
import type { TourStep } from './steps'

export interface WhatsNew {
  id: string // the release that introduced these features
  label: string // headline, in the sparkle's tooltip
  steps: readonly TourStep[]
}

export const WHATS_NEW: WhatsNew = {
  id: '0.3.0',
  label: 'pictures in your bars',
  steps: [
    {
      tab: 'topbar',
      target: '[data-tour="bar-pictures"]',
      title: 'Pictures in your bars',
      body: 'The top bar and the player bar can now carry pictures: up to five each, stacked into one scene. Each picture has its own fit, size, position, opacity, blur, brightness and soft edges. The player bar has the same section in the Player tab.',
    },
    {
      tab: 'topbar',
      target: '[data-tour="add-picture"]',
      title: 'Add your own',
      body: 'Wide pictures work best, at least 2400 × 160 px. The first one fills the bar; the next ones go on top, wherever you put them, even half past the bar’s edge.',
    },
    {
      tab: 'topbar',
      target: '[data-tour="arrange"]',
      title: 'Arrange on the bar',
      body: 'Once you have a picture, Arrange turns the real bar into a canvas: drag to move, drag a corner or scroll to resize, arrows to nudge. Cancel puts everything back; every drag is one undo step.',
    },
    {
      tab: 'themes',
      target: '[data-tour="presets"]',
      title: 'See it in Galaxy',
      body: 'Galaxy shows the idea: nebula clouds fading out at the sides, and a ringed planet on its own layer. Pick it, then arrange the planet wherever you like. Your own themes are one click away.',
    },
  ],
}
