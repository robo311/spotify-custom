// The studio panel: smoked glass over live Spotify. Docked to the right by default; drag the header to float it
// anywhere (see use-panel-geometry), so the part of Spotify you're styling is never hidden behind it.
import { useUi } from '../context'
import { css, useStyles } from '../styles/sheet'
import type { Rect } from '../lib/panel-geometry'
import { Header } from './Header'
import { Rail } from './Rail'
import { Resizer } from './Resizer'
import { TABS } from './tabs'
import { UpdateNotice } from './UpdateNotice'
import { usePanelGeometry } from './use-panel-geometry'

const styles = css`
  .b-drawer {
    position: fixed;
    display: grid;
    /* header · update notice (often absent: its row collapses) · body */
    grid-template-rows: auto auto minmax(0, 1fr);
    border-radius: var(--b-r-xl);
    /* No backdrop blur: the panel is near-opaque, and a blur under it would be recomputed on every frame
       Spotify (or pick mode's spotlight) repaints beneath it. */
    background: var(--b-panel);
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 0.07),
      inset 0 0 0 1px var(--b-line),
      0 24px 64px rgb(0 0 0 / 0.5);
    pointer-events: auto;
    transform-origin: top right;
    transition:
      transform 280ms var(--b-ease),
      opacity 200ms var(--b-ease),
      left 260ms var(--b-ease),
      top 260ms var(--b-ease),
      height 260ms var(--b-ease);
  }
  .b-drawer[data-interacting='true'] {
    transition: none;
  }
  .b-drawer[data-docked='false'] {
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 0.06),
      inset 0 0 0 1px var(--b-line),
      0 30px 80px rgb(0 0 0 / 0.6);
  }
  .b-drawer[data-open='false'] {
    transform: translateX(16px) scale(0.985);
    opacity: 0;
    visibility: hidden;
    transition:
      transform 220ms var(--b-ease),
      opacity 180ms var(--b-ease),
      visibility 0s linear 220ms;
  }
  .b-drawer__body {
    grid-row: 3;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    min-height: 0;
  }
  .b-drawer__panel {
    padding-bottom: 2px;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: var(--b-press) transparent;
  }
  .b-drawer__panel:focus-visible {
    outline-offset: -2px;
  }
  .b-dock-ghost {
    position: fixed;
    border-radius: var(--b-r-xl);
    background: color-mix(in oklch, var(--b-accent) 12%, transparent);
    box-shadow: inset 0 0 0 2px color-mix(in oklch, var(--b-accent) 60%, transparent);
    pointer-events: none;
    animation: b-ghost-in 160ms var(--b-ease);
  }
  @keyframes b-ghost-in {
    from {
      opacity: 0;
    }
  }
`

const px = (r: Rect) => ({ left: `${r.x}px`, top: `${r.y}px`, width: `${r.width}px`, height: `${r.height}px` })

export function Drawer({ open }: { open: boolean }) {
  useStyles(styles)
  const tab = useUi(s => s.tab)
  const panel = usePanelGeometry()
  const Active = (TABS.find(t => t.id === tab) ?? TABS[0]).Component

  return (
    <>
      {panel.dockPreview && <div class="b-dock-ghost" style={px(panel.dockPreview)} />}
      <aside
        class="b-drawer"
        data-open={open}
        data-docked={panel.docked}
        data-interacting={panel.interacting}
        inert={!open}
        aria-label="Theme studio"
        style={px(panel.rect)}
      >
        <Resizer edge="left" width={panel.rect.width} onStart={e => panel.startResize('left', e)} onKeyResize={panel.resizeBy} />
        {!panel.docked && <Resizer edge="corner" width={panel.rect.width} onStart={e => panel.startResize('corner', e)} />}
        <Header onDragStart={panel.startMove} onDock={panel.docked ? undefined : panel.dock} />
        <UpdateNotice />
        <div class="b-drawer__body">
          <Rail />
          <div class="b-drawer__panel" role="tabpanel" id="b-panel" aria-labelledby={`b-tab-${tab}`} tabIndex={-1}>
            <Active key={tab} />
          </div>
        </div>
      </aside>
    </>
  )
}
