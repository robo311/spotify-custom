import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import type { Store } from '../../../types'
import { PRESETS } from '../../../theme/presets'
import { BuilderContext, type UiSnapshot } from '../../context'
import { observable } from '../../lib/observable'
import { ImportPanel } from './ImportPanel'

const sync = (fn: () => void) => void act(fn)

function mount() {
  const preview = vi.fn()
  const store = { parseShareCode: () => PRESETS[0], preview, importTheme: vi.fn() } as unknown as Store
  const host = document.createElement('div')
  const root = host.attachShadow({ mode: 'open' })
  const ui = observable<UiSnapshot>({ open: true, tab: 'themes', picking: false, editingArtwork: null })
  sync(() => render(h(BuilderContext.Provider, { value: { store, ui, root } }, h(ImportPanel, {})), root))
  return { root, ui, preview }
}

describe('ImportPanel', () => {
  it('stops previewing someone else’s theme when the studio closes (the panel stays mounted)', () => {
    const { root, ui, preview } = mount()
    const textarea = root.querySelector('textarea')
    if (!textarea) throw new Error('no textarea')
    textarea.value = 'SC1:abc'
    sync(() => textarea.dispatchEvent(new Event('input', { bubbles: true })))
    const previewButton = [...root.querySelectorAll('button')].find(b => b.textContent.includes('Preview'))
    sync(() => previewButton?.click())
    expect(preview).toHaveBeenLastCalledWith(PRESETS[0])

    sync(() => ui.set(s => ({ ...s, open: false })))
    expect(preview).toHaveBeenLastCalledWith(null)
    expect(root.querySelector('[aria-pressed="true"]')).toBeNull()
  })
})
