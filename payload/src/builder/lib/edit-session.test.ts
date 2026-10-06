import type { Theme } from '../../types'
import { defaultEffects, defaultHomeStyle, defaultLayout, defaultPageStyle, defaultLyrics } from '../../theme/model'
import { capture, hasChanges, restore } from './edit-session'
import { partSlices } from './part-slices'
import { setHidden, setPartProp } from './theme-edits'

function theme(): Theme {
  return {
    schema: 1,
    id: 't',
    name: 'T',
    basedOn: null,
    palette: { background: '#000', surface: '#111', elevated: '#222', text: '#fff', textSubdued: '#aaa', accent: '#0af', onAccent: '#000', border: '#333' },
    font: 'inter',
    radius: 6,
    parts: { sidebar: { text: '#eeeeee' } },
    layout: defaultLayout(),
    icons: 'spotify',
    iconOverrides: {},
    homeStyle: defaultHomeStyle(),
    pageStyle: defaultPageStyle(),
    effects: defaultEffects(),
    lyrics: defaultLyrics(),
    css: '',
  }
}

describe('edit session over a part', () => {
  const slices = partSlices('progressBar')

  it('reports no changes until something in the part changes', () => {
    const t = theme()
    const snap = capture(t, slices)
    expect(hasChanges(t, slices, snap)).toBe(false)
    t.palette.accent = '#f00' // outside the part: not this session's business
    expect(hasChanges(t, slices, snap)).toBe(false)
    setPartProp('progressBar', 'radius', 4)(t)
    expect(hasChanges(t, slices, snap)).toBe(true)
  })

  it('restores style, visibility and extras exactly, leaving other parts alone', () => {
    const t = theme()
    const snap = capture(t, slices)
    setPartProp('progressBar', 'accent', '#ff0000')(t)
    setHidden('progressBar', true)(t)
    t.effects.progressBar = 'wave'
    setPartProp('sidebar', 'text', '#000000')(t)
    restore(slices, snap)(t)
    expect(t.parts.progressBar).toBeUndefined()
    expect(t.layout.hidden).not.toContain('progressBar')
    expect(t.effects.progressBar).toBe(defaultEffects().progressBar)
    expect(t.parts.sidebar).toEqual({ text: '#000000' })
    expect(hasChanges(t, slices, snap)).toBe(false)
  })

  it('restores a style that existed before the session', () => {
    const t = theme()
    const sidebar = partSlices('sidebar')
    const snap = capture(t, sidebar)
    setPartProp('sidebar', 'text', undefined)(t)
    restore(sidebar, snap)(t)
    expect(t.parts.sidebar).toEqual({ text: '#eeeeee' })
  })
})
