import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { loadPrefs } from '../../lib/prefs'
import { useRecentColors } from './use-recent-colors'

const sync = (fn: () => void) => void act(fn)

describe('useRecentColors', () => {
  beforeEach(() => localStorage.clear())

  it('remembers the last colour even if the picker closes before it settles', () => {
    let remember: (hex: string) => void = () => undefined
    function Probe() {
      remember = useRecentColors()[1]
      return null
    }
    const el = document.createElement('div')
    sync(() => render(h(Probe, {}), el))
    remember('#123456')
    sync(() => render(null, el))
    expect(loadPrefs().recentColors).toEqual(['#123456'])
  })
})
