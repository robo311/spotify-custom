// Calls Spotify's internal GraphQL with the user's own session (headers replayed from Spotify's latest request).
import { waitForHeaders } from './capture'
import { resolveOperationHash } from './hash-discovery'
import { PATHFINDER_QUERY_URL } from './selectors'
import { hooksState } from './state'

const HEADER_WAIT_MS = 20_000

export type SpotifyQueryFailure = 'no-session' | 'unknown-operation' | 'http' | 'graphql'

export class SpotifyQueryError extends Error {
  constructor(
    message: string,
    readonly failure: SpotifyQueryFailure,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'SpotifyQueryError'
  }
}

interface GraphQlResponse {
  data?: unknown
  errors?: { message?: unknown }[]
}

async function sessionHeaders(): Promise<Record<string, string>> {
  try {
    return await waitForHeaders(HEADER_WAIT_MS)
  } catch {
    throw new SpotifyQueryError('Spotify session not available yet', 'no-session')
  }
}

async function post(body: string, headers: Record<string, string>): Promise<Response> {
  const doFetch = hooksState().originalFetch ?? window.fetch.bind(window)
  return doFetch(PATHFINDER_QUERY_URL, {
    method: 'POST',
    headers: { ...headers, accept: 'application/json', 'content-type': 'application/json;charset=UTF-8' },
    body,
  })
}

/** Resolves to the response's `data` field (unknown shape: narrow at the call site). */
export async function query(operation: string, variables: object): Promise<unknown> {
  const hash = await resolveOperationHash(operation)
  if (!hash) throw new SpotifyQueryError(`Unknown Spotify operation "${operation}"`, 'unknown-operation')

  const body = JSON.stringify({
    variables,
    operationName: operation,
    extensions: { persistedQuery: { version: 1, sha256Hash: hash } },
  })

  let response = await post(body, await sessionHeaders())
  if (response.status === 401) {
    // Token expired between Spotify's last request and ours: wait for Spotify to refresh it, then retry once.
    const state = hooksState()
    state.headers = null
    response = await post(body, await sessionHeaders())
  }
  if (!response.ok) throw new SpotifyQueryError(`Spotify answered ${response.status}`, 'http', response.status)

  const json = (await response.json()) as GraphQlResponse
  if (json.data == null) {
    const message = json.errors?.map(e => String(e.message)).join('; ') ?? 'empty response'
    throw new SpotifyQueryError(message, 'graphql')
  }
  return json.data
}
