import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { PARTS } from '../../parts'
import { PRESETS } from '../../theme/presets'
import type { AppState, Store } from '../../types'
import { BuilderContext, type UiSnapshot } from '../context'
import { observable } from '../lib/observable'
import { PartPopover } from './PartPopover'

const sync = (fn: () => void) => void act(fn)

describe('PartPopover', () => {
  it('links to all of the area’s settings, keeping the edits and leaving pick mode', () => {
    const part = PARTS.find(p => p.id === 'rightPanel')
    if (!part) throw new Error('no rightPanel part')
    const state = observable({ active: structuredClone(PRESETS[0]), activeIsPreset: true, userThemes: [], palette: {} } as unknown as AppState)
    const edit = vi.fn()
    const store = { get: () => state.get(), subscribe: (fn: (s: AppState) => void) => state.subscribe(fn), edit } as unknown as Store
    const host = document.createElement('div')
    document.body.append(host)
    const root = host.attachShadow({ mode: 'open' })
    const ui = observable<UiSnapshot>({ open: false, tab: 'look', picking: true, editingArtwork: null })
    const onDone = vi.fn()
    const anchor = { x: 10, y: 10, width: 200, height: 400 }
    sync(() => render(h(BuilderContext.Provider, { value: { store, ui, root } }, h(PartPopover, { part, anchor, onDone })), root))

    const link = [...root.querySelectorAll<HTMLElement>('button')].find(b => b.textContent.includes('More in Now playing'))
    expect(link).toBeDefined()
    sync(() => link?.click())
    expect(ui.get()).toMatchObject({ open: true, tab: 'nowplaying', focus: 'rightPanel', picking: false })
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(edit).not.toHaveBeenCalled()
    sync(() => render(null, root))
    host.remove()
  })
})
