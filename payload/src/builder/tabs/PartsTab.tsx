// Parts: style areas of Spotify one by one, from a list or by pointing at them (pick mode).
import { useState } from 'preact/hooks'
import { ChevronDown, Paintbrush, TriangleAlert } from 'lucide-static'
import type { PartDef } from '../../types'
import { PARTS } from '../../parts'
import { useApp, useEnv, useUi } from '../context'
import { css, useStyles } from '../styles/sheet'
import { isPartCustomised, resetPartFully } from '../lib/part-slices'
import { PartEditor } from '../parts/PartEditor'
import { Icon } from '../ui/Icon'
import { ResetButton } from '../ui/ResetButton'
import { Section } from '../ui/Section'

const styles = css`
  .b-pickcta {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 14px 10px 10px;
    border-radius: var(--b-r-md);
    background: var(--b-accent-soft);
    box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--b-accent) 30%, transparent);
    text-align: left;
    transition:
      background var(--b-fast) var(--b-ease),
      box-shadow var(--b-fast) var(--b-ease);
  }
  .b-pickcta:hover {
    background: color-mix(in oklch, var(--b-accent) 26%, transparent);
  }
  .b-pickcta[aria-pressed='true'] {
    background: var(--b-accent);
    box-shadow: none;
    color: var(--b-on-accent);
  }
  .b-pickcta__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 32px;
    height: 32px;
    border-radius: var(--b-r-sm);
    background: var(--b-accent);
    color: var(--b-on-accent);
  }
  .b-pickcta[aria-pressed='true'] .b-pickcta__icon {
    background: var(--b-on-accent);
    color: var(--b-accent);
  }
  .b-pickcta__text {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 1px;
  }
  .b-pickcta__title {
    font-weight: 600;
  }
  .b-pickcta__hint {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: var(--b-sub);
  }
  .b-pickcta[aria-pressed='true'] .b-pickcta__hint {
    color: inherit;
    opacity: 0.8;
  }
  .b-partlist {
    display: grid;
    gap: 2px;
    margin: 0 -8px;
  }
  .b-partrow {
    border-radius: var(--b-r-md);
  }
  .b-partrow[data-open='true'] {
    background: var(--b-hover);
    box-shadow: inset 0 0 0 1px var(--b-line);
  }
  .b-partrow__head {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 8px;
    border-radius: var(--b-r-md);
    text-align: left;
  }
  .b-partrow__head:hover {
    background: var(--b-hover);
  }
  .b-partrow__text {
    flex: 1;
    min-width: 0;
    display: grid;
  }
  .b-partrow__name {
    font-weight: 500;
  }
  .b-partrow__edited {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--b-accent);
  }
  .b-partrow__missing {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--b-warn);
    font-size: 11.5px;
  }
  .b-partrow__chev {
    color: var(--b-sub);
    transition: transform var(--b-med) var(--b-ease);
  }
  .b-partrow[data-open='true'] .b-partrow__chev {
    transform: rotate(180deg);
  }
  .b-partrow__body {
    padding: 4px 10px 14px;
  }
  .b-partrow__tools {
    display: flex;
    justify-content: flex-end;
    margin: -4px -4px 4px;
  }
  .b-parts-empty {
    color: var(--b-sub);
    font-size: 12px;
  }
`

/** Parts that only exist on some pages (cards, shelf headers) are "not on this page", not broken. */
function isPageSpecific(part: PartDef): boolean {
  return part.pageSpecific === true
}

function PartStatusLine({ part, missing }: { part: PartDef; missing: boolean }) {
  if (!missing) return <span class="b-hint">{part.description}</span>
  if (isPageSpecific(part)) return <span class="b-hint">Not on this page, open a page that has it to see changes</span>
  return (
    <span class="b-partrow__missing">
      <Icon svg={TriangleAlert} size={12} /> Not found in this Spotify version
    </span>
  )
}

export function PartsTab() {
  useStyles(styles)
  const { store, ui } = useEnv()
  const picking = useUi(s => s.picking)
  const status = useApp(s => s.partStatus)
  const theme = useApp(s => s.active)
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <>
      <Section>
        <button type="button" class="b-pickcta" aria-pressed={picking} onClick={() => ui.set(s => ({ ...s, picking: !s.picking }))}>
          <span class="b-pickcta__icon">
            <Icon svg={Paintbrush} size={16} />
          </span>
          <span class="b-pickcta__text">
            <span class="b-pickcta__title">{picking ? 'Click an area in Spotify' : 'Point and style'}</span>
            <span class="b-pickcta__hint">{picking ? 'Press Esc when you’re done' : 'Click any part of Spotify to restyle it'}</span>
          </span>
        </button>
      </Section>

      <Section title="All parts">
        {PARTS.length === 0 ? (
          <p class="b-parts-empty">No parts are available in this version yet.</p>
        ) : (
          <div class="b-partlist">
            {PARTS.map(part => {
              const open = openId === part.id
              return (
                <div key={part.id} class="b-partrow" data-open={open}>
                  <button type="button" class="b-partrow__head" aria-expanded={open} onClick={() => setOpenId(open ? null : part.id)}>
                    <span class="b-partrow__text">
                      <span class="b-partrow__name">{part.label}</span>
                      <PartStatusLine part={part} missing={status[part.id] === 'missing'} />
                    </span>
                    {isPartCustomised(theme, part.id) && <span class="b-partrow__edited" title="Changed" />}
                    <span class="b-partrow__chev">
                      <Icon svg={ChevronDown} size={14} />
                    </span>
                  </button>
                  {open && (
                    <div class="b-partrow__body">
                      <div class="b-partrow__tools">
                        <ResetButton disabled={!isPartCustomised(theme, part.id)} onClick={() => store.edit(resetPartFully(part.id))} />
                      </div>
                      <PartEditor part={part} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </>
  )
}
