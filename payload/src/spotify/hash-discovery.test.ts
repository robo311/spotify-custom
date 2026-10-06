import { extractChunkUrls, extractOperationHashes, resolveOperationHash } from './hash-discovery'
import { hooksState, resetHooksState } from './state'

const H1 = '49ee15704de4a7fdeac65a02db20604aa11e46f02e809c55d9a89f6db9754356'
const H2 = 'b'.repeat(64)

// Trimmed from Spotify 1.3.3 bundles (minified identifiers kept as-is).
const PROFILE_CHUNK = `var tK=i(44726),tJ=i(6201);let t0=new tK.l("userTopContent","query","${H1}",null);function t2(e){return"Artist"===e.__typename}`
const MAIN_BUNDLE = `let a=new n.l("browseAll","query","${H2}",null);o.u=e=>({6204:"xpui-routes-collection-concerts",7969:"xpui-routes-profile",770:"dwp-home-chips-row"})[e]+".js"`

describe('extractOperationHashes', () => {
  it('finds operation definitions', () => {
    expect(extractOperationHashes(PROFILE_CHUNK + MAIN_BUNDLE)).toEqual(
      new Map([
        ['userTopContent', H1],
        ['browseAll', H2],
      ]),
    )
  })

  it('ignores look-alikes without a 64-char hash', () => {
    expect(extractOperationHashes('new X("foo","query","abc",null)').size).toBe(0)
  })
})

describe('extractChunkUrls', () => {
  it('turns the webpack chunk-name map into URLs', () => {
    expect(extractChunkUrls(MAIN_BUNDLE, 'https://x.test')).toEqual([
      'https://x.test/xpui-routes-collection-concerts.js',
      'https://x.test/xpui-routes-profile.js',
      'https://x.test/dwp-home-chips-row.js',
    ])
  })
})

describe('resolveOperationHash', () => {
  beforeEach(() => resetHooksState())

  it('scans the main bundle, then lazy chunks, and caches what it finds', async () => {
    const files: Record<string, string> = {
      'https://xpui.app.spotify.com/xpui-snapshot.js': MAIN_BUNDLE,
      'https://xpui.app.spotify.com/xpui-routes-profile.js': PROFILE_CHUNK,
    }
    const fetchSpy = vi.fn<typeof fetch>(input => {
      const body = files[typeof input === 'string' ? input : input instanceof URL ? input.href : input.url]
      return Promise.resolve(body ? new Response(body) : new Response('', { status: 404 }))
    })
    hooksState().originalFetch = fetchSpy
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([{ name: 'https://xpui.app.spotify.com/xpui-snapshot.js' } as PerformanceEntry])

    await expect(resolveOperationHash('userTopContent')).resolves.toBe(H1)
    expect(hooksState().hashes.get('browseAll')).toBe(H2)

    const calls = fetchSpy.mock.calls.length
    await expect(resolveOperationHash('userTopContent')).resolves.toBe(H1)
    expect(fetchSpy.mock.calls.length).toBe(calls)
  })

  it('falls back to the known hash when discovery finds nothing', async () => {
    hooksState().originalFetch = () => Promise.resolve(new Response('', { status: 404 }))
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([])
    await expect(resolveOperationHash('userTopContent')).resolves.toBe(H1)
    await expect(resolveOperationHash('somethingElse')).resolves.toBeNull()
  })
})
