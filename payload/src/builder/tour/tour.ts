// Guide navigation: the running guide and its step live in the builder's UI state (ui.guide, ui.tour), so the prompt,
// the header's replay button, the What's new sparkle and the tour layer all drive the same overlay.
import type { GuideId, UiSnapshot } from '../context'
import type { Observable } from '../lib/observable'
import { savePrefs } from '../lib/prefs'
import { TOUR_STEPS, type TourStep } from './steps'
import { WHATS_NEW } from './whats-new'

export function stepsOf(guide: GuideId | undefined): readonly TourStep[] {
  return guide === 'whatsNew' ? WHATS_NEW.steps : TOUR_STEPS
}

/** Shows step i of the running guide (switching to its tab). Pick mode belongs to one step only, so moving on ends it. */
export function goToStep(ui: Observable<UiSnapshot>, i: number): void {
  const step = stepsOf(ui.get().guide)[i]
  ui.set(s => ({ ...s, open: true, picking: false, arranging: undefined, tab: step.tab, tour: i }))
}

export function startTour(ui: Observable<UiSnapshot>): void {
  ui.set(s => ({ ...s, guide: undefined }))
  goToStep(ui, 0)
}

export function endTour(ui: Observable<UiSnapshot>): void {
  ui.set(s => ({ ...s, picking: false, tour: undefined, guide: undefined }))
}

/** The sparkle stops lighting up until a release brings a new showcase. */
export function markWhatsNewSeen(ui: Observable<UiSnapshot>): void {
  savePrefs({ whatsNewSeen: WHATS_NEW.id })
  ui.set(s => ({ ...s, whatsNewSeen: WHATS_NEW.id }))
}

/** Starting counts as seen: skipping it is an answer too. */
export function startWhatsNew(ui: Observable<UiSnapshot>): void {
  markWhatsNewSeen(ui)
  ui.set(s => ({ ...s, guide: 'whatsNew' }))
  goToStep(ui, 0)
}
