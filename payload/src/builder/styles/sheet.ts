// Co-located component styles as constructable stylesheets, adopted into the builder's shadow roots on first use.
import { useLayoutEffect } from 'preact/hooks'
import { useEnv } from '../context'

export interface Sheet {
  readonly cssText: string
}

export function css(strings: TemplateStringsArray, ...values: (string | number)[]): Sheet {
  return { cssText: String.raw({ raw: strings }, ...values) }
}

const constructed = new WeakMap<Sheet, CSSStyleSheet>()

function toStyleSheet(sheet: Sheet): CSSStyleSheet {
  let built = constructed.get(sheet)
  if (!built) {
    built = new CSSStyleSheet()
    built.replaceSync(sheet.cssText)
    constructed.set(sheet, built)
  }
  return built
}

/** Adopts sheets into a shadow root (idempotent, keeps first-adopted order so later sheets win ties). */
export function adoptSheets(root: ShadowRoot, sheets: readonly Sheet[]): void {
  const current = root.adoptedStyleSheets
  const missing = sheets.map(toStyleSheet).filter(s => !current.includes(s))
  if (missing.length) root.adoptedStyleSheets = [...current, ...missing]
}

/** Component hook: ensures its sheets are present in the shadow root it renders into. */
export function useStyles(...sheets: Sheet[]): void {
  const { root } = useEnv()
  useLayoutEffect(() => {
    adoptSheets(root, sheets)
  })
}
