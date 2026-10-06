import { describe, expect, it } from 'vitest'
import type { Palette } from '../types'
import { autoLyricLines, cssMix, resolveLyricLines } from './lyric-colors'

const P: Palette = {
  background: '#101010', surface: '#202020', elevated: '#303030', text: '#f0f0f0',
  textSubdued: '#a0a0a0', accent: '#3574f0', onAccent: '#ffffff', border: '#404040',
}
const hexMix = (a: string, b: string, t: number) => `mix(${a},${b},${t})`

describe('autoLyricLines', () => {
  it('derives theme lines from text, subdued text and background', () => {
    expect(autoLyricLines('theme', P, hexMix)).toEqual({
      activeLine: '#f0f0f0', inactiveLine: '#a0a0a0', pastLine: 'mix(#f0f0f0,#101010,0.35)',
    })
  })

  it('uses onAccent shades on the accent background', () => {
    expect(autoLyricLines('accent', P, hexMix).activeLine).toBe('#ffffff')
    expect(autoLyricLines('accent', P, hexMix).inactiveLine).toBe('mix(#ffffff,#3574f0,0.55)')
  })

  it('renders mixes as CSS by default', () => {
    expect(autoLyricLines('theme', P).pastLine).toBe('color-mix(in srgb, #f0f0f0 65%, #101010)')
    expect(cssMix('a', 'b', 0.55)).toBe('color-mix(in srgb, a 45%, b)')
  })
})

describe('resolveLyricLines', () => {
  it('prefers chosen colours', () => {
    const lines = resolveLyricLines({ background: 'cover-blur', fontScale: 1, font: 'theme', align: 'left', pastLine: '#123' }, P)
    expect(lines).toEqual({ activeLine: '#ffffff', inactiveLine: '#8c8c8c', pastLine: '#123' })
  })
})
