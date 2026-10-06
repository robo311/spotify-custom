import { afterEach, describe, expect, it } from 'vitest'
import { PLAYING_ROW_ATTR } from './track-list-look'
import { markPlayingRows } from './playing-row'

afterEach(() => {
  document.body.innerHTML = ''
})

function list(testid: string, uris: string[]): void {
  document.body.innerHTML = `<div id="main-view"><div data-testid="${testid}">${uris
    .map((u, i) => `<div role="row" aria-rowindex="${i + 2}" data-uri="${u}"><div data-testid="tracklist-row"></div></div>`)
    .join('')}</div></div>`
}
const uriOf = (row: Element) => row.getAttribute('data-uri')
const marked = () => [...document.querySelectorAll(`[${PLAYING_ROW_ATTR}]`)].map(uriOf)

describe('markPlayingRows', () => {
  it("marks the playing song's row by its track, whatever it is playing from", () => {
    list('track-list', ['spotify:track:a', 'spotify:track:b'])
    markPlayingRows('spotify:track:b', uriOf)
    expect(marked()).toEqual(['spotify:track:b'])
  })

  it('says when the playing song is paused', () => {
    list('track-list', ['spotify:track:a'])
    markPlayingRows('spotify:track:a', uriOf, true)
    expect(document.querySelector(`[${PLAYING_ROW_ATTR}]`)?.getAttribute(PLAYING_ROW_ATTR)).toBe('paused')
    markPlayingRows('spotify:track:a', uriOf, false)
    expect(document.querySelector(`[${PLAYING_ROW_ATTR}]`)?.getAttribute(PLAYING_ROW_ATTR)).toBe('')
  })

  it('moves the mark when the song changes, and clears it when nothing plays', () => {
    list('playlist-tracklist', ['spotify:track:a', 'spotify:track:b'])
    markPlayingRows('spotify:track:a', uriOf)
    markPlayingRows('spotify:track:b', uriOf)
    expect(marked()).toEqual(['spotify:track:b'])
    markPlayingRows(null, uriOf)
    expect(marked()).toEqual([])
  })
})
