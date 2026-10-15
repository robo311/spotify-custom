// Keeps the right panel's header inside the panel at its narrowest. Its tabs don't shrink, so with a wider theme font
// or long labels (e.g. Slovak "Nedávno prehrávané") the close button overflowed; clicking a tab then scrolled the
// overflow-hidden panel sideways and everything slid left. `clip` can't be scrolled; the tabs end in an ellipsis instead.
import { renderRules } from './css'

const PANEL = '#Desktop_PanelContainer_Id'

export function compilePanelFit(): string {
  return renderRules([
    { selector: PANEL, decls: { overflow: 'clip' } },
    // The header row's item that holds the tab list kept min-width:auto and pushed the close button out.
    { selector: `${PANEL} div:has(> div > [role="tablist"])`, decls: { 'min-width': '0' } },
    { selector: `${PANEL} [role="tablist"]`, decls: { 'min-width': '0', 'flex-shrink': '1' } },
    {
      selector: `${PANEL} [role="tab"]`,
      decls: { 'min-width': '0', 'flex-shrink': '1', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
    },
  ])
}
