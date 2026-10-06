import { convertPaint, formatPaint, parsePaint } from './paint'

describe('parsePaint', () => {
  it('reads solid colours', () => {
    expect(parsePaint('#ABC')).toEqual({ kind: 'solid', color: '#aabbcc' })
  })

  it('reads the gradients the builder writes', () => {
    expect(parsePaint('linear-gradient(135deg, #111111, #222222)')).toEqual({ kind: 'gradient', from: '#111111', to: '#222222', angle: 135 })
  })

  it('keeps anything else as custom CSS', () => {
    const css = 'radial-gradient(circle, red, blue)'
    expect(parsePaint(css)).toEqual({ kind: 'custom', css })
  })
})

describe('formatPaint', () => {
  it.each(['#123456', 'linear-gradient(90deg, #111111, #222222)', 'url(x.png)'])('round-trips %s', paint => {
    expect(formatPaint(parsePaint(paint))).toBe(paint)
  })
})

describe('convertPaint', () => {
  it('turns a solid into a gradient starting from the same colour', () => {
    expect(convertPaint({ kind: 'solid', color: '#111111' }, 'gradient', '#000000')).toEqual({ kind: 'gradient', from: '#111111', to: '#000000', angle: 180 })
  })

  it('turns a gradient into a solid of its first colour', () => {
    expect(convertPaint({ kind: 'gradient', from: '#111111', to: '#222222', angle: 90 }, 'solid', '#000000')).toEqual({ kind: 'solid', color: '#111111' })
  })

  it('replaces custom CSS with the fallback colour', () => {
    expect(convertPaint({ kind: 'custom', css: 'url(x)' }, 'solid', '#000000')).toEqual({ kind: 'solid', color: '#000000' })
  })
})
