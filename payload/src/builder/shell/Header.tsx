// Panel header: which theme you're editing (renamable if it's yours), undo/redo, dock and close, and the palette
// ribbon: the theme's colours as one segmented strip along the bottom edge, morphing with every palette edit
// (a click opens Colours). It is also the panel's drag handle: press anywhere that isn't a control and drag;
// double-click to dock.
import { useState } from 'preact/hooks'
import { PanelRight, Redo2, Undo2, X } from 'lucide-static'
import type { Palette } from '../../types'
import { useApp, useEnv } from '../context'
import { savePrefs } from '../lib/prefs'
import { css, useStyles } from '../styles/sheet'
import { IconButton } from '../ui/Button'
import { SaveIndicator } from './SaveIndicator'

const styles = css`
  .b-header {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0 8px;
    padding: 14px 12px 14px 18px;
    border-radius: var(--b-r-xl) var(--b-r-xl) 0 0;
    box-shadow: inset 0 -1px 0 var(--b-line);
    cursor: grab;
    user-select: none;
  }
  .b-header:active {
    cursor: grabbing;
  }
  .b-header__name {
    display: block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 17px;
    font-weight: 650;
    letter-spacing: -0.02em;
    line-height: 1.25;
    text-align: left;
  }
  button.b-header__name {
    display: inline-block;
    border-radius: 4px;
    cursor: text;
  }
  button.b-header__name:hover {
    text-decoration: underline;
    text-decoration-color: var(--b-line);
    text-underline-offset: 3px;
  }
  .b-header__input {
    width: 100%;
    font-size: 17px;
    font-weight: 650;
    padding: 2px 6px;
    margin-left: -6px;
    border: 0;
    border-radius: 4px;
    background: var(--b-hover);
    box-shadow: inset 0 0 0 2px var(--b-accent);
    outline: none;
  }
  .b-header__meta {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    margin-top: 2px;
  }
  .b-header__meta-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .b-header__actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .b-header__history {
    display: flex;
    padding: 2px;
    border-radius: var(--b-r-md);
    background: var(--b-well);
    box-shadow: var(--b-well-edge);
  }
  .b-header__history .b-icon-btn {
    width: 28px;
    height: 26px;
    border-radius: 6px;
  }
  /* The palette as a paint-chip card: a recessed strip of equal chips, each a colour of the theme with its own
     hairline edge, so even the darkest chips stay visible and it never reads as a progress bar. */
  .b-ribbon {
    grid-column: 1 / -1;
    display: flex;
    gap: 2px;
    height: 20px;
    margin-top: 12px;
    padding: 3px;
    border-radius: var(--b-r-sm);
    background: var(--b-well);
    box-shadow: var(--b-well-edge);
    cursor: pointer;
  }
  .b-ribbon span {
    flex: 1;
    border-radius: 2px;
    box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--b-text) 12%, transparent);
    transition: background-color 300ms var(--b-ease);
  }
  .b-ribbon:hover {
    box-shadow:
      var(--b-well-edge),
      inset 0 0 0 1px color-mix(in oklch, var(--b-text) 30%, transparent);
  }
`

/** Frame to content, then the inks: how the colours sit in Spotify, left to right. */
const RIBBON: readonly { key: keyof Palette; name: string }[] = [
  { key: 'surface', name: 'Frame' },
  { key: 'background', name: 'Panels' },
  { key: 'elevated', name: 'Cards' },
  { key: 'border', name: 'Lines' },
  { key: 'textSubdued', name: 'Quiet text' },
  { key: 'text', name: 'Text' },
  { key: 'accent', name: 'Accent' },
  { key: 'onAccent', name: 'On accent' },
]

/** Presses on controls (buttons, inputs) must keep their own behaviour instead of moving the panel. */
const isControl = (e: Event) => e.composedPath().some(n => n instanceof Element && n.matches('button, input, a, [role="button"]'))

interface HeaderProps {
  onDragStart: (e: PointerEvent) => void
  /** Present while the panel floats: docks it back to the right edge. */
  onDock?: () => void
}

export function Header({ onDragStart, onDock }: HeaderProps) {
  useStyles(styles)
  const { store, ui } = useEnv()
  const active = useApp(s => s.active)
  const isPreset = useApp(s => s.activeIsPreset)
  const canUndo = useApp(s => s.canUndo)
  const canRedo = useApp(s => s.canRedo)
  const presets = useApp(s => s.presets)
  const [renaming, setRenaming] = useState(false)

  const basedOn = active.basedOn ? presets.find(p => p.id === active.basedOn)?.name : null
  const meta = isPreset ? 'Preset · edit anything to make it yours' : basedOn ? `Your theme · from ${basedOn}` : 'Your theme'

  const commitName = (value: string) => {
    const name = value.trim()
    if (name && name !== active.name) store.renameTheme(active.id, name)
    setRenaming(false)
  }

  return (
    <header
      class="b-header"
      title={onDock ? 'Drag to move · double-click to dock' : 'Drag to move'}
      onPointerDown={e => {
        if (!isControl(e)) onDragStart(e)
      }}
      onDblClick={e => {
        if (!isControl(e)) onDock?.()
      }}
    >
      <div>
        {renaming ? (
          <input
            class="b-header__input"
            aria-label="Theme name"
            value={active.name}
            ref={el => el?.focus()}
            onBlur={e => commitName(e.currentTarget.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitName(e.currentTarget.value)
              if (e.key === 'Escape') {
                e.stopPropagation()
                setRenaming(false)
              }
            }}
          />
        ) : isPreset ? (
          <h2 class="b-header__name" style={{ margin: 0 }}>
            {active.name}
          </h2>
        ) : (
          <button type="button" class="b-header__name" title="Rename" onClick={() => setRenaming(true)}>
            {active.name}
          </button>
        )}
        <div class="b-header__meta b-hint">
          <span class="b-header__meta-text">{meta}</span>
          <SaveIndicator />
        </div>
      </div>
      <div class="b-header__actions">
        <span class="b-header__history">
          <IconButton icon={Undo2} label="Undo" disabled={!canUndo} onClick={() => store.undo()} />
          <IconButton icon={Redo2} label="Redo" disabled={!canRedo} onClick={() => store.redo()} />
        </span>
        {onDock && <IconButton icon={PanelRight} label="Dock to the right" onClick={onDock} />}
        <IconButton icon={X} label="Close theme studio" onClick={() => ui.set(s => ({ ...s, open: false, picking: false }))} />
      </div>
      <button
        type="button"
        class="b-ribbon"
        aria-label="Edit colours"
        title="Edit colours"
        onClick={() => {
          ui.set(s => ({ ...s, tab: 'colours' }))
          savePrefs({ tab: 'colours' })
        }}
      >
        {RIBBON.map(r => (
          <span key={r.key} data-key={r.key} title={`${r.name} ${active.palette[r.key]}`} style={{ background: active.palette[r.key] }} />
        ))}
      </button>
    </header>
  )
}
