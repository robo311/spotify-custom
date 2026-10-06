// Choose the icon of one button (theme.iconOverrides): the pack's default, one from the gallery, or your own SVG.
// Own SVGs are previewed as CSS masks, never inserted as markup, so a file can't run code here either.
import { useState } from 'preact/hooks'
import { ChevronDown, RotateCcw, Upload } from 'lucide-static'
import type { IconChoice } from '../../types'
import { choiceSvg, ICON_GALLERY, iconSvgSelector, type IconName } from '../../icons'
import { isPlainSvg } from '../../theme/model'
import { useApp, useEnv } from '../context'
import { pickFile } from '../lib/files'
import { lookup } from '../lib/record'
import { css, useStyles } from '../styles/sheet'
import { Icon } from './Icon'

const styles = css`
  .b-ichoice {
    display: grid;
    gap: 8px;
  }
  .b-ichoice__row {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 6px 8px 6px 6px;
    border-radius: var(--b-r-md);
    text-align: left;
    transition: background var(--b-fast) var(--b-ease);
  }
  .b-ichoice__row:hover,
  .b-ichoice__row[aria-expanded='true'] {
    background: var(--b-hover);
  }
  .b-ichoice__well {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: color-mix(in oklch, var(--b-text) 6%, transparent);
    box-shadow: inset 0 0 0 1px var(--b-line);
    color: var(--b-text);
  }
  .b-ichoice__well[data-custom='true'] {
    background: var(--b-accent-soft);
    color: var(--b-accent);
    box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--b-accent) 40%, transparent);
  }
  .b-ichoice__text {
    display: grid;
    min-width: 0;
  }
  .b-ichoice__name {
    font-weight: 500;
  }
  .b-ichoice__state {
    overflow: hidden;
    color: var(--b-sub);
    font-size: 12px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .b-ichoice__chev {
    color: var(--b-sub);
    transition: transform var(--b-med) var(--b-ease);
  }
  .b-ichoice__row[aria-expanded='true'] .b-ichoice__chev {
    transform: rotate(180deg);
  }
  .b-ichoice__panel {
    display: grid;
    gap: 8px;
    padding: 10px;
    border-radius: var(--b-r-md);
    background: color-mix(in oklch, var(--b-bg) 55%, transparent);
    box-shadow: inset 0 0 0 1px var(--b-line);
    animation: b-ichoice-in var(--b-med) var(--b-ease);
  }
  @keyframes b-ichoice-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
  }
  .b-ichoice__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(34px, 1fr));
    gap: 4px;
    max-height: 176px;
    overflow-y: auto;
    scrollbar-width: thin;
  }
  .b-ichoice__opt {
    display: grid;
    place-items: center;
    aspect-ratio: 1;
    border-radius: var(--b-r-sm);
    color: var(--b-sub);
    transition:
      background var(--b-fast) var(--b-ease),
      color var(--b-fast) var(--b-ease),
      transform var(--b-fast) var(--b-spring);
  }
  .b-ichoice__opt:hover {
    background: var(--b-hover);
    color: var(--b-text);
    transform: scale(1.08);
  }
  .b-ichoice__opt[aria-checked='true'] {
    background: var(--b-accent-soft);
    color: var(--b-accent);
    box-shadow: inset 0 0 0 1.5px var(--b-accent);
  }
  .b-ichoice__actions {
    display: flex;
    gap: 6px;
  }
  .b-ichoice__action {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    box-shadow: inset 0 0 0 1px var(--b-line);
    color: var(--b-sub);
    font-size: 12px;
    font-weight: 500;
  }
  .b-ichoice__action:hover:not(:disabled) {
    color: var(--b-text);
    background: var(--b-hover);
  }
  .b-ichoice__action:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .b-ichoice__error {
    color: var(--b-warn);
    font-size: 12px;
  }
  .b-native {
    display: grid;
    place-items: center;
    width: 16px;
    height: 16px;
  }
  .b-native svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }
  .b-mask {
    display: block;
    width: 18px;
    height: 18px;
    background: currentColor;
    mask: var(--m) center / contain no-repeat;
  }
`

