// Turns whatever a person pasted (a bare code, or a chat message containing one) into a theme or a helpful message.
import type { Theme } from '../../types'

export type ShareParseResult = { ok: true; theme: Theme; code: string } | { ok: false; message: string }

const CODE_RE = /SC\d+:[A-Za-z0-9_-]+=*/

/** Finds a share code inside free text, e.g. "here's my theme: SC1:abc… enjoy". */
export function extractShareCode(text: string): string | null {
  return CODE_RE.exec(text)?.[0] ?? null
}

export function parseShareInput(text: string, parse: (code: string) => Theme): ShareParseResult {
  if (!text.trim()) return { ok: false, message: 'Paste a share code first.' }
  const code = extractShareCode(text)
  if (!code) return { ok: false, message: 'That doesn’t look like a share code. Share codes start with “SC1:”.' }
  try {
    return { ok: true, theme: parse(code), code }
  } catch (e) {
    return { ok: false, message: e instanceof Error && e.message ? e.message : 'This share code can’t be read.' }
  }
}

/** File name for exporting a theme: readable, filesystem-safe. */
export function shareFileName(themeName: string): string {
  const base = themeName
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return `${base || 'theme'}.sctheme`
}
