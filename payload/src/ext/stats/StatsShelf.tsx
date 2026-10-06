// "Your listening" shelf: header with Artists/Tracks + time-range controls, then the ranked items in the layout the
// theme picks (theme.homeStyle): #1 hero + chart rows, cards, or a compact list; 5 or 10 items.
// States are exposed as data-sc-state (loading | ready | empty | unavailable) for e2e checks and styling; the look
// as data-sc-layout / -count / -ranks / -glow.
import { useCallback, useEffect, useState } from 'preact/hooks'
import type { ExtensionContext, HomeStyle } from '../../types'
import { isTimeRange, TIME_RANGES, type TimeRange, type TopContent, type TopContentSource, type TopItem, type TopKind } from './data'
import { GridCard } from './GridCard'
import { HeroCard } from './HeroCard'
import { RankRow } from './RankRow'
import { Segmented } from './Segmented'
import { STATS_CSS } from './styles'

export type ShelfState = 'loading' | 'ready' | 'empty' | 'unavailable'

const KIND_OPTIONS = [
  { value: 'artists', label: 'Artists' },
  { value: 'tracks', label: 'Tracks' },
] as const satisfies readonly { value: TopKind; label: string }[]

const RANGE_OPTIONS = TIME_RANGES.map(range => ({ value: range.id, label: range.label }))

interface Props {
  ctx: ExtensionContext
  source: TopContentSource
}

export function StatsShelf({ ctx, source }: Props) {
  const [kind, setKind] = usePersisted<TopKind>(ctx, 'kind', 'artists', (v): v is TopKind => v === 'artists' || v === 'tracks')
  const [range, setRange] = usePersisted<TimeRange>(ctx, 'range', 'SHORT_TERM', isTimeRange)
  const { content, failed, retry } = useTopContent(source, range)
  const look = useHomeStyle(ctx)

  const items = (content?.[kind] ?? []).slice(0, look.statsCount)
  const state: ShelfState = failed ? 'unavailable' : !content ? 'loading' : items.length === 0 ? 'empty' : 'ready'
  const rangePhrase = TIME_RANGES.find(r => r.id === range)?.phrase ?? ''

  const open = (item: TopItem) => {
    if (item.path) ctx.navigate(item.path)
  }

  return (
    <div
      class="sc-stats"
      data-sc-state={state}
      data-sc-layout={look.statsLayout}
      data-sc-count={look.statsCount}
      data-sc-ranks={look.statsRanks}
      data-sc-glow={look.statsGlow}
      aria-busy={state === 'loading'}
    >
      <style>{STATS_CSS}</style>
      <header class="sc-head">
        <div>
          <span class="sc-eyebrow">{`Top ${kind} · ${rangePhrase}`}</span>
          <h2 class="sc-title" id="sc-stats-title">
            Your listening
          </h2>
        </div>
        <div class="sc-controls">
          <Segmented label="Show" options={KIND_OPTIONS} value={kind} onChange={setKind} />
          <Segmented label="Time range" options={RANGE_OPTIONS} value={range} onChange={setRange} />
        </div>
      </header>

      {state === 'loading' && <Skeleton layout={look.statsLayout} />}
      {state === 'unavailable' && (
        <div class="sc-message" role="status">
          <span>
            <strong>Stats aren't available in this Spotify version.</strong> Spotify may have changed something under the hood.
          </span>
          <button type="button" class="sc-ghost" onClick={retry}>
            Try again
          </button>
        </div>
      )}
      {state === 'empty' && (
        <div class="sc-message" role="status">
          <span>
            <strong>Not enough listening yet</strong> for the {rangePhrase}. Try a longer range.
          </span>
        </div>
      )}
      {state === 'ready' && look.statsLayout === 'hero' && (
        <div class="sc-grid" key={`${kind}-${range}`}>
          <HeroCard item={items[0]} kind={kind} rangePhrase={rangePhrase} onOpen={open} />
          {items.length > 1 && (
            <ol class="sc-list" style={{ '--rows': items.length - 1 }}>
              {items.slice(1).map((item, index) => (
                <li key={item.uri}>
                  <RankRow item={item} rank={index + 2} kind={kind} onOpen={open} />
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      {state === 'ready' && look.statsLayout === 'grid' && (
        <ol class="sc-cards" key={`${kind}-${range}`}>
          {items.map((item, index) => (
            <li key={item.uri}>
              <GridCard item={item} rank={index + 1} kind={kind} onOpen={open} />
            </li>
          ))}
        </ol>
      )}
      {state === 'ready' && look.statsLayout === 'list' && (
        <ol class="sc-list sc-list-all" key={`${kind}-${range}`}>
          {items.map((item, index) => (
            <li key={item.uri}>
              <RankRow item={item} rank={index + 1} kind={kind} onOpen={open} />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function Skeleton({ layout }: { layout: HomeStyle['statsLayout'] }) {
  if (layout === 'grid') {
    return (
      <div class="sc-cards" aria-hidden="true">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} class="sc-card sc-row-ph">
            <span class="sc-card-media sc-ph" />
            <span class="sc-ph sc-line" />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div class="sc-grid" aria-hidden="true">
      <div class="sc-ph sc-hero-ph" />
      <div class="sc-list">
        {[0, 1, 2, 3].map(i => (
          <div key={i} class="sc-row sc-row-ph">
            <span class="sc-ph sc-line short" />
            <span class="sc-thumb sc-ph" />
            <span class="sc-row-text">
              <span class="sc-ph sc-line" />
              <span class="sc-ph sc-line short" />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Loads content for a range; keeps showing the previous range's content only until the new one arrives. */
function useTopContent(source: TopContentSource, range: TimeRange) {
  const [content, setContent] = useState<TopContent | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let current = true
    setFailed(false)
    setContent(null)
    source.load(range).then(
      loaded => {
        if (current) setContent(loaded)
      },
      (error: unknown) => {
        if (!current) return
        console.warn('[spotify-custom] stats unavailable', error)
        setFailed(true)
      },
    )
    return () => {
      current = false
    }
  }, [source, range, attempt])

  const retry = useCallback(() => setAttempt(n => n + 1), [])
  return { content, failed, retry }
}

/** The theme's look for Home (layout, count, ranks, glow), following live edits in the builder. */
function useHomeStyle(ctx: ExtensionContext): HomeStyle {
  const [look, setLook] = useState(() => ctx.theme.get().homeStyle)
  useEffect(() => ctx.theme.subscribe(theme => setLook(theme.homeStyle)), [ctx])
  return look
}

/** A UI choice remembered in the extension's settings (validated on read: settings files can be hand-edited). */
function usePersisted<T>(ctx: ExtensionContext, key: string, fallback: T, isValid: (value: unknown) => value is T) {
  const [value, setValue] = useState<T>(() => {
    const stored = ctx.settings.get(key)
    return isValid(stored) ? stored : fallback
  })
  const update = useCallback(
    (next: T) => {
      setValue(next)
      ctx.settings.set(key, next)
    },
    [ctx, key],
  )
  return [value, update] as const
}
