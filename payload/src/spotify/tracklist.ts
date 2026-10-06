// Which song a track-list row shows. The DOM doesn't say (titles and labels are localised, links point to artists),
// but the row component a few levels up the React tree carries the track's URI as a prop.
import { isRecord } from './fiber'

const MAX_DEPTH = 6

export function trackUriOfRow(row: Element): string | null {
  const key = Object.keys(row).find(k => k.startsWith('__reactFiber$'))
  let fiber: unknown = key ? (row as unknown as Record<string, unknown>)[key] : null
  for (let depth = 0; isRecord(fiber) && depth < MAX_DEPTH; depth++) {
    const props = fiber.memoizedProps
    if (isRecord(props) && typeof props.uri === 'string' && props.uri.startsWith('spotify:track:')) return props.uri
    fiber = fiber.return
  }
  return null
}
