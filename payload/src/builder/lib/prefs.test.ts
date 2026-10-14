import { loadPrefs } from './prefs'

afterEach(() => localStorage.clear())

describe('loadPrefs', () => {
  it('reopens the last tab', () => {
    localStorage.setItem('sc:builder', JSON.stringify({ tab: 'player' }))
    expect(loadPrefs().tab).toBe('player')
  })

  it('opens Themes when the saved tab no longer exists', () => {
    localStorage.setItem('sc:builder', JSON.stringify({ tab: 'parts' }))
    expect(loadPrefs().tab).toBe('themes')
  })
})
