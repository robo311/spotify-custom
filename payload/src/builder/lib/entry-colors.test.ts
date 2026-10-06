import type { Palette } from '../../types'
import { contrastRatio } from '../../theme/palette'
import { entryDotColors } from './entry-colors'

const darcula: Palette = {
  background: '#1e1f22',
  surface: '#2b2d30',
  elevated: '#393b40',
  text: '#dfe1e5',
  textSubdued: '#a8adb5',
  accent: '#548af7',
  onAccent: '#0b1220',
  border: '#43454a',
}

describe('entryDotColors', () => {
  it('starts with accent and text, then the visible spare colours', () => {
    const dots = entryDotColors(darcula, contrastRatio)
    expect(dots.slice(0, 3)).toEqual(['#548af7', '#dfe1e5', '#a8adb5'])
  })

  it('fills gaps with accent neighbours rather than near-invisible surfaces', () => {
    const dots = entryDotColors(darcula, contrastRatio)
    expect(dots).toHaveLength(4)
    expect(dots).not.toContain(darcula.border)
    expect(dots).not.toContain(darcula.onAccent)
  })

  it('always gives four distinct colours', () => {
    const flat = { ...darcula, textSubdued: darcula.text, onAccent: darcula.text, elevated: darcula.background }
    const dots = entryDotColors(flat, contrastRatio)
    expect(dots).toHaveLength(4)
    expect(new Set(dots.map(c => c.toLowerCase())).size).toBe(4)
  })
})
