import type { Theme } from '../../types'
import { defaultEffects, defaultHomeStyle, defaultLayout, defaultPageStyle, defaultLyrics } from '../../theme/model'
import { isPartEdited, resetPart, setHidden, setPaletteColor, setPartProp } from './theme-edits'

function theme(): Theme {
  return {
    schema: 1,
    id: 't',
    name: 'T',
    basedOn: null,
    palette: { background: '#000', surface: '#111', elevated: '#222', text: '#fff', textSubdued: '#aaa', accent: '#0af', onAccent: '#000', border: '#333' },
    font: 'inter',
    radius: 6,
    parts: {},
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

describe('theme edits', () => {
  it('sets a palette colour', () => {
    const t = theme()
    setPaletteColor('accent', '#ff0000')(t)
    expect(t.palette.accent).toBe('#ff0000')
  })

  it('adds and removes part properties, dropping empty parts', () => {
    const t = theme()
    setPartProp('playerBar', 'radius', 8)(t)
    expect(t.parts.playerBar).toEqual({ radius: 8 })
    expect(isPartEdited(t, 'playerBar')).toBe(true)
    setPartProp('playerBar', 'radius', undefined)(t)
    expect(t.parts).toEqual({})
    expect(isPartEdited(t, 'playerBar')).toBe(false)
  })

  it('hides and shows without duplicates', () => {
    const t = theme()
    setHidden('sidebar', true)(t)
    setHidden('sidebar', true)(t)
    expect(t.layout.hidden).toEqual(['sidebar'])
    expect(isPartEdited(t, 'sidebar')).toBe(true)
    setHidden('sidebar', false)(t)
    expect(t.layout.hidden).toEqual([])
  })

  it('resets a part completely', () => {
    const t = theme()
    setPartProp('sidebar', 'text', '#fff')(t)
    setHidden('sidebar', true)(t)
    resetPart('sidebar')(t)
    expect(isPartEdited(t, 'sidebar')).toBe(false)
  })
})
