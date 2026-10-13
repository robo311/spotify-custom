import { describe, expect, it } from 'vitest'
import { parseLyrics, trackIdOf } from './lyrics'

// Trimmed from a live color-lyrics response (Spotify 1.3.4.258, MusixMatch).
const LINE_SYNCED = {
  lyrics: {
    syncType: 'LINE_SYNCED',
    lines: [
      { startTimeMs: '7130', words: '이 길로 갈게', syllables: [], endTimeMs: '0', transliteratedWords: '' },
      { startTimeMs: '9400', words: 'We gotta see above, okay', syllables: [], endTimeMs: '0' },
      { startTimeMs: '12000', words: '♪', syllables: [], endTimeMs: '0' },
      { startTimeMs: '30000', words: '', syllables: [], endTimeMs: '0' },
    ],
    provider: 'MusixMatch',
    providerDisplayName: 'Musixmatch',
  },
}

describe('parseLyrics', () => {
  it('reads line-synced lyrics; ♪ and empty lines are instrumental breaks', () => {
    const lyrics = parseLyrics(LINE_SYNCED)
    expect(lyrics?.synced).toBe(true)
    expect(lyrics?.provider).toBe('Musixmatch')
    expect(lyrics?.lines).toEqual([
      { startMs: 7130, endMs: null, text: '이 길로 갈게', syllables: null },
      { startMs: 9400, endMs: null, text: 'We gotta see above, okay', syllables: null },
      { startMs: 12000, endMs: null, text: '', syllables: null },
      { startMs: 30000, endMs: null, text: '', syllables: null },
    ])
  })

  it('keeps syllable timing only when it covers the line text exactly', () => {
    const lyrics = parseLyrics({
      lyrics: {
        syncType: 'SYLLABLE_SYNCED',
        lines: [
          {
            startTimeMs: '1000',
            endTimeMs: '2000',
            words: 'Hello you',
            syllables: [
              { startTimeMs: '1000', numChars: '3' },
              { startTimeMs: '1300', numChars: 3 },
              { startTimeMs: '1600', numChars: '3' },
            ],
          },
          { startTimeMs: '3000', words: 'Bad sum', syllables: [{ startTimeMs: '3000', numChars: '2' }] },
        ],
      },
    })
    expect(lyrics?.lines[0]).toEqual({
      startMs: 1000,
      endMs: 2000,
      text: 'Hello you',
      syllables: [
        { startMs: 1000, chars: 3 },
        { startMs: 1300, chars: 3 },
        { startMs: 1600, chars: 3 },
      ],
    })
    expect(lyrics?.lines[1]?.syllables).toBeNull()
  })

  it('marks unsynced lyrics and rejects anything that is not lyrics', () => {
    expect(parseLyrics({ lyrics: { syncType: 'UNSYNCED', lines: [{ startTimeMs: '0', words: 'a' }] } })?.synced).toBe(false)
    expect(parseLyrics({ lyrics: { syncType: 'LINE_SYNCED', lines: [] } })).toBeNull()
    expect(parseLyrics({})).toBeNull()
    expect(parseLyrics('nope')).toBeNull()
  })
})

describe('trackIdOf', () => {
  it('takes the id of a track uri only', () => {
    expect(trackIdOf('spotify:track:2nopDUxom21JoMzFXj9wS0')).toBe('2nopDUxom21JoMzFXj9wS0')
    expect(trackIdOf('spotify:episode:2nopDUxom21JoMzFXj9wS0')).toBeNull()
    expect(trackIdOf('spotify:track:../x')).toBeNull()
  })
})
