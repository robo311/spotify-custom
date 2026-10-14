// Moving around the studio: open a tab (remembered for next time), optionally bringing one of its sections into view.
import type { TabId, UiSnapshot } from '../context'
import type { Observable } from './observable'
import { savePrefs } from './prefs'

export function selectTab(ui: Observable<UiSnapshot>, tab: TabId): void {
  ui.set(s => ({ ...s, tab }))
  savePrefs({ tab })
}

/** Open the studio on a tab and section (e.g. from a pick-mode editor), leaving pick mode. */
export function goTo(ui: Observable<UiSnapshot>, tab: TabId, section?: string): void {
  ui.set(s => ({ ...s, open: true, picking: false, arranging: undefined, tab, focus: section }))
  savePrefs({ tab })
}
