// Word timing for the lyrics view. Pure. Spotify times most lyrics by line only, so words are estimated: a line is
// sung from its start for about as long as its text takes to sing (capped by the next line), each word taking a share
// by length. Lines with syllable timing use it instead.
import type { LyricLine, LyricSyllable } from '../spotify'

export interface TimedWord {
  /** The word with its trailing space, so the words of a line join back into its text. */
  text: string
  startMs: number
  endMs: number
}

export interface TimedLine {
  startMs: number
  endMs: number
  words: TimedWord[]
  /** A break with no words (Spotify's ♪ lines). */
  instrumental: boolean
}

/** Rough singing pace: ms per character of Latin script; CJK and Hangul characters are whole syllables. */
const MS_PER_CHAR = 75
const MS_PER_SYLLABLE_CHAR = 220
const MIN_LINE_MS = 700
/** A line with no next line and no song length. */
const LAST_LINE_MS = 5000
const SYLLABIC = /[ᄀ-ᇿ぀-ヿ㐀-鿿가-힯]/u

/** "aa bb" → ["aa ", "bb"]; leading spaces stay on the first word. */
function splitWords(text: string): string[] {
  return text.match(/\s*\S+\s*/gu) ?? []
}

function singMs(word: string): number {
  let ms = 0
  for (const ch of word.trim()) ms += SYLLABIC.test(ch) ? MS_PER_SYLLABLE_CHAR : MS_PER_CHAR
  return ms + MS_PER_CHAR // the gap after a word
}

function estimate(words: string[], startMs: number, endMs: number, ownEnd: boolean): TimedWord[] {
  const weights = words.map(singMs)
  const total = weights.reduce((a, b) => a + b, 0)
  // With its own end time the line is sung until then; otherwise only for as long as its words take.
  const span = ownEnd ? endMs - startMs : Math.min(endMs - startMs, Math.max(MIN_LINE_MS, total))
  let at = startMs
  return words.map((text, i) => {
    const start = at
    at = i === words.length - 1 ? startMs + span : at + (span * (weights.at(i) ?? 0)) / total
    return { text, startMs: Math.round(start), endMs: Math.round(at) }
  })
}

function fromSyllables(words: string[], syllables: LyricSyllable[], endMs: number): TimedWord[] {
  // The start of each character, from the syllable that covers it.
  const charStart: number[] = []
  for (const s of syllables) for (let i = 0; i < s.chars; i++) charStart.push(s.startMs)
  let pos = 0
  const starts = words.map(w => {
    const first = pos + (w.length - w.trimStart().length)
    pos += Array.from(w).length
    return charStart.at(first) ?? charStart.at(0) ?? 0
  })
  return words.map((text, i) => ({ text, startMs: starts.at(i) ?? 0, endMs: starts.at(i + 1) ?? endMs }))
}

/** Lines → timed lines. songMs (the song's length, if known) ends the last line. */
export function buildTimeline(lines: readonly LyricLine[], songMs: number | null): TimedLine[] {
  return lines.map((line, i) => {
    const next = lines.at(i + 1)?.startMs ?? (songMs && songMs > line.startMs ? songMs : line.startMs + LAST_LINE_MS)
    const ownEnd = line.endMs !== null && line.endMs > line.startMs
    const endMs = ownEnd && line.endMs !== null ? Math.min(line.endMs, Math.max(next, line.startMs + 1)) : next
    if (!line.text) return { startMs: line.startMs, endMs, words: [], instrumental: true }
    const words = splitWords(line.text)
    const timed = line.syllables ? fromSyllables(words, line.syllables, endMs) : estimate(words, line.startMs, Math.max(endMs, line.startMs + 1), ownEnd)
    return { startMs: line.startMs, endMs, words: timed, instrumental: false }
  })
}

/** Index of the line being sung at positionMs (the last one that has started), or -1 before the first. */
export function activeLineAt(timeline: readonly TimedLine[], positionMs: number): number {
  let lo = 0
  let hi = timeline.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if ((timeline.at(mid)?.startMs ?? Infinity) <= positionMs) {
      found = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  return found
}

/** How far through the word positionMs is, 0–1. */
export function wordProgress(word: TimedWord, positionMs: number): number {
  if (positionMs <= word.startMs) return 0
  if (positionMs >= word.endMs) return 1
  return (positionMs - word.startMs) / (word.endMs - word.startMs)
}
