// The editor that opens next to a picked part: live edits, then Save (keep and close) or Cancel / Esc (put back
// and close). Clicking outside keeps the changes, like design tools do; the header's save indicator confirms it.
// Below the controls, a link opens the part's section in its area's tab, with everything else that area offers.
// Its header is a live specimen of the part: a plate painted with the part's own background, its name set in the
// part's text colour, and a readout of the resolved fill / text / accent values, so every edit shows right here.
import { ArrowRight } from 'lucide-static'
import type { PartDef } from '../../types'
import { useApp, useEnv } from '../context'
import { lookup } from '../lib/record'
import { goTo } from '../lib/navigate'
import { PART_PLACES } from '../shell/part-places'
import { TABS } from '../shell/tabs'
import { Icon } from '../ui/Icon'
import { css, useStyles } from '../styles/sheet'
import type { Box } from '../lib/pick'
import { parsePaint } from '../lib/paint'
import { resetPartFully } from '../lib/part-slices'
import { PartEditor } from '../parts/PartEditor'
import { Button } from '../ui/Button'
import { Popover } from '../ui/Popover'
import { ResetButton } from '../ui/ResetButton'
import { usePartSession } from './use-part-session'

const styles = css`
  /* A specimen plate set into the faceplate: its hairline edge keeps it distinct even when the part's
     background is the same colour as the dialog. */
  .b-ppop__hero {
    display: grid;
    gap: 14px;
    margin: 8px 8px 0;
    padding: 14px 14px 12px;
    border-radius: var(--b-r-md);
    background: var(--hero-bg);
    color: var(--hero-text);
    box-shadow:
      inset 0 0 0 1px color-mix(in oklch, var(--hero-text) 14%, transparent),
      0 0 0 1px rgb(0 0 0 / 0.3);
    transition:
      background 300ms var(--b-ease),
      color 300ms var(--b-ease);
  }
  .b-ppop__title {
    margin: 0;
    font-size: 18px;
    font-weight: 650;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .b-ppop__desc {
    margin-top: 2px;
    font-size: 12.5px;
    opacity: 0.72;
  }
  .b-ppop__readout {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin: 0;
    padding-top: 10px;
    box-shadow: inset 0 1px 0 color-mix(in oklch, var(--hero-text) 14%, transparent);
  }
  .b-ppop__value {
    display: grid;
    gap: 3px;
    min-width: 0;
  }
  .b-ppop__value dt {
    font-size: 11px;
    opacity: 0.65;
  }
  .b-ppop__value dd {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font: 500 11.5px/1 var(--b-mono);
    letter-spacing: 0;
    font-variant-numeric: tabular-nums;
  }
  .b-ppop__value i {
    flex: none;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--hero-text) 35%, transparent);
  }
  .b-ppop__body {
    padding: 14px 14px 16px;
  }
  .b-ppop__more {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: calc(100% - 16px);
    margin: 0 8px 4px;
    padding: 8px 10px;
    border-radius: var(--b-r-sm);
    color: var(--b-sub);
    font-weight: 500;
    text-align: left;
  }
  .b-ppop__more:hover {
    background: var(--b-hover);
    color: var(--b-text);
  }
  .b-ppop__foot {
    position: sticky;
    bottom: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 12px 12px;
    background: var(--b-panel);
    box-shadow: 0 -1px 0 var(--b-line);
  }
  .b-ppop__spacer {
    flex: 1;
  }
`

interface PartPopoverProps {
  part: PartDef
  anchor: Box
  onDone: () => void
  onPlaced?: (rect: Box) => void
}

/** Chip text for a paint: its hex, or what kind of paint it is. */
function paintLabel(paint: string): string {
  const model = parsePaint(paint)
  return model.kind === 'solid' ? model.color.replace(/^#/, '') : model.kind === 'gradient' ? 'Gradient' : 'Custom'
}

export function PartPopover({ part, anchor, onDone, onPlaced }: PartPopoverProps) {
  useStyles(styles)
  const { store, ui } = useEnv()
  const session = usePartSession(part.id)
  const style = useApp(s => lookup(s.active.parts, part.id))
  const palette = useApp(s => s.active.palette)
  const cancel = () => {
    session.cancel()
    onDone()
  }
  const place = TABS.find(t => t.id === PART_PLACES[part.id])

  const bg = style?.background ?? palette.surface
  const text = style?.text ?? palette.text
  const accent = style?.accent ?? palette.accent
  const chips = [
    part.props.includes('background') && { name: 'Fill', value: bg, auto: style?.background === undefined },
    part.props.includes('text') && { name: 'Text', value: text, auto: style?.text === undefined },
    part.props.includes('accent') && { name: 'Accent', value: accent, auto: style?.accent === undefined },
  ].filter((c): c is { name: string; value: string; auto: boolean } => Boolean(c))

  return (
    <Popover anchor={anchor} label={`Style ${part.label}`} gap={28} onClose={onDone} onEscape={cancel} onPlaced={onPlaced}>
      <div class="b-ppop__hero" style={{ '--hero-bg': bg, '--hero-text': text }}>
        <div>
          <h3 class="b-ppop__title">{part.label}</h3>
          <div class="b-ppop__desc">{part.description}</div>
        </div>
        {chips.length > 0 && (
          <dl class="b-ppop__readout">
            {chips.map(c => (
              <div key={c.name} class="b-ppop__value">
                <dt>{c.auto ? `${c.name} · auto` : c.name}</dt>
                <dd>
                  <i style={{ background: c.value }} />
                  {paintLabel(c.value)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <div class="b-ppop__body">
        <PartEditor part={part} tabs />
      </div>
      {place && (
        // Like clicking outside: the edits stay.
        <button
          type="button"
          class="b-ppop__more"
          onClick={() => {
            onDone()
            goTo(ui, place.id, part.id)
          }}
        >
          More in {place.label}
          <Icon svg={ArrowRight} size={14} />
        </button>
      )}
      <div class="b-ppop__foot">
        <ResetButton onClick={() => store.edit(resetPartFully(part.id))} />
        <span class="b-ppop__spacer" />
        <Button onClick={cancel}>Cancel</Button>
        <Button variant="primary" disabled={!session.changed} title={session.changed ? undefined : 'Nothing to save yet'} onClick={onDone}>
          Save
        </Button>
      </div>
    </Popover>
  )
}
