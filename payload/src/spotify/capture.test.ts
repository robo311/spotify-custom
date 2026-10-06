import { installFetchHook, parsePathfinderRequest, recordCapture, waitForHeaders } from './capture'
import { PATHFINDER_QUERY_URL } from './selectors'
import { hooksState, resetHooksState } from './state'

const HASH = 'a'.repeat(64)
const body = JSON.stringify({ variables: {}, operationName: 'browseAll', extensions: { persistedQuery: { version: 1, sha256Hash: HASH } } })
const headers = {
  accept: 'application/json',
  authorization: 'Bearer token-1',
  'app-platform': 'OSX_ARM64',
  'spotify-app-version': '1.3.3.264',
  'accept-language': 'sk',
  'content-type': 'application/json;charset=UTF-8',
}

describe('parsePathfinderRequest', () => {
  it('extracts replayable headers, operation and hash', () => {
    expect(parsePathfinderRequest(PATHFINDER_QUERY_URL, { method: 'POST', headers, body })).toEqual({
      headers: { authorization: 'Bearer token-1', 'app-platform': 'OSX_ARM64', 'spotify-app-version': '1.3.3.264', 'accept-language': 'sk' },
      operationName: 'browseAll',
      hash: HASH,
    })
  })

  it('reads headers from a Request object', () => {
    const request = new Request(PATHFINDER_QUERY_URL, { method: 'POST', headers: { authorization: 'Bearer r' } })
    expect(parsePathfinderRequest(request)?.headers).toEqual({ authorization: 'Bearer r' })
  })

  it('ignores other hosts and tolerates non-JSON bodies', () => {
    expect(parsePathfinderRequest('https://i.scdn.co/image/x')).toBeNull()
    expect(parsePathfinderRequest(PATHFINDER_QUERY_URL, { body: 'not json' })).toEqual({ headers: {} })
  })
})

describe('recording and waiting', () => {
  beforeEach(() => resetHooksState())

  it('keeps optional headers across requests while refreshing the token', () => {
    const state = hooksState()
    recordCapture(state, { headers: { authorization: 'Bearer 1', 'app-platform': 'OSX_ARM64' } })
    recordCapture(state, { headers: { authorization: 'Bearer 2' }, operationName: 'home', hash: HASH })
    expect(state.headers).toEqual({ authorization: 'Bearer 2', 'app-platform': 'OSX_ARM64' })
    expect(state.hashes.get('home')).toBe(HASH)
  })

  it('waitForHeaders resolves on the next capture and times out otherwise', async () => {
    vi.useFakeTimers()
    const waiting = waitForHeaders(1000)
    recordCapture(hooksState(), { headers: { authorization: 'Bearer late' } })
    await expect(waiting).resolves.toEqual({ authorization: 'Bearer late' })

    resetHooksState()
    const timedOut = waitForHeaders(1000)
    vi.advanceTimersByTime(1001)
    await expect(timedOut).rejects.toThrow('No Spotify session')
    vi.useRealTimers()
  })
})

describe('installFetchHook', () => {
  beforeEach(() => resetHooksState())

  it('observes Spotify requests, passes them through untouched, and installs only once', async () => {
    const spy = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'))
    window.fetch = spy
    const currentFetch = () => (window as { fetch: unknown }).fetch
    installFetchHook()
    const hooked = currentFetch()
    installFetchHook()
    expect(currentFetch()).toBe(hooked)

    await window.fetch(PATHFINDER_QUERY_URL, { method: 'POST', headers, body })
    expect(spy).toHaveBeenCalledWith(PATHFINDER_QUERY_URL, { method: 'POST', headers, body })
    expect(hooksState().headers?.authorization).toBe('Bearer token-1')
    expect(hooksState().hashes.get('browseAll')).toBe(HASH)
  })
})
