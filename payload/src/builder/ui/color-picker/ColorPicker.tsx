// Colour picker: Okhsv field, hue strip, hex entry with screen eyedropper, then suggested and recent colours.
import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { Pipette } from 'lucide-static'
import { css, useStyles } from '../../styles/sheet'
import { normalizeHex } from '../../lib/color-math'
import { IconButton } from '../Button'
import { Swatch } from '../Swatch'
import { SvField } from './SvField'
import { HueStrip } from './HueStrip'
import { useHsvValue } from './use-hsv-value'
import { useRecentColors } from './use-recent-colors'

const styles = css`
  .b-picker {
    display: grid;
    gap: 14px;
  }
  .b-picker__entry {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
  }
  .b-picker__hex {
    display: flex;
    align-items: center;
    height: 32px;
    padding: 0 10px;
    border-radius: var(--b-r-sm);
    background: var(--b-hover);
    box-shadow: inset 0 0 0 1px var(--b-line);
    transition: box-shadow var(--b-fast) var(--b-ease);
  }
  .b-picker__hex:focus-within {
    box-shadow: inset 0 0 0 1.5px var(--b-accent);
  }
  .b-picker__hex[data-invalid='true'] {
    box-shadow: inset 0 0 0 1.5px var(--b-warn);
  }
  .b-picker__hash {
    color: var(--b-sub);
  }
  .b-picker__hex input {
    flex: 1;
    min-width: 0;
    padding: 0 0 0 2px;
    border: 0;
    background: none;
    outline: none;
    text-transform: uppercase;
  }
  .b-picker__swatches {
    display: grid;
    grid-template-columns: 64px 1fr;
    align-items: center;
    gap: 8px;
  }
  .b-picker__swatches + .b-picker__swatches {
    margin-top: -6px;
  }
  .b-picker__list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
`

interface EyeDropperResult {
  sRGBHex: string
}
type EyeDropperCtor = new () => { open(): Promise<EyeDropperResult> }
const eyeDropper = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper

interface ColorPickerProps {
  value: string
  onChange: (hex: string) => void
  /** Colours that would suit this spot (e.g. accents that fit the palette). */
  suggestions?: readonly string[]
  /** Rendered under the picker, e.g. a contrast line for the colour being edited. */
  footer?: ComponentChildren
}

export function ColorPicker({ value, onChange, suggestions = [], footer }: ColorPickerProps) {
  useStyles(styles)
  const [hsv, setHsv] = useHsvValue(value)
  const [recent, remember] = useRecentColors()
  const [draft, setDraft] = useState<string | null>(null)

  const emit = (hex: string) => {
    onChange(hex)
    remember(hex)
  }

  const commitDraft = () => {
    if (draft === null) return
    const hex = normalizeHex(draft)
    if (hex) emit(hex)
    setDraft(null)
  }

  const pickFromScreen = async () => {
    if (!eyeDropper) return
    try {
      const hex = normalizeHex((await new eyeDropper().open()).sRGBHex)
      if (hex) emit(hex)
    } catch {
      // Cancelled with Esc: nothing to do.
    }
  }

  const swatchRow = (label: string, colors: readonly string[]) =>
    colors.length > 0 && (
      <div class="b-picker__swatches">
        <span class="b-hint">{label}</span>
        <div class="b-picker__list" role="group" aria-label={`${label} colours`}>
          {colors.map(c => (
            <Swatch key={c} color={c} size={20} label={`Use ${c}`} selected={c === value} onClick={() => emit(c)} />
          ))}
        </div>
      </div>
    )

  return (
    <div class="b-picker">
      <SvField value={hsv} hex={value} onChange={next => emit(setHsv(next))} />
      <HueStrip hue={hsv.h} onChange={h => emit(setHsv({ ...hsv, h }))} />
      <div class="b-picker__entry">
        <Swatch color={value} size={32} />
        <label class="b-picker__hex b-mono" data-invalid={draft !== null && normalizeHex(draft) === null}>
          <span class="b-picker__hash" aria-hidden="true">
            #
          </span>
          <input
            aria-label="Hex colour"
            spellcheck={false}
            maxLength={9}
            value={draft ?? value.replace('#', '')}
            onInput={e => setDraft(e.currentTarget.value)}
            onBlur={commitDraft}
            onKeyDown={e => {
              if (e.key === 'Enter') commitDraft()
              if (e.key === 'Escape' && draft !== null) {
                e.stopPropagation()
                setDraft(null)
              }
            }}
          />
        </label>
        {eyeDropper && <IconButton icon={Pipette} label="Pick a colour from the screen" onClick={() => void pickFromScreen()} />}
      </div>
      {swatchRow('Suggested', suggestions)}
      {swatchRow('Recent', recent)}
      {footer}
    </div>
  )
}
