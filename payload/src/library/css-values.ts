// Validation and escaping for user-provided values that end up in the artwork stylesheet.
// Settings files are hand-editable, so nothing from ArtworkStyle reaches CSS without passing through here.

const DATA_IMAGE = /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/

/** A CSS string literal; safe for any input (quotes, backslashes, newlines, control characters). */
export function cssString(value: string): string {
  let out = '"'
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0
    if (ch === '"' || ch === '\\') out += `\\${ch}`
    else if (code < 0x20 || code === 0x7f) out += `\\${code.toString(16)} `
    else out += ch
  }
  return `${out}"`
}

/**
 * A colour or gradient that can't break out of its declaration or load anything:
 * no ; { } < > (statement/rule/markup breakers), no url()/image-set()/@import, no comments or escapes.
 */
export function safePaint(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (trimmed === '' || trimmed.length > 500) return null
  if (/[;{}<>\\]|\/\*|url\s*\(|image-set|@import|expression/i.test(trimmed)) return null
  return trimmed
}

/** A plain colour (no gradient, no quotes), safe to put in CSS *and* in an SVG attribute. */
export function safeColor(value: string | undefined): string | null {
  const paint = safePaint(value)
  return paint && !/gradient|["'&]/i.test(paint) ? paint : null
}

export function isDataImage(value: string | undefined): value is string {
  return typeof value === 'string' && DATA_IMAGE.test(value)
}

/** url("data:image/svg+xml,…") for inline SVG markup. */
export function svgUrl(svg: string): string {
  return `url(${cssString(`data:image/svg+xml,${encodeURIComponent(svg.trim())}`)})`
}

/** A stylesheet fragment: custom properties for :root (large data URLs, declared once) and rules using them. */
export interface ArtworkCss {
  vars: string[]
  rules: string[]
}
