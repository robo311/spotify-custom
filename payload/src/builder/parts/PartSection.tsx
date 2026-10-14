// One part's section in its area's tab: title, Reset once it's changed, the area's own controls for it, then the part's
// editor. The section id is the part id, so pick mode can link straight here (shell/part-places.ts).
import type { ComponentChildren } from 'preact'
import {
  AppWindow,
  ChartColumn,
  CirclePlay,
  Clock3,
  GalleryVerticalEnd,
  Heading,
  House,
  LayoutGrid,
  PanelBottom,
  PanelLeft,
  PanelRight,
  PanelTop,
  RectangleHorizontal,
  Search,
  SquareStack,
  TriangleAlert,
  Volume2,
} from 'lucide-static'
import type { PartDef } from '../../types'
import { PARTS } from '../../parts'
import { useApp, useEnv } from '../context'
import { isPartCustomised, resetPartFully } from '../lib/part-slices'
import { Icon } from '../ui/Icon'
import { ResetButton } from '../ui/ResetButton'
import { Section } from '../ui/Section'
import { PartEditor } from './PartEditor'

/** The icon beside each part's section title. */
export const PART_ICONS: Readonly<Partial<Record<string, string>>> = {
  sidebar: PanelLeft,
  topBar: PanelTop,
  main: AppWindow,
  rightPanel: PanelRight,
  playerBar: PanelBottom,
  cards: GalleryVerticalEnd,
  buttons: RectangleHorizontal,
  cardPlayButton: CirclePlay,
  playerPlayButton: CirclePlay,
  progressBar: Clock3,
  volumeBar: Volume2,
  searchBox: Search,
  homeButton: House,
  shortcuts: LayoutGrid,
  stats: ChartColumn,
  npvCards: SquareStack,
  shelfHeaders: Heading,
}

function partDef(id: string): PartDef {
  const part = PARTS.find(p => p.id === id)
  if (!part) throw new Error(`Unknown part ${id}`)
  return part
}

/** Parts that only exist on some pages (cards, shelf titles) are "not on this page", not broken. */
function MissingNote({ part }: { part: PartDef }) {
  if (part.pageSpecific) return <span class="b-hint">Not on this page: open a page that has it to see changes.</span>
  return (
    <span class="b-hint" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--b-warn)' }}>
      <Icon svg={TriangleAlert} size={12} /> Not found in this Spotify version
    </span>
  )
}

interface PartSectionProps {
  partId: string
  /** Defaults to the part's own name. */
  title?: string
  hint?: string
  tour?: string
  /** The area's own controls for this part, above its colours and shape. */
  children?: ComponentChildren
}

export function PartSection({ partId, title, hint, tour, children }: PartSectionProps) {
  const { store } = useEnv()
  const part = partDef(partId)
  const customised = useApp(s => isPartCustomised(s.active, partId))
  const missing = useApp(s => s.partStatus[partId] === 'missing')
  const name = title ?? part.label

  return (
    <Section
      id={partId}
      title={name}
      icon={PART_ICONS[partId] ?? SquareStack}
      tour={tour}
      aside={customised && <ResetButton label={`Reset ${name.toLowerCase()}`} onClick={() => store.edit(resetPartFully(partId))} />}
    >
      {missing ? <MissingNote part={part} /> : hint && <span class="b-hint">{hint}</span>}
      {children}
      <PartEditor part={part} />
    </Section>
  )
}
