import { afterEach, describe, expect, it, vi } from 'vitest'
import type { HomeConfig, ShelfInfo } from '../types'
import { startHome, type HomeController } from './controller'
import { mountHome } from './fixtures'

let controller: HomeController | undefined
afterEach(() => {
  controller?.dispose()
  controller = undefined
  document.body.innerHTML = ''
})

function start(config: HomeConfig = { hidden: [], order: [] }) {
  const reports: ShelfInfo[][] = []
  const current = { config }
  controller = startHome({ getConfig: () => current.config, onShelves: s => reports.push(s) })
  return { controller, reports, current }
}

describe('startHome', () => {
  it('marks linkable shelves and reports them in DOM order', () => {
    mountHome()
    const { reports } = start()
    expect(reports.at(-1)?.map(s => s.key)).toEqual([
      '/section/0JQ5DAnM3wGh0gz1MXnukA',
      '/recents',
      'first:/playlist/37i9dQZF1E8abc',
    ])
    expect(document.querySelectorAll('[data-sc-shelf-key]')).toHaveLength(3)
  })

  it('applies config through one style element and refreshes on demand', () => {
    mountHome()
    const { controller, current } = start()
    expect(document.querySelectorAll('#sc-home')).toHaveLength(1)
    current.config = { hidden: ['/recents'], order: [] }
    controller.refresh()
    expect(document.getElementById('sc-home')?.textContent).toContain('display: none')
  })

  it('mounts extension shelves in an open shadow root before native shelves', () => {
    const container = mountHome()
    const { controller, reports } = start()
    const render = vi.fn((el: HTMLElement) => {
      el.textContent = 'stats'
    })
    controller.addShelf({ id: 'stats', title: 'Your listening', render })

    const host = container.querySelector('[data-sc-shelf-key="ext:stats"]')
    expect(host?.nextElementSibling?.getAttribute('data-testid')).toBe('component-shelf')
    expect(host?.shadowRoot?.textContent).toContain('stats')
    expect(render).toHaveBeenCalledOnce()
    expect(reports.at(-1)?.[0]).toEqual({ key: 'ext:stats', title: 'Your listening', stable: true })
  })

  it("keys Spotify's new-release block (no component-shelf id, artist link changes) as one stable shelf, after ours", () => {
    const container = mountHome()
    const release = document.createElement('section')
    release.innerHTML =
      '<div data-testid="rich-title-row-shelf-header"><p>New release from</p><h2><a data-testid="see-all-link" href="/artist/1">Artist</a></h2></div>' +
      '<a data-encore-id="box" href="album/1">Single</a>'
    container.querySelector('#shortcuts')?.after(release)
    const { controller, reports } = start()
    controller.addShelf({ id: 'stats', title: 'Your listening', render: vi.fn() })

    expect(release.getAttribute('data-sc-shelf-key')).toBe('release')
    expect(reports.at(-1)?.slice(0, 2)).toEqual([
      { key: 'ext:stats', title: 'Your listening', stable: true },
      { key: 'release', title: 'New release from Artist', stable: true },
    ])
    expect(container.querySelector('[data-sc-shelf-key="ext:stats"]')?.nextElementSibling).toBe(release)
  })

  it('re-attaches extension shelves when Spotify re-renders Home', async () => {
    const container = mountHome()
    const { controller } = start()
    const render = vi.fn()
    controller.addShelf({ id: 'stats', title: 'Your listening', render })

    const fresh = container.cloneNode(true) as HTMLElement
    for (const el of fresh.querySelectorAll('[data-sc-shelf-key]')) el.removeAttribute('data-sc-shelf-key')
    fresh.querySelector('.sc-shelf')?.remove()
    container.replaceWith(fresh)

    await vi.waitFor(() => {
      expect(fresh.querySelector('[data-sc-shelf-key="ext:stats"]')).not.toBeNull()
    })
    expect(fresh.querySelectorAll('[data-sc-shelf-key]')).toHaveLength(4)
    expect(render).toHaveBeenCalledOnce()
  })

  it('unmounts an extension shelf and runs its cleanup', () => {
    mountHome()
    const { controller, reports } = start()
    const cleanup = vi.fn()
    const unmount = controller.addShelf({ id: 'stats', title: 'S', render: () => cleanup })
    unmount()
    expect(cleanup).toHaveBeenCalledOnce()
    expect(document.querySelector('.sc-shelf')).toBeNull()
    expect(reports.at(-1)?.some(s => s.key === 'ext:stats')).toBe(false)
  })

  it('survives an extension that throws while rendering', () => {
    mountHome()
    const { controller } = start()
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    controller.addShelf({
      id: 'broken',
      title: 'Broken',
      render: () => {
        throw new Error('boom')
      },
    })
    expect(document.querySelector('[data-sc-shelf-key="ext:broken"]')).not.toBeNull()
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })

  it('leaves no trace after dispose', () => {
    mountHome()
    const { controller } = start()
    controller.addShelf({ id: 'stats', title: 'S', render: () => undefined })
    controller.dispose()
    expect(document.getElementById('sc-home')).toBeNull()
    expect(document.querySelectorAll('[data-sc-shelf-key]')).toHaveLength(0)
  })

  it('keeps the last list while away from Home', async () => {
    mountHome()
    const { reports } = start()
    const count = reports.length
    document.querySelector('[data-testid="home-page"]')?.remove()
    await new Promise(r => setTimeout(r, 50))
    expect(reports).toHaveLength(count)
  })
})
