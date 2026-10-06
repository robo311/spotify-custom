// Finds persisted-query hashes for GraphQL operations Spotify hasn't called yet in this session.
// Spotify's JS defines each operation as `new X("<name>","query","<sha256>",…)`; route code lives in lazy chunks
// (e.g. xpui-routes-profile.js) listed in the webpack chunk-name map of the main bundle.
import { XPUI_ORIGIN } from './selectors'
import { hooksState } from './state'

const OPERATION_DEFINITION = /"([A-Za-z][A-Za-z0-9_]*)","(?:query|mutation)","([a-f0-9]{64})"/g
const CHUNK_NAME_ENTRY = /\b\d{1,6}:"([a-z0-9]+(?:-[a-z0-9]+)+)"/g
const SCAN_CONCURRENCY = 6
const MAX_CHUNKS = 600

/**
 * Last-resort hashes verified against Spotify 1.3.3.264. A persisted hash only changes when Spotify edits the query
 * text, so these usually keep working; discovery from live JS always wins.
 */
const KNOWN_HASHES: Readonly<Partial<Record<string, string>>> = {
  userTopContent: '49ee15704de4a7fdeac65a02db20604aa11e46f02e809c55d9a89f6db9754356',
}

/** Pure: all operation definitions in a JS source. */
export function extractOperationHashes(source: string): Map<string, string> {
  const found = new Map<string, string>()
  for (const [, name, hash] of source.matchAll(OPERATION_DEFINITION)) {
    if (name && hash) found.set(name, hash)
  }
  return found
}

/** Pure: lazy chunk URLs from a webpack chunk-name map (`123:"xpui-routes-profile"` → …/xpui-routes-profile.js). */
export function extractChunkUrls(source: string, origin: string = XPUI_ORIGIN): string[] {
  const urls = new Set<string>()
  for (const [, name] of source.matchAll(CHUNK_NAME_ENTRY)) {
    if (name) urls.add(`${origin}/${name}.js`)
  }
  return [...urls]
}

function loadedScriptUrls(): string[] {
  const fromResources = performance.getEntriesByType('resource').map(entry => entry.name)
  const fromTags = [...document.scripts].map(script => script.src)
  return [...new Set([...fromResources, ...fromTags])].filter(url => url.startsWith(XPUI_ORIGIN) && url.endsWith('.js'))
}

async function fetchText(url: string): Promise<string | null> {
  const doFetch = hooksState().originalFetch ?? window.fetch.bind(window)
  try {
    const response = await doFetch(url)
    return response.ok ? await response.text() : null
  } catch {
    return null
  }
}

/** Scans scripts (skipping already-scanned ones), records every hash found, stops early once `operation` is known. */
async function scan(urls: string[], operation: string, onSource?: (source: string) => void): Promise<void> {
  const state = hooksState()
  const queue = urls.filter(url => !state.scannedScripts.has(url))
  const worker = async () => {
    for (let url = queue.shift(); url !== undefined && !state.hashes.has(operation); url = queue.shift()) {
      state.scannedScripts.add(url)
      const source = await fetchText(url)
      if (source === null) continue
      for (const [name, hash] of extractOperationHashes(source)) if (!state.hashes.has(name)) state.hashes.set(name, hash)
      onSource?.(source)
    }
  }
  await Promise.all(Array.from({ length: SCAN_CONCURRENCY }, worker))
}

/** Hash for `operation`: captured traffic → loaded JS → lazy chunks → known fallback. Null if none. */
export async function resolveOperationHash(operation: string): Promise<string | null> {
  const state = hooksState()
  const cached = state.hashes.get(operation)
  if (cached) return cached

  const chunkUrls = new Set<string>()
  await scan(loadedScriptUrls(), operation, source => {
    for (const url of extractChunkUrls(source)) chunkUrls.add(url)
  })
  if (!state.hashes.has(operation)) await scan([...chunkUrls].slice(0, MAX_CHUNKS), operation)

  return state.hashes.get(operation) ?? KNOWN_HASHES[operation] ?? null
}
