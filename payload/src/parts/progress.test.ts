import { describe, expect, it } from 'vitest'
import { compileProgress } from './progress'

const rules = (css: string) => css.split('\n}').map(r => r.trim())
const ruleFor = (css: string, selectorPart: string) => rules(css).find(r => r.split('{')[0]?.includes(selectorPart)) ?? ''

describe('compileProgress', () => {
  it("leaves Spotify's bar alone", () => {
    expect(compileProgress('spotify')).toBe('')
  })

  it.each(['glow', 'flow', 'wave', 'segments', 'stripes'] as const)('%s: accent fill, keyframes, reduced-motion fallback, no nested :has', style => {
    const css = compileProgress(style)
    expect(css).toContain('--fg-color: var(--is-active-fg-color, var(--sc-accent)) !important;')
    expect(css).toMatch(/@keyframes sc-pb-[\w-]+ \{/)
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    for (const rule of css.split('}')) expect(rule).not.toMatch(/:has\([^)]*:has\(/)
    // Only compositor-friendly animated properties, and none pinned by an !important declaration on the same
    // element (that would freeze the animation).
    const keyframes = new Map([...css.matchAll(/@keyframes ([\w-]+) \{(.*)\}/g)].map(m => [m[1], m[2]]))
    for (const body of keyframes.values()) expect(body).not.toMatch(/\b(width|left|height|top|margin)\s*:/)
    const styleRules = [...css.matchAll(/^([^@\n][^{]*?) \{\n([^}]*)\}/gm)].map(m => ({ selector: m[1], body: m[2] }))
    for (const rule of styleRules) {
      const name = /animation: ([\w-]+)/.exec(rule.body)?.[1]
      if (!name) continue
      const animated = (keyframes.get(name) ?? '').match(/[\w-]+(?=:)/g) ?? []
      for (const other of styleRules.filter(r => r.selector === rule.selector || rule.selector.endsWith(r.selector))) {
        for (const prop of animated) expect(other.body, `${name} vs ${other.selector}`).not.toMatch(new RegExp(`^\\s*${prop}:`, 'm'))
      }
    }
  })

  it('glow: halo clipped to the played part, thickens on hover, springy knob', () => {
    const css = compileProgress('glow')
    expect(ruleFor(css, 'div:has(+ [data-testid="progress-bar-handle"])')).toContain(
      'clip-path: inset(-14px calc(100% - var(--progress-bar-transform) - 4px) -14px -14px) !important;',
    )
    expect(css).toMatch(/\[data-testid="playback-progressbar"\]:is\(:hover, :has\(:focus-visible\)\) \[data-testid="progress-bar"\][^{]*\{\n {2}scale: 1 1\.75 !important;/)
    expect(ruleFor(css, '> [data-testid="progress-bar-handle"]')).toContain('animation: sc-pb-knob-pop 340ms')
  })

  it('flow: gradient fill and a sheen that only runs while playing', () => {
    const css = compileProgress('flow')
    expect(css).toContain('oklch(from var(--is-active-fg-color, var(--sc-accent)) min(calc(l + 0.18), 0.95) c calc(h + 40))')
    const running = ruleFor(css, ':not(:has([data-testid="control-button-playpause"] :is(')
    expect(running).toContain('animation: sc-pb-sheen 2.5s')
    expect(css).toContain('to { translate: calc(var(--progress-bar-transform) - 65%) 0; }')
  })

  it('wave: masked sine that moves while playing and flattens when paused', () => {
    const css = compileProgress('wave')
    expect(css).toContain('mask-image: url("data:image/svg+xml,')
    expect(css).toContain('scale: 1 0.2 !important;')
    expect(css).toMatch(/:not\(:has\([^{]*\{\n {2}scale: 1 1 !important;\n {2}opacity: 1 !important;\n {2}animation: sc-pb-wave 1s linear infinite !important;/)
    expect(css).toContain('linear-gradient(90deg, transparent var(--progress-bar-transform), var(--bg-color) var(--progress-bar-transform))')
  })

  it('segments: track and fill cut into blocks, lit up to the whole block at the playhead, which blinks while playing', () => {
    const css = compileProgress('segments')
    const mask = 'mask-image: repeating-linear-gradient(90deg, #000 0 6px, transparent 6px 8px) !important;'
    expect(ruleFor(css, '[data-testid="progress-bar-background"]::before')).toContain(mask)
    const fill = ruleFor(css, 'div:has(+ [data-testid="progress-bar-handle"])')
    expect(fill).toContain(mask)
    expect(fill).toContain('clip-path: inset(0 calc(100% - round(up, var(--progress-bar-transform), 8px)) 0 0) !important;')
    expect(css).toContain('left: calc(round(up, var(--progress-bar-transform), 8px) - 8px) !important;')
    expect(css).toMatch(/:not\(:has\([^{]*::after \{\n {2}visibility: visible !important;\n {2}animation: sc-pb-seg-blink 1\.2s steps\(1\) infinite !important;/)
  })

  it('stripes: diagonal stripes over the played part that slide only while playing', () => {
    const css = compileProgress('stripes')
    expect(css).toContain('linear-gradient(135deg, oklch(from var(--is-active-fg-color, var(--sc-accent)) calc(l * 0.72) c h) 25%')
    expect(ruleFor(css, 'div:has(+ [data-testid="progress-bar-handle"])')).toContain(
      'clip-path: inset(-0px calc(100% - var(--progress-bar-transform) - 0px) -0px -0px) !important;',
    )
    expect(ruleFor(css, ':not(:has([data-testid="control-button-playpause"] :is(')).toContain('animation: sc-pb-stripes 1s linear infinite')
    expect(css).toContain('to { translate: 12px 0; }')
  })
})
