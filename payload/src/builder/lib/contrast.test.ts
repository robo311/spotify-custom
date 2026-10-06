import type { Palette } from '../../types'
import { contrastIssues, fixFor, formatRatio, issuesFor, pairsFor, type ContrastTools } from './contrast'

const palette: Palette = {
  background: '#000000',
  surface: '#111111',
  elevated: '#222222',
  text: '#ffffff',
  textSubdued: '#333333',
  accent: '#3574f0',
  onAccent: '#3a7af5',
  border: '#444444',
}

// Fake ratio: low when either colour is in the "bad" set, so tests don't depend on real contrast maths.
const bad = new Set(['#333333', '#3a7af5'])
const tools: ContrastTools = {
  pairs: [
    ['text', 'background'],
    ['textSubdued', 'background'],
    ['textSubdued', 'surface'],
    ['onAccent', 'accent'],
  ],
  ratio: (a, b) => (bad.has(a) || bad.has(b) ? (a === '#333333' && b === '#111111' ? 1.2 : 2.5) : 12),
  fix: () => '#fixed0',
}

describe('contrastIssues', () => {
  it('lists only pairs below 4.5:1', () => {
    const issues = contrastIssues(palette, tools)
    expect(issues.map(i => `${i.fg}/${i.bg}`)).toEqual(['textSubdued/background', 'textSubdued/surface', 'onAccent/accent'])
  })
})

describe('issuesFor', () => {
  it('finds issues where the key is foreground or background, worst first', () => {
    const issues = contrastIssues(palette, tools)
    expect(issuesFor('textSubdued', issues).map(i => i.bg)).toEqual(['surface', 'background'])
    expect(issuesFor('accent', issues).map(i => i.fg)).toEqual(['onAccent'])
    expect(issuesFor('border', issues)).toEqual([])
  })
})

describe('fixFor', () => {
  it('changes the foreground only', () => {
    const issue = contrastIssues(palette, tools)[0]
    expect(fixFor(palette, issue, tools)).toEqual({ textSubdued: '#fixed0' })
  })
})

describe('formatRatio', () => {
  it('rounds down so a failing pair never displays as passing', () => {
    expect(formatRatio(4.49)).toBe('4.4:1')
    expect(formatRatio(3)).toBe('3.0:1')
  })
})

describe('pairsFor', () => {
  it('lists passing and failing pairs for a key, worst first', () => {
    expect(pairsFor('textSubdued', palette, tools).map(p => [p.bg, p.ratio])).toEqual([
      ['surface', 1.2],
      ['background', 2.5],
    ])
    expect(pairsFor('text', palette, tools).map(p => p.ratio)).toEqual([12])
  })

  it('is empty for colours that are not checked', () => {
    expect(pairsFor('border', palette, tools)).toEqual([])
  })
})
