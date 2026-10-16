import { mountSpotifySearch } from '../fixtures/spotify-search'
import { peekSearch } from './search-peek'

function spotify() {
  const { input, isOpen } = mountSpotifySearch()
  document.body.insertAdjacentHTML('beforeend', '<button id="spotify-button"></button>')
  const host = document.createElement('div')
  document.body.append(host)
  const studio = host.attachShadow({ mode: 'open' })
  const control = document.createElement('button')
  studio.append(control)
  return { input, studio, control, open: isOpen }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('peekSearch', () => {
  it('opens the suggestions and hands focus back to the studio control that had it', () => {
    const s = spotify()
    s.control.focus()
    const peek = peekSearch(s.studio)
    peek.open()
    expect(s.open()).toBe(true)
    expect(s.studio.activeElement).toBe(s.control)
    peek.close()
  })

  it('stays open while you use the studio, and closes when let go', () => {
    const s = spotify()
    const peek = peekSearch(s.studio)
    peek.open()
    s.input.focus()
    s.control.focus()
    expect(s.open()).toBe(true)
    peek.close()
    expect(s.open()).toBe(false)
    expect(s.studio.activeElement).toBe(s.control)
  })

  it('opens again after Spotify closed it, and leaves it open when you are typing in the search box', () => {
    const s = spotify()
    const peek = peekSearch(s.studio)
    peek.open()
    s.input.focus()
    document.getElementById('spotify-button')?.focus()
    expect(s.open()).toBe(false)
    peek.open()
    expect(s.open()).toBe(true)
    s.input.focus()
    peek.close()
    expect(s.open()).toBe(true)
    expect(document.activeElement).toBe(s.input)
  })

  it('ignores being asked again while it moves focus (the studio hears that focus too)', () => {
    const s = spotify()
    const peek = peekSearch(s.studio)
    const focus = vi.spyOn(s.input, 'focus')
    s.studio.addEventListener('focusin', () => peek.open())
    s.input.addEventListener('focus', () => document.querySelector('[data-testid="search-dropdown"]')?.remove()) // renders later
    peek.open()
    expect(focus).toHaveBeenCalledTimes(1)
    peek.close()
  })

  it('still closes them when the studio has already gone (closing the studio), leaving focus out of the search box', () => {
    const s = spotify()
    const peek = peekSearch(s.studio)
    peek.open()
    s.studio.host.remove()
    peek.close()
    expect(s.open()).toBe(false)
    expect(document.activeElement).not.toBe(s.input)
    expect(document.querySelector('[tabindex="-1"]')).toBeNull()
  })

  it('does nothing without a search box', () => {
    const host = document.createElement('div')
    const peek = peekSearch(host.attachShadow({ mode: 'open' }))
    expect(() => {
      peek.open()
      peek.close()
    }).not.toThrow()
  })
})
