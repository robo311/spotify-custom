import type { ExtensionDef, ExtensionInfo } from '../types'
import { createExtensionHost, userFileKey } from './host'
import { fakeHome, fakeStore, fakeTheme } from './test-fakes'

function setup(settings: Parameters<typeof fakeStore>[0] = {}) {
  const store = fakeStore(settings)
  const home = fakeHome()
  const changes: ExtensionInfo[][] = []
  const host = createExtensionHost({ store, home, onChange: list => changes.push(list) })
  const last = () => changes.at(-1) ?? []
  return { store, home, host, last }
}

function probe(id = 'probe', overrides: Partial<ExtensionDef> = {}) {
  const calls = { start: 0, stop: 0 }
  const def: ExtensionDef = {
    id,
    name: `Probe ${id}`,
    start() {
      calls.start++
      return () => {
        calls.stop++
      }
    },
    ...overrides,
  }
  return { def, calls }
}

describe('extension host lifecycle', () => {
  it('starts built-ins by default and stops them when switched off', () => {
    const { host, store, last } = setup()
    const { def, calls } = probe()
    host.register(def, true)
    expect(calls.start).toBe(1)
    expect(last()).toEqual([expect.objectContaining({ id: 'probe', builtIn: true, enabled: true })])

    store.setExtensionEnabled('probe', false)
    expect(calls.stop).toBe(1)
    expect(last()[0]?.enabled).toBe(false)
  })

  it('does not start non-built-in registrations until enabled', () => {
    const { host, store } = setup()
    const { def, calls } = probe()
    host.register(def)
    expect(calls.start).toBe(0)
    store.setExtensionEnabled('probe', true)
    expect(calls.start).toBe(1)
  })

  it('isolates a crash in start(): reports the error, keeps others running', () => {
    const { host, last } = setup()
    const healthy = probe('healthy')
    host.register(healthy.def, true)
    host.register(probe('broken', { start: () => { throw new Error('boom') } }).def, true)

    expect(healthy.calls.start).toBe(1)
    expect(healthy.calls.stop).toBe(0)
    expect(last().find(e => e.id === 'broken')).toMatchObject({ enabled: false, error: 'boom' })
  })

  it('retries a crashed extension the next time extension settings change', () => {
    const { host, store, last } = setup()
    let fail = true
    host.register(
      probe('flaky', {
        start: () => {
          if (fail) throw new Error('first time fails')
        },
      }).def,
      true,
    )
    expect(last()[0]?.error).toBe('first time fails')
    fail = false
    store.setExtensionEnabled('flaky', true)
    expect(last()[0]).toMatchObject({ enabled: true })
    expect(last()[0]?.error).toBeUndefined()
  })

  it('treats a throwing shelf render as a crash and unmounts that extension', () => {
    const { host, home, last } = setup()
    host.register(
      probe('shelfy', {
        start: ctx => {
          ctx.addHomeShelf({ id: 'ok', title: 'ok', render: () => undefined })
          ctx.addHomeShelf({ id: 'bad', title: 'bad', render: () => { throw new Error('render failed') } })
        },
      }).def,
      true,
    )
    expect(last()[0]?.error).toBe('render failed')
    expect(home.mounted.size).toBe(0)
  })

  it('releases shelves, listeners and subscriptions on stop', () => {
    const { host, home, store } = setup()
    const seen: string[] = []
    host.register(
      probe('res', {
        start: ctx => {
          ctx.addHomeShelf({ id: 'res-shelf', title: 'Res', render: el => { el.textContent = 'hi' } })
          ctx.theme.subscribe(theme => seen.push(theme.id))
        },
      }).def,
      true,
    )
    expect(home.mounted.has('res-shelf')).toBe(true)
    store.setActive(fakeTheme('nord'))
    expect(seen).toEqual(['nord'])

    store.setExtensionEnabled('res', false)
    expect(home.mounted.size).toBe(0)
    store.setActive(fakeTheme('forest'))
    expect(seen).toEqual(['nord'])
  })

  it('stores ctx.settings under settings.extensionData[id]', () => {
    const { host, store } = setup()
    host.register(probe('memo', { start: ctx => ctx.settings.set('range', 'LONG_TERM') }).def, true)
    expect(store.get().settings.extensionData.memo).toEqual({ range: 'LONG_TERM' })
  })
})

describe('user extension files', () => {
  const file = (source: string) => ({ file: 'my-ext.js', source })

  it('lists a user file by its header without evaluating it', () => {
    const { host } = setup()
    const marker = { evaluated: false }
    ;(window as unknown as Record<string, unknown>).__scTestMarker = marker
    host.addUserFile(file('// @name Mood lights\n// @description Pulses with the beat\nwindow.__scTestMarker.evaluated = true'))
    host.sync()
    expect(host.list()).toEqual([
      expect.objectContaining({ id: userFileKey('my-ext.js'), name: 'Mood lights', description: 'Pulses with the beat', enabled: false }),
    ])
    expect(marker.evaluated).toBe(false)
  })

  it('evaluates and starts the file once enabled', () => {
    const { host, store, last } = setup()
    host.addUserFile(file("SC.registerExtension({ id: 'x', name: 'From file', start(ctx) { ctx.settings.set('ran', true) } })"))
    host.sync()
    store.setExtensionEnabled(userFileKey('my-ext.js'), true)
    expect(store.get().settings.extensionData[userFileKey('my-ext.js')]).toEqual({ ran: true })
    expect(last()[0]).toMatchObject({ name: 'From file', enabled: true })
  })

  it('reports a file that never registers', () => {
    const { host, store, last } = setup()
    host.addUserFile(file('const nothing = 1'))
    host.sync()
    store.setExtensionEnabled(userFileKey('my-ext.js'), true)
    expect(last()[0]?.error).toMatch(/registerExtension/)
  })
})
