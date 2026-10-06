import { describe, expect, it } from 'vitest'
import { SVG_ATTRIBUTE_CSS, compileRecolor, type Declaration } from './recolor'

const decl = (property: string, value: string, selector = '.x', conditions: string[] = []): Declaration => ({ selector, property, value, conditions })

describe('compileRecolor', () => {
  it('maps hard-coded Spotify green to the accent for any colour property', () => {
    expect(compileRecolor([decl('color', 'rgb(30, 215, 96)'), decl('border-bottom-color', 'rgb(29, 185, 84)')])).toBe(
      '.x { color: var(--sc-accent) !important; border-bottom-color: var(--sc-accent) !important; }',
    )
  })

  it('maps black only when it is a background (the app frame)', () => {
    expect(compileRecolor([decl('background-color', 'rgb(0, 0, 0)')])).toBe('.x { background-color: var(--sc-surface) !important; }')
    expect(compileRecolor([decl('color', 'rgb(0, 0, 0)')])).toBe('')
  })

  it('rewrites fades towards Spotify base background inside gradients', () => {
    expect(compileRecolor([decl('background-image', 'linear-gradient(180deg, #12121200 0%, #121212 79%)')])).toBe(
      '.x { background-image: linear-gradient(180deg, rgb(from var(--sc-background) r g b / 0) 0%, var(--sc-background) 79%) !important; }',
    )
  })

  it('never touches masks and shadows (black there means opacity)', () => {
    expect(compileRecolor([decl('mask-image', 'linear-gradient(rgb(0, 0, 0), transparent)'), decl('box-shadow', 'rgb(0, 0, 0) 0 2px')])).toBe('')
  })

  it('keeps enclosing @media/@supports conditions', () => {
    expect(compileRecolor([decl('color', 'rgb(30, 215, 96)', '.y', ['@media (min-width: 10px)', '@supports (display: grid)'])])).toBe(
      '@media (min-width: 10px) { @supports (display: grid) { .y { color: var(--sc-accent) !important; } } }',
    )
  })

  it('recolours green SVG presentation attributes case-insensitively', () => {
    expect(SVG_ATTRIBUTE_CSS).toContain('[stroke="#1ed760" i]')
    expect(SVG_ATTRIBUTE_CSS).toContain('fill: var(--sc-accent) !important')
  })

  it('maps component-level variables set to Spotify green to the accent', () => {
    expect(compileRecolor([decl('--is-active-fg-color', '#1db954'), decl('--other', '#123456')])).toBe(
      '.x { --is-active-fg-color: var(--sc-accent) !important; }',
    )
  })

  it('re-hues dynamic-colour header washes with the palette, keeping the page colour lightness', () => {
    const css = compileRecolor([decl('background-image', 'linear-gradient(#0009 0%, var(--background-base) 100%), var(--background-noise)')])
    expect(css).toContain('linear-gradient(rgb(from var(--sc-surface) r g b / 0.6) 0%, var(--background-base) 100%), var(--background-noise), linear-gradient(color-mix(')
    expect(css).toContain('background-blend-mode: normal, normal, color !important;')
    expect(css).not.toContain('#0009')
  })

  it('converts every black-with-alpha spelling inside a wash', () => {
    const css = compileRecolor([decl('background-image', 'linear-gradient(#0000 0%, #00000080 50%, rgba(0, 0, 0, 0.6) 100%), var(--background-noise)')])
    expect(css).toContain('r g b / 0)')
    expect(css).toContain('r g b / 0.502)')
    expect(css).toContain('r g b / 0.6)')
  })
})
