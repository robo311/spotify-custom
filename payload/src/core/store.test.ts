import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HelperState, Store, UpdateStatus } from '../types'
import { createBridge } from './bridge'
import { createMockHelper, type BridgeHandlers } from './mock-helper'
import { createStore, type StoreInternals } from './store'
import { PRESETS } from '../theme/presets'

let store: Store & StoreInternals

const themeCss = () => document.getElementById('sc-theme')?.textContent ?? ''
const savedState = () => createMockHelper(localStorage).getState(null)

beforeEach(async () => {
  vi.useFakeTimers()
  localStorage.clear()
  store = createStore(createBridge())
  await store.init()
})

afterEach(() => {
  store.dispose()
  vi.useRealTimers()
  document.head.replaceChildren()
})

describe('store', () => {
  it('starts on the default preset and applies it', () => {
    const s = store.get()
    expect(s).toMatchObject({ ready: true, activeIsPreset: true })
    expect(s.active.id).toBe('darcula')
    expect(themeCss()).toContain('--sc-background: #1e1f22')
  })

  it('forks a preset on first edit and saves the copy', async () => {
    store.edit(t => {
      t.palette.accent = '#ff0000'
    })
    const s = store.get()
    expect(s.activeIsPreset).toBe(false)
    expect(s.active).toMatchObject({ name: 'Darcula (my version)', basedOn: 'darcula' })
    expect(s.settings.activeTheme).toBe(s.active.id)
    expect(themeCss()).toContain('--sc-accent: #ff0000')
    await vi.runAllTimersAsync()
    expect(savedState().userThemes.map(t => t.palette.accent)).toEqual(['#ff0000'])
    expect(savedState().settings?.activeTheme).toBe(s.active.id)
  })

  it('collapses a colour drag into one undo step, and redo restores it', () => {
    for (const accent of ['#100000', '#200000', '#300000']) {
      store.edit(t => {
        t.palette.accent = accent
      }, { coalesceKey: 'accent' })
    }
    store.undo()
    expect(store.get().active.palette.accent).toBe(PRESETS[0].palette.accent)
    expect(store.get().canUndo).toBe(false)
    store.redo()
    expect(store.get().active.palette.accent).toBe('#300000')
  })

  it('ignores invalid edits without breaking state', () => {
    store.edit(t => {
      t.palette.text = 'not a colour'
    })
    expect(store.get().active.palette.text).toBe(PRESETS[0].palette.text)
  })

  it('switches themes, clearing undo history', () => {
    store.edit(t => {
      t.radius = 2
    })
    store.selectTheme('nord', { x: 1, y: 1 })
    expect(store.get()).toMatchObject({ canUndo: false, active: { id: 'nord' }, settings: { activeTheme: 'nord' } })
    expect(themeCss()).toContain('--sc-background: #2e3440')
  })

  it('previews instantly: no morph, no boot-cache write, no state change', () => {
    const nord = PRESETS.find(p => p.id === 'nord')
    if (!nord) throw new Error('missing preset')
    const cached = localStorage.getItem('sc:last-theme-css')
    store.preview(nord)
    expect(document.documentElement.classList.contains('sc-no-morph')).toBe(true)
    expect(localStorage.getItem('sc:last-theme-css')).toBe(cached)
    store.preview(null)
    expect(localStorage.getItem('sc:last-theme-css')).toBe(cached)
    expect(store.get().active.id).toBe('darcula')
  })

  it('exposes the save status: pending while a change is queued, local once saved to the mock; previews never change it', async () => {
    expect(store.get().saveStatus).toBe('pending') // first run: default settings are being written
    await vi.runAllTimersAsync()
    expect(store.get().saveStatus).toBe('local')
    const nord = PRESETS.find(p => p.id === 'nord')
    if (!nord) throw new Error('missing preset')
    store.preview(nord)
    await vi.advanceTimersByTimeAsync(0)
    expect(store.get().saveStatus).toBe('local')
    store.preview(null)
    store.edit(t => {
      t.radius = 3
    })
    expect(store.get().saveStatus).toBe('pending')
    const seen: string[] = []
    store.subscribe(s => seen.push(s.saveStatus))
    await vi.runAllTimersAsync()
    expect(store.get().saveStatus).toBe('local')
    expect(seen.at(-1)).toBe('local')
  })

  it('tracks library items with no-op-if-unchanged identity', () => {
    const fn = vi.fn()
    store.subscribe(fn)
    store.setLibraryItems([{ uri: 'spotify:user:u:folder:1', name: 'Chill', kind: 'folder' }])
    const first = store.get()
    store.setLibraryItems([{ uri: 'spotify:user:u:folder:1', name: 'Chill', kind: 'folder' }])
    expect(fn).toHaveBeenCalledTimes(1)
    expect(store.get()).toBe(first)
    expect(first.libraryItems).toEqual([{ uri: 'spotify:user:u:folder:1', name: 'Chill', kind: 'folder' }])
  })

  it('changes settings.artworkStyles identity only when folder styles change, and validates edits', () => {
    const uri = 'spotify:user:u:folder:1'
    const before = store.get().settings.artworkStyles
    store.setExtensionEnabled('stats', true)
    expect(store.get().settings.artworkStyles).toBe(before)
    store.editSettings(s => {
      s.artworkStyles[uri] = { icon: 'star', image: 'data:image/svg+xml;base64,PHN2Zz4=' }
    })
    const after = store.get().settings.artworkStyles
    expect(after).not.toBe(before)
    expect(after).toEqual({ [uri]: { icon: 'star' } })
    store.editSettings(s => {
      s.home.hidden = ['x']
    })
    expect(store.get().settings.artworkStyles).toBe(after)
  })

  it('tracks Now playing panel sections with the same identity semantics as shelves', () => {
    const fn = vi.fn()
    store.subscribe(fn)
    const sections = [{ key: 'lyrics', title: 'Lyrics' }]
    store.setPanelSections(sections)
    const first = store.get()
    store.setPanelSections([{ key: 'lyrics', title: 'Lyrics' }])
    expect(fn).toHaveBeenCalledTimes(1)
    expect(store.get()).toBe(first)
    expect(first.panelSections).toEqual(sections)
  })

  it('previews without changing state, then reverts', () => {
    const nord = PRESETS.find(p => p.id === 'nord')
    if (!nord) throw new Error('missing preset')
    store.preview(nord)
    expect(themeCss()).toContain('#2e3440')
    expect(store.get().active.id).toBe('darcula')
    store.preview(null)
    expect(themeCss()).toContain('--sc-background: #1e1f22')
  })

  it('keeps unchanged settings slices identical (cheap change detection)', () => {
    const before = store.get().settings
    store.setExtensionEnabled('stats', false)
    const after = store.get().settings
    expect(after).not.toBe(before)
    expect(after.home).toBe(before.home)
    expect(after.extensions).toEqual({ stats: false })
  })

  it('resets a fork back to its preset as an undoable step', () => {
    store.edit(t => {
      t.palette.accent = '#ff0000'
      t.name = 'Mine'
    })
    store.resetToPreset()
    expect(store.get().active.palette).toEqual(PRESETS[0].palette)
    expect(store.get().active.name).toBe('Mine')
    store.undo()
    expect(store.get().active.palette.accent).toBe('#ff0000')
  })

  it('exports and imports share codes as a new user theme', () => {
    store.selectTheme('sunset')
    const code = store.exportShareCode()
    const parsed = store.parseShareCode(code)
    store.importTheme(parsed)
    const s = store.get()
    expect(s.active).toMatchObject({ name: 'Sunset 2', basedOn: 'sunset' })
    expect(s.activeIsPreset).toBe(false)
  })

  it('saves as, renames and deletes user themes, falling back to the preset', async () => {
    store.saveAs('Night shift')
    const id = store.get().active.id
    store.renameTheme(id, 'Late shift')
    expect(store.get().active.name).toBe('Late shift')
    store.deleteTheme(id)
    expect(store.get().active.id).toBe('darcula')
    await vi.runAllTimersAsync()
    expect(savedState().userThemes).toEqual([])
  })

  it('notifies subscribers and stops after unsubscribe', () => {
    const fn = vi.fn()
    const off = store.subscribe(fn)
    store.setShelves([{ key: 'a', title: 'A', stable: true }])
    off()
    store.setShelves([])
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('restores the user theme from saved settings on the next start', async () => {
    store.selectTheme('forest')
    store.dispose()
    store = createStore(createBridge())
    await store.init()
    expect(store.get().active.id).toBe('forest')
  })
})

describe('store: helper update', () => {
  const AVAILABLE: UpdateStatus = { state: 'available', current: '0.1.0', latest: '0.2.0' }

  async function restart(handlers: Partial<BridgeHandlers>) {
    store.dispose()
    store = createStore(createBridge({ mock: { ...createMockHelper(localStorage), ...handlers } }))
    await store.init()
  }

  it('reports no update with the mock helper', () => {
    expect(store.get().update).toEqual({ state: 'none', current: 'dev' })
  })

  it('takes the update status from the helper state', async () => {
    await restart({ getState: () => ({ ...savedState(), version: '0.1.0', update: AVAILABLE }) })
    expect(store.get().update).toEqual(AVAILABLE)
  })

  it('defaults to no update for helpers that predate the field', async () => {
    const { update: _update, ...older } = { ...savedState(), version: '0.1.0' }
    // The helper is the trust boundary: an older one simply doesn't send `update`.
    await restart({ getState: () => older as HelperState })
    expect(store.get().update).toEqual({ state: 'none', current: '0.1.0' })
  })

  it('applies pushed statuses and notifies subscribers, skipping repeats', () => {
    const fn = vi.fn()
    store.subscribe(fn)
    store.setUpdate(AVAILABLE)
    store.setUpdate({ ...AVAILABLE })
    expect(store.get().update).toEqual(AVAILABLE)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('asks the helper to install and shows installing right away', async () => {
    const installUpdate = vi.fn(() => null)
    await restart({ installUpdate })
    store.setUpdate(AVAILABLE)
    store.installUpdate()
    expect(store.get().update).toEqual({ ...AVAILABLE, state: 'installing' })
    await vi.runAllTimersAsync()
    expect(installUpdate).toHaveBeenCalledOnce()
    expect(store.get().update.state).toBe('installing')
  })

  it('marks the update failed with the reason when the helper refuses', async () => {
    await restart({
      installUpdate: () => {
        throw new Error('Checksum mismatch')
      },
    })
    store.setUpdate(AVAILABLE)
    store.installUpdate()
    await vi.runAllTimersAsync()
    expect(store.get().update).toEqual({ ...AVAILABLE, state: 'failed', message: 'Checksum mismatch' })
  })
})
