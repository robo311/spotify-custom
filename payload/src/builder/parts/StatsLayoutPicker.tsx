// The "Your listening" shelf's layout (theme.homeStyle): each option previewed as a tiny shelf in the theme's colours.
import type { HomeStyle } from '../../types'
import { useApp, useEnv } from '../context'
import { css, useStyles } from '../styles/sheet'
import { Field } from '../ui/Field'
import { OptionTiles, type TileOption } from '../ui/OptionTiles'
import { Segmented } from '../ui/Segmented'
import { Toggle } from '../ui/Toggle'

const styles = css`
  .b-sprev {
    display: grid;
    gap: 3px;
    height: 46px;
    padding: 6px;
    background: var(--sp-bg);
  }
  .b-sprev i {
    display: block;
    border-radius: 2px;
    background: color-mix(in oklch, var(--sp-text) 22%, transparent);
  }
  .b-sprev--hero {
    grid-template-columns: 1.2fr 1fr;
    grid-template-rows: repeat(4, 1fr);
  }
  .b-sprev--hero i:first-child {
    grid-row: 1 / -1;
    border-radius: 3px;
    background: radial-gradient(80% 120% at 30% 50%, color-mix(in oklch, var(--sp-accent) 70%, transparent), transparent 80%),
      color-mix(in oklch, var(--sp-text) 14%, transparent);
  }
  .b-sprev--grid {
    grid-template-columns: repeat(5, 1fr);
    align-items: center;
  }
  .b-sprev--grid i {
    aspect-ratio: 1;
    border-radius: 2px;
  }
  .b-sprev--grid i:first-child {
    background: color-mix(in oklch, var(--sp-accent) 70%, transparent);
  }
  .b-sprev--list {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: repeat(3, 1fr);
  }
  .b-sprev--list i:first-child {
    background: color-mix(in oklch, var(--sp-accent) 70%, transparent);
  }
`

type Layout = HomeStyle['statsLayout']
const BARS: Record<Layout, number> = { hero: 5, grid: 5, list: 6 }

function Preview({ layout }: { layout: Layout }) {
  useStyles(styles)
  const palette = useApp(s => s.active.palette)
  return (
    <span class={`b-sprev b-sprev--${layout}`} style={{ '--sp-bg': palette.background, '--sp-text': palette.text, '--sp-accent': palette.accent }}>
      {Array.from({ length: BARS[layout] }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  )
}

const OPTIONS: readonly TileOption<Layout>[] = [
  { value: 'hero', label: 'Spotlight', title: 'Your #1 big, the rest as a chart', preview: <Preview layout="hero" /> },
  { value: 'grid', label: 'Cards', title: 'Every item as a card', preview: <Preview layout="grid" /> },
  { value: 'list', label: 'List', title: 'A compact chart in columns', preview: <Preview layout="list" /> },
]

export function StatsLayoutPicker() {
  const { store } = useEnv()
  const look = useApp(s => s.active.homeStyle)
  const edit = (mutate: (h: HomeStyle) => void) =>
    store.edit(t => {
      const next = { ...t.homeStyle }
      mutate(next)
      t.homeStyle = next
    })

  return (
    <>
      <OptionTiles label="Shelf layout" value={look.statsLayout} options={OPTIONS} columns={3} onChange={v => edit(h => (h.statsLayout = v))} />
      <Field label="How many">
        <Segmented<'5' | '10'>
          label="How many"
          value={`${look.statsCount}`}
          onChange={v => edit(h => (h.statsCount = v === '10' ? 10 : 5))}
          options={[
            { value: '5', label: 'Top 5' },
            { value: '10', label: 'Top 10' },
          ]}
        />
      </Field>
      <div>
        <Toggle label="Rank numbers" checked={look.statsRanks} onChange={v => edit(h => (h.statsRanks = v))} />
        <Toggle
          label="Cover glow"
          description={look.statsLayout === 'hero' ? 'Your #1 glows in its own colour' : 'Only in the Spotlight layout'}
          checked={look.statsGlow}
          disabled={look.statsLayout !== 'hero'}
          onChange={v => edit(h => (h.statsGlow = v))}
        />
      </div>
    </>
  )
}
