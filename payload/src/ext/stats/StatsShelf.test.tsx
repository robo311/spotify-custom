import { render } from 'preact'
import { act } from 'preact/test-utils'
import type { ExtensionContext, HomeStyle, Theme } from '../../types'
import { defaultHomeStyle } from '../../theme/model'
import { createTopContentSource } from './data'
import { topContentResponse } from './fixtures'
import { StatsShelf } from './StatsShelf'

function fakeCtx(query: ExtensionContext['spotify']['query'], look: Partial<HomeStyle>) {
  const saved = new Map<string, unknown>()
  const navigate = vi.fn<(path: string) => void>()
  let theme = { homeStyle: { ...defaultHomeStyle(), ...look } } as Theme
  const listeners = new Set<(t: Theme) => void>()
  const ctx = {
    navigate,
    spotify: { query },
    settings: { get: (key: string) => saved.get(key), set: (key: string, value: unknown) => saved.set(key, value) },
    theme: {
      get: () => theme,
      subscribe: (fn: (t: Theme) => void) => {
        listeners.add(fn)
        return () => listeners.delete(fn)
      },
    },
  } as unknown as ExtensionContext
  const setLook = (next: Partial<HomeStyle>) => {
    theme = { homeStyle: { ...theme.homeStyle, ...next } } as Theme
    for (const fn of listeners) fn(theme)
  }
  return { ctx, navigate, saved, setLook }
}

async function mount(query: ExtensionContext['spotify']['query'], look: Partial<HomeStyle> = {}) {
  const { ctx, navigate, saved, setLook } = fakeCtx(query, look)
  const el = document.createElement('div')
  document.body.append(el)
  await act(async () => {
    render(<StatsShelf ctx={ctx} source={createTopContentSource(query)} />, el)
    await Promise.resolve()
  })
  const root = () => el.querySelector('[data-sc-state]')
  return { el, root, navigate, saved, setLook }
}

/** Clicks an element that must exist (fails the test clearly if it doesn't). */
function click(el: Element | null | undefined) {
  if (!(el instanceof HTMLElement)) throw new Error('element to click not found')
  el.click()
}

const flush = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })

describe('StatsShelf', () => {
  it('shows loading, then five ranked artists with #1 as hero', async () => {
    let resolve: (value: unknown) => void = () => undefined
    const { root } = await mount(() => new Promise(r => { resolve = r }))
    expect(root()?.getAttribute('data-sc-state')).toBe('loading')
    // The selected option styles itself via aria-checked (no measured overlay), so it's readable while loading too.
    const checked = [...(root()?.querySelectorAll('[role="radio"][aria-checked="true"]') ?? [])].map(b => b.textContent)
    expect(checked).toEqual(['Artists', '4 weeks'])

    await act(async () => { resolve(topContentResponse(5)); await Promise.resolve() })
    await flush()
    expect(root()?.getAttribute('data-sc-state')).toBe('ready')
    const items = root()?.querySelectorAll('[data-sc-item]') ?? []
    expect(items).toHaveLength(5)
    expect(items[0]?.classList.contains('sc-hero')).toBe(true)
    expect(items[0]?.textContent).toContain('Your #1 artist · last 4 weeks')
  })

  it('switches to tracks and remembers the choice', async () => {
    const { el, root, saved } = await mount(() => Promise.resolve(topContentResponse(3)))
    await flush()
    const tracksButton = [...el.querySelectorAll('button[role="radio"]')].find(b => b.textContent === 'Tracks')
    await act(async () => { click(tracksButton); await Promise.resolve() })
    expect(root()?.querySelector('[data-sc-item]')?.getAttribute('data-sc-item')).toBe('spotify:track:track1')
    expect(saved.get('kind')).toBe('tracks')
  })

  it('navigates in-app when an item is clicked', async () => {
    const { root, navigate } = await mount(() => Promise.resolve(topContentResponse(2)))
    await flush()
    await act(async () => { click(root()?.querySelector('[data-sc-item]')); await Promise.resolve() })
    expect(navigate).toHaveBeenCalledWith('/artist/artist1')
  })

  it('shows the empty state when there is no history for the range', async () => {
    const { root } = await mount(() => Promise.resolve(topContentResponse(0)))
    await flush()
    expect(root()?.getAttribute('data-sc-state')).toBe('empty')
  })

  it('degrades to "unavailable" with a working retry', async () => {
    const query = vi.fn<ExtensionContext['spotify']['query']>().mockRejectedValueOnce(new Error('changed')).mockResolvedValue(topContentResponse(1))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { el, root } = await mount(query)
    await flush()
    expect(root()?.getAttribute('data-sc-state')).toBe('unavailable')

    await act(async () => { click(el.querySelector('.sc-ghost')); await Promise.resolve() })
    await flush()
    expect(root()?.getAttribute('data-sc-state')).toBe('ready')
    warn.mockRestore()
  })

  it('shows ten items when the theme asks for ten', async () => {
    const { root } = await mount(() => Promise.resolve(topContentResponse(10)), { statsCount: 10 })
    await flush()
    expect(root()?.querySelectorAll('[data-sc-item]')).toHaveLength(10)
    expect(root()?.getAttribute('data-sc-count')).toBe('10')
  })

  it('shows five of ten by default', async () => {
    const { root } = await mount(() => Promise.resolve(topContentResponse(10)))
    await flush()
    expect(root()?.querySelectorAll('[data-sc-item]')).toHaveLength(5)
  })

  it('lays items out as cards or as a compact list', async () => {
    const { root } = await mount(() => Promise.resolve(topContentResponse(5)), { statsLayout: 'grid' })
    await flush()
    expect(root()?.querySelector('.sc-hero')).toBeNull()
    expect(root()?.querySelectorAll('.sc-cards [data-sc-item]')).toHaveLength(5)
    expect(root()?.getAttribute('data-sc-layout')).toBe('grid')
  })

  it('follows theme changes live and exposes rank and glow switches for styling', async () => {
    const { root, setLook } = await mount(() => Promise.resolve(topContentResponse(5)))
    await flush()
    expect(root()?.querySelector('.sc-hero')).not.toBeNull()
    await act(async () => {
      setLook({ statsLayout: 'list', statsRanks: false, statsGlow: false })
      await Promise.resolve()
    })
    expect(root()?.querySelector('.sc-hero')).toBeNull()
    expect(root()?.querySelectorAll('.sc-list [data-sc-item]')).toHaveLength(5)
    expect(root()?.getAttribute('data-sc-ranks')).toBe('false')
    expect(root()?.getAttribute('data-sc-glow')).toBe('false')
  })
})
