import { afterEach, describe, expect, it } from 'vitest'
import * as S from './selectors'
import { filterable, splitSelectorList } from './state-selectors'

const ATTRS = [...S.LYRICS_OPEN_STATES, ...S.LYRICS_CLOSING_STATES, ...S.RIGHT_PANEL_STATES, '[data-cinema-npv-preenter]'].map(a => a.slice(1, -1))

/** Selectors in the shapes the parts code writes them. */
const SHAPES = [
  `${S.LYRICS_VIEW_OPEN} #main-view`,
  `${S.LYRICS_VIEW_CLOSING} #main-view`,
  `${S.LYRICS_VIEW_OPEN}${S.RIGHT_PANEL_OPEN} #main-view`,
  `${S.LYRICS_VIEW_OPEN}:not(${S.RIGHT_PANEL_OPEN}) #main-view`,
  `${S.LYRICS_VIEW_OPEN}[data-sc-x]:not(${S.RIGHT_PANEL_OPEN}) #main-view`,
  `:is(#nothing, ${S.LYRICS_VIEW_OPEN} #main-view)`,
  `${S.LYRICS_VIEW_OPEN} :is(#main-view, #other), #always`,
]
// happy-dom matches `:not(<complex selector>)` wrongly (true where Chrome says false), so negated shapes are checked
// as text below; the full set was compared in Chrome once (2026-10-16, every state combination: identical).

afterEach(() => {
  for (const a of [...document.documentElement.attributes]) if (a.name !== 'lang') document.documentElement.removeAttribute(a.name)
  document.body.replaceChildren()
})

describe('state selectors', () => {
  it('match exactly what they matched before, in every state', () => {
    document.body.innerHTML = '<div id="main-view"></div><div id="always"></div>'
    const target = document.getElementById('main-view')
    const always = document.getElementById('always')
    // Every single state, plus every state with each right-panel state.
    const states: string[][] = [[], ...ATTRS.map(a => [a])]
    for (const a of ATTRS) for (const r of S.RIGHT_PANEL_STATES) states.push([a, r.slice(1, -1)])
    for (const state of states) {
      for (const a of state) document.documentElement.setAttribute(a, '')
      document.documentElement.toggleAttribute('data-sc-x', state.length % 2 === 0)
      for (const shape of SHAPES) {
        const expanded = filterable(shape)
        expect(target?.matches(expanded), `${shape} in [${state.join(' ')}]`).toBe(target?.matches(shape))
        expect(always?.matches(expanded)).toBe(always?.matches(shape))
      }
      for (const a of state) document.documentElement.removeAttribute(a)
    }
  })

  it('spells positive states out per attribute, leaving negated ones alone', () => {
    const out = filterable(`${S.LYRICS_VIEW_OPEN}${S.RIGHT_PANEL_OPEN} #main-view`)
    expect(splitSelectorList(out)).toHaveLength(S.LYRICS_OPEN_STATES.length * S.RIGHT_PANEL_STATES.length)
    expect(out).not.toContain(':root:is(')
    expect(out).toContain(':root[data-cinema-npv-postenter][data-right-sidebar-open-preexit] #main-view')
    const negated = filterable(`#main-view:not(${S.LYRICS_VIEW_OPEN} *)`)
    expect(negated).toBe(`#main-view:not(${S.LYRICS_VIEW_OPEN} *)`)
  })

  it('leaves other selectors untouched', () => {
    expect(filterable('#main-view > div:has(> img)')).toBe('#main-view > div:has(> img)')
  })

  it('splits lists only at top-level commas', () => {
    expect(splitSelectorList('a:is(b, c), [x="1,2"], d')).toEqual(['a:is(b, c)', '[x="1,2"]', 'd'])
  })
})
