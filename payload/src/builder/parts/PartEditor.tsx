// Editor for one curated part: only the properties that part supports, plus Hide and Reset. Controls come in up to
// three groups (the part's own extras, Colour, Shape): stacked inline in the Parts tab, one tab each in the
// pick-mode popover so it stays short.
import type { FunctionComponent } from 'preact'
import { useState } from 'preact/hooks'
import type { PartDef, PartStyle } from '../../types'
import { NPV_CARD_GAP_MAX } from '../../theme/model'
import { useApp, useEnv } from '../context'
import { css, useStyles } from '../styles/sheet'
import { setHidden, setPartProp } from '../lib/theme-edits'
import { lookup } from '../lib/record'
import { ColorField } from '../ui/ColorField'
import { Slider } from '../ui/Slider'
import { Toggle } from '../ui/Toggle'
import { IconChoiceField } from '../ui/IconChoiceField'
import { KeyTabs } from '../ui/KeyTabs'
import { PaintField } from './PaintField'
import { ProgressStylePicker } from './ProgressStylePicker'
import { ShortcutLayoutPicker } from './ShortcutLayoutPicker'
import { StatsLayoutPicker } from './StatsLayoutPicker'

const HomeIcon = () => <IconChoiceField name="home" label="Icon" />
const SearchIcons = () => (
  <div style={{ display: 'grid', gap: '2px', margin: '0 -8px' }}>
    <IconChoiceField name="search" label="Search icon" />
    <IconChoiceField name="browse" label="Browse icon" />
  </div>
)
function CardSpacing() {
  const { store } = useEnv()
  const gap = useApp(s => s.active.layout.nowPlaying.cardGap)
  return (
    <Slider
      label="Space between cards"
      min={0}
      max={NPV_CARD_GAP_MAX}
      unit="px"
      value={gap}
      onInput={v =>
        store.edit(
          t => {
            t.layout.nowPlaying = { ...t.layout.nowPlaying, cardGap: v }
          },
          { coalesceKey: 'npv.cardGap' },
        )
      }
    />
  )
}
const TopBarIcons = () => (
  <div style={{ display: 'grid', gap: '2px', margin: '0 -8px' }}>
    <IconChoiceField name="notifications" label="What’s New" />
    <IconChoiceField name="friends" label="Friend Activity" />
  </div>
)

/**
 * Part-specific controls beyond the shared colour/shape properties, shown first in that part's editor.
 * tab = its tab in the popover; heading = shown above it when stacked (omitted when the control says what it is).
 */
const PART_EXTRAS: Partial<Record<string, { tab: string; heading?: string; Component: FunctionComponent }>> = {
  progressBar: { tab: 'Style', heading: 'Style', Component: ProgressStylePicker },
  shortcuts: { tab: 'Layout', heading: 'Layout', Component: ShortcutLayoutPicker },
  stats: { tab: 'Layout', heading: 'Layout', Component: StatsLayoutPicker },
  homeButton: { tab: 'Icon', Component: HomeIcon },
  searchBox: { tab: 'Icons', heading: 'Icons', Component: SearchIcons },
  topBar: { tab: 'Icons', heading: 'Icons', Component: TopBarIcons },
  npvCards: { tab: 'Spacing', heading: 'Spacing', Component: CardSpacing },
}

type Group = 'extra' | 'colour' | 'shape'

const styles = css`
  .b-part-editor {
    display: grid;
    gap: 14px;
  }
  .b-part-editor__group {
    display: grid;
    gap: 8px;
  }
`

type ColorProp = 'text' | 'accent'
const COLOR_LABELS: Record<ColorProp, { label: string; hint: string }> = {
  text: { label: 'Text & icons', hint: 'Colour of words and icons here' },
  accent: { label: 'Highlight', hint: 'Active and playing states here' },
}

/** The controls for one part. Reset lives with whoever hosts the editor (popover footer, list row). */
export function PartEditor({ part, tabs = false }: { part: PartDef; tabs?: boolean }) {
  useStyles(styles)
  const { store } = useEnv()
  const style = useApp(s => lookup(s.active.parts, part.id))
  const palette = useApp(s => s.active.palette)
  const globalRadius = useApp(s => s.active.radius)
  const hidden = useApp(s => s.active.layout.hidden.includes(part.id))
  const [openColor, setOpenColor] = useState<ColorProp | null>(null)

  const edit = <K extends keyof PartStyle>(prop: K, value: PartStyle[K] | undefined) =>
    store.edit(setPartProp(part.id, prop, value), { coalesceKey: `part.${part.id}.${prop}` })

  const autoColor: Record<ColorProp, string> = { text: palette.text, accent: palette.accent }
  const extra = PART_EXTRAS[part.id]
  const groups: { id: Group; label: string }[] = [
    ...(extra ? [{ id: 'extra' as const, label: extra.tab }] : []),
    ...(['background', 'text', 'accent'].some(p => part.props.includes(p as keyof PartStyle)) ? [{ id: 'colour' as const, label: 'Colour' }] : []),
    ...(part.props.includes('radius') || part.size ? [{ id: 'shape' as const, label: 'Shape' }] : []),
  ]
  const [chosen, setChosen] = useState<Group | null>(null)
  const current = groups.find(g => g.id === chosen)?.id ?? groups[0]?.id
  const shows = (g: Group) => !tabs || current === g

  return (
    <div class="b-part-editor">
      {part.hideable && <Toggle label={`Hide ${part.label.toLowerCase()}`} checked={hidden} onChange={v => store.edit(setHidden(part.id, v))} />}
      {!hidden && tabs && groups.length > 1 && (
        <KeyTabs<Group> label={`${part.label} settings`} tabs={groups} value={current} onChange={setChosen} />
      )}
      {!hidden && (
        <>
          {extra && shows('extra') && (
            <div class="b-part-editor__group">
              {extra.heading && !tabs && <span class="b-label">{extra.heading}</span>}
              <extra.Component />
            </div>
          )}
          {shows('colour') && part.props.includes('background') && (
            <div class="b-part-editor__group">
              <span class="b-label">Background</span>
              <PaintField value={style?.background} autoColor={palette.surface} gradient={part.gradient} onChange={v => edit('background', v)} />
            </div>
          )}
          {(['text', 'accent'] as const)
            .filter(prop => shows('colour') && part.props.includes(prop))
            .map(prop => (
              <ColorField
                key={prop}
                label={COLOR_LABELS[prop].label}
                hint={COLOR_LABELS[prop].hint}
                value={style?.[prop]}
                autoValue={autoColor[prop]}
                open={openColor === prop}
                onToggle={() => setOpenColor(openColor === prop ? null : prop)}
                onChange={v => edit(prop, v)}
              />
            ))}
          {shows('shape') && part.props.includes('radius') && (
            <Slider label="Corner roundness" min={0} max={24} unit="px" value={style?.radius ?? part.radius ?? globalRadius} onInput={v => edit('radius', v)} />
          )}
          {shows('shape') && part.size && (
            <Slider label="Size" min={part.size.min} max={part.size.max} unit="px" value={style?.size ?? part.size.default} onInput={v => edit('size', v)} />
          )}
        </>
      )}
    </div>
  )
}
