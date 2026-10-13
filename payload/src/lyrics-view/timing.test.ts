import { describe, expect, it } from 'vitest'
import type { LyricLine } from '../spotify'
import { activeLineAt, buildTimeline, wordProgress } from './timing'

const line = (startMs: number, text: string, extra: Partial<LyricLine> = {}): LyricLine => ({ startMs, endMs: null, text, syllables: null, ...extra })

describe('buildTimeline', () => {
  it('spreads an estimated line over its words by length, starting with the line', () => {
    const [first] = buildTimeline([line(1000, 'aa bbbb'), line(60_000, 'next')], null)
    expect(first.words.map(w => w.text)).toEqual(['aa ', 'bbbb'])
    const [a, b] = first.words
    expect(a.startMs).toBe(1000)
    expect(b.startMs).toBe(a.endMs)
    // a long gap before the next line doesn't stretch the singing over it
    expect(b.endMs).toBeLessThan(5000)
    // longer words take longer
    expect(b.endMs - b.startMs).toBeGreaterThan(a.endMs - a.startMs)
  })

  it('never runs a line past the next one', () => {
    const [first] = buildTimeline([line(1000, 'a very long line with many many words in it'), line(1500, 'next')], null)
    expect(first.words.at(-1)?.endMs).toBe(1500)
    expect(first.endMs).toBe(1500)
  })

  it("uses the line's own end when Spotify gives one", () => {
    const [first] = buildTimeline([line(1000, 'one two', { endMs: 9000 }), line(20_000, 'x')], null)
    expect(first.words.at(-1)?.endMs).toBe(9000)
  })

  it('times words from syllables when the line has them', () => {
    const syllables = [
      { startMs: 1000, chars: 3 },
      { startMs: 1300, chars: 3 },
      { startMs: 1600, chars: 3 },
    ]
    const [first] = buildTimeline([line(1000, 'Hello you', { endMs: 2000, syllables })], null)
    expect(first.words).toEqual([
      { text: 'Hello ', startMs: 1000, endMs: 1600 },
      { text: 'you', startMs: 1600, endMs: 2000 },
    ])
  })

  it('keeps instrumental breaks as wordless lines up to the next line (or the end of the song)', () => {
    const timeline = buildTimeline([line(0, ''), line(8000, 'go'), line(9000, '')], 15_000)
    expect(timeline[0]).toMatchObject({ startMs: 0, endMs: 8000, words: [], instrumental: true })
    expect(timeline[2]).toMatchObject({ startMs: 9000, endMs: 15_000, instrumental: true })
  })
})

describe('activeLineAt', () => {
  const timeline = buildTimeline([line(1000, 'a'), line(2000, 'b'), line(3000, 'c')], null)
  it('is the last line that has started', () => {
    expect(activeLineAt(timeline, 500)).toBe(-1)
    expect(activeLineAt(timeline, 1000)).toBe(0)
    expect(activeLineAt(timeline, 2999)).toBe(1)
    expect(activeLineAt(timeline, 99_999)).toBe(2)
  })
})

describe('wordProgress', () => {
  it('runs 0 → 1 across the word', () => {
    const word = { text: 'x', startMs: 1000, endMs: 2000 }
    expect(wordProgress(word, 500)).toBe(0)
    expect(wordProgress(word, 1500)).toBe(0.5)
    expect(wordProgress(word, 2500)).toBe(1)
  })
})
