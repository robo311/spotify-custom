// Guided-tour navigation: the running step lives in the builder's UI state (ui.tour), so the prompt, the header's
// replay button and the tour layer all drive the same tour.
import type { UiSnapshot } from '../context'
import type { Observable } from '../lib/observable'
import { TOUR_STEPS } from './steps'

/** Shows step i (switching to its tab). Pick mode belongs to one step only, so moving on always ends it. */
export function goToStep(ui: Observable<UiSnapshot>, i: number): void {
  const step = TOUR_STEPS[i]
  ui.set(s => ({ ...s, open: true, picking: false, tab: step.tab, tour: i }))
}

export function startTour(ui: Observable<UiSnapshot>): void {
  goToStep(ui, 0)
}

export function endTour(ui: Observable<UiSnapshot>): void {
  ui.set(s => ({ ...s, picking: false, tour: undefined }))
}
