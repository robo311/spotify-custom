import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import type { AppState, Store, Theme } from '../../types'
import { BuilderContext, type UiSnapshot } from '../context'
import { observable } from '../lib/observable'
import { AdvancedTab } from './AdvancedTab'

const sync = (fn: () => void) => void act(fn)

describe('AdvancedTab', () => {
  it('applies the last CSS keystrokes even if the tab closes before the debounce', () => {
    const theme = { css: '' } as Theme
    const state = observable({ active: theme, extensions: [], helper: { connected: false } } as unknown as AppState)
    const edit = vi.fn((fn: (t: Theme) => void) => fn(theme))
    const store = { get: () => state.get(), subscribe: (fn: (s: AppState) => void) => state.subscribe(fn), edit } as unknown as Store
    const host = document.createElement('div')
    const root = host.attachShadow({ mode: 'open' })
    const ui = observable<UiSnapshot>({ open: true, tab: 'advanced', picking: false, editingArtwork: null })
    sync(() => render(h(BuilderContext.Provider, { value: { store, ui, root } }, h(AdvancedTab, {})), root))
    const textarea = root.querySelector('textarea')
    if (!textarea) throw new Error('no textarea')
    textarea.value = 'a { color: red }'
    sync(() => textarea.dispatchEvent(new Event('input', { bubbles: true })))
    sync(() => render(null, root))
    expect(edit).toHaveBeenCalledTimes(1)
    expect(theme.css).toBe('a { color: red }')
  })
})