const toMask = (svg: string) => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`

function Glyph({ svg, size = 18 }: { svg: string; size?: number }) {
  return <span class="b-mask" aria-hidden="true" style={{ '--m': toMask(svg), width: `${size}px`, height: `${size}px` }} />
}

/** Spotify's own glyph for this button, copied from the live page (Spotify's markup, so safe to render as-is). */
function NativeGlyph({ name }: { name: IconName }) {
  const svg = document.querySelector(iconSvgSelector(name))?.outerHTML
  if (!svg) return <Glyph svg={'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/></svg>'} size={10} />
  return <span class="b-native" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
}

const SAME = (a: IconChoice | undefined, b: IconChoice | undefined) => JSON.stringify(a) === JSON.stringify(b)

interface IconChoiceFieldProps {
  name: IconName
  label: string
  /** Start expanded (e.g. inside a part's editor, where it's the only icon). */
  defaultOpen?: boolean
}

export function IconChoiceField({ name, label, defaultOpen = false }: IconChoiceFieldProps) {
  useStyles(styles)
  const { store } = useEnv()
  const choice = useApp(s => lookup(s.active.iconOverrides, name))
  const packSvg = useApp(s => s.iconPacks.find(p => p.id === s.active.icons)?.icons[name] ?? '')
  const [open, setOpen] = useState(defaultOpen)
  const [error, setError] = useState<string | null>(null)

  const set = (next: IconChoice | undefined) => {
    setError(null)
    store.edit(t => {
      const { [name]: _old, ...rest } = t.iconOverrides
      t.iconOverrides = next ? { ...rest, [name]: next } : rest
    })
  }

  const upload = async () => {
    const file = await pickFile('.svg,image/svg+xml')
    if (!file) return
    const svg = (await file.text()).trim()
    if (!isPlainSvg(svg)) {
      setError('That file isn’t a plain SVG icon (no scripts, links or embedded images, under 16 KB).')
      return
    }
    set({ svg })
  }

  const current = choice ? choiceSvg(choice) : packSvg
  const state = !choice ? (packSvg ? 'From the icon pack' : 'Spotify’s icon') : 'svg' in choice ? 'Your SVG' : (ICON_GALLERY.find(i => i.id === choice.gallery)?.label ?? 'Gallery icon')

  return (
    <div class="b-ichoice">
      <button type="button" class="b-ichoice__row" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span class="b-ichoice__well" data-custom={choice !== undefined}>
          {current ? <Glyph svg={current} /> : <NativeGlyph name={name} />}
        </span>
        <span class="b-ichoice__text">
          <span class="b-ichoice__name">{label}</span>
          <span class="b-ichoice__state">{state}</span>
        </span>
        <span class="b-ichoice__chev">
          <Icon svg={ChevronDown} size={14} />
        </span>
      </button>
      {open && (
        <div class="b-ichoice__panel">
          <div class="b-ichoice__grid" role="radiogroup" aria-label={`${label} icon`}>
            {ICON_GALLERY.map(icon => (
              <button
                key={icon.id}
                type="button"
                role="radio"
                class="b-ichoice__opt"
                title={icon.label}
                aria-label={icon.label}
                aria-checked={SAME(choice, { gallery: icon.id })}
                onClick={() => set({ gallery: icon.id })}
              >
                <Icon svg={icon.svg} size={18} />
              </button>
            ))}
          </div>
          <div class="b-ichoice__actions">
            <button type="button" class="b-ichoice__action" onClick={() => void upload()}>
              <Icon svg={Upload} size={13} />
              Your SVG…
            </button>
            <button type="button" class="b-ichoice__action" disabled={!choice} onClick={() => set(undefined)}>
              <Icon svg={RotateCcw} size={13} />
              Default
            </button>
          </div>
          {error && (
            <span class="b-ichoice__error" role="alert">
              {error}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
