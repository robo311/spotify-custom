// Observes Spotify's own GraphQL (pathfinder) requests to learn auth headers and persisted-query hashes.
// The hook only reads requests; it never changes or delays them.
import { FORWARDED_HEADERS, PATHFINDER_URL_PREFIX } from './selectors'
import { hooksState, type HooksState } from './state'

export interface CapturedRequest {
  headers: Record<string, string> // only FORWARDED_HEADERS that were present
  operationName?: string
  hash?: string
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

function pickHeaders(input: RequestInfo | URL, init?: RequestInit): Record<string, string> {
  const source = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
  const picked: Record<string, string> = {}
  for (const name of FORWARDED_HEADERS) {
    const value = source.get(name)
    if (value) picked[name] = value
  }
  return picked
}

interface PersistedQueryBody {
  operationName?: unknown
  extensions?: { persistedQuery?: { sha256Hash?: unknown } }
}

function parseBody(body: unknown): PersistedQueryBody | null {
  if (typeof body !== 'string') return null
  try {
    const parsed: unknown = JSON.parse(body)
    return typeof parsed === 'object' && parsed !== null ? parsed : null
  } catch {
    return null
  }
}

/** Pure: extracts what we learn from one fetch call, or null if it isn't a pathfinder request. */
export function parsePathfinderRequest(input: RequestInfo | URL, init?: RequestInit): CapturedRequest | null {
  const url = requestUrl(input)
  if (!url.startsWith(PATHFINDER_URL_PREFIX)) return null

  const captured: CapturedRequest = { headers: pickHeaders(input, init) }
  const body = parseBody(init?.body)
  const operationName = body?.operationName
  const hash = body?.extensions?.persistedQuery?.sha256Hash
  if (typeof operationName === 'string' && typeof hash === 'string') {
    captured.operationName = operationName
    captured.hash = hash
  }
  return captured
}

export function recordCapture(state: HooksState, captured: CapturedRequest): void {
  if (captured.operationName && captured.hash) state.hashes.set(captured.operationName, captured.hash)
  if (!captured.headers.authorization) return
  // Merge so a request lacking an optional header doesn't erase one learned earlier; the token is always refreshed.
  state.headers = { ...state.headers, ...captured.headers }
  for (const listener of state.headerListeners) listener()
}

/** Wraps window.fetch once per page (survives payload hot reloads). */
export function installFetchHook(): void {
  const state = hooksState()
  if (state.originalFetch) return
  const original = window.fetch.bind(window)
  state.originalFetch = original

  window.fetch = function scObservedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    try {
      const captured = parsePathfinderRequest(input, init)
      if (captured) recordCapture(state, captured)
    } catch (error) {
      // Observation must never break Spotify's request.
      console.warn('[spotify-custom] request capture failed', error)
    }
    return original(input, init)
  }
}

/** Resolves when replayable headers exist (immediately if already captured); rejects after timeoutMs. */
export function waitForHeaders(timeoutMs: number): Promise<Record<string, string>> {
  const state = hooksState()
  if (state.headers) return Promise.resolve(state.headers)
  return new Promise((resolve, reject) => {
    const onCapture = () => {
      if (!state.headers) return
      cleanup()
      resolve(state.headers)
    }
    const timer = window.setTimeout(() => {
      cleanup()
      reject(new Error('No Spotify session captured yet'))
    }, timeoutMs)
    const cleanup = () => {
      window.clearTimeout(timer)
      state.headerListeners.delete(onCapture)
    }
    state.headerListeners.add(onCapture)
  })
}
