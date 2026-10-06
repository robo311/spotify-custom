// Background editor for a part: Auto, Solid, or a two-colour gradient with an angle.
import { useState } from 'preact/hooks'
import { css, useStyles } from '../styles/sheet'
import { convertPaint, formatPaint, parsePaint, type PaintModel } from '../lib/paint'
import { ColorPicker } from '../ui/color-picker/ColorPicker'
import { Segmented } from '../ui/Segmented'
import { Slider } from '../ui/Slider'
import { Swatch } from '../ui/Swatch'

const styles = css`
  .b-paint {
    display: grid;
    gap: 12px;
  }
  .b-paint__preview {
    height: 36px;
    border-radius: var(--b-r-sm);
    box-shadow: inset 0 0 0 1px var(--b-line);
  }
  .b-paint__stops {
    display: flex;
    gap: 8px;
  }
  .b-paint__stop {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    padding: 6px 8px;
    border-radius: var(--b-r-sm);
    box-shadow: inset 0 0 0 1px var(--b-line);
  }
  .b-paint__stop[aria-pressed='true'] {
    box-shadow: inset 0 0 0 2px var(--b-accent);
  }
  .b-paint__custom {
    padding: 8px;
    border-radius: var(--b-r-sm);
    background: var(--b-hover);
    word-break: break-all;
  }
`

type Mode = 'auto' | 'solid' | 'gradient'

interface PaintFieldProps {
  value: string | undefined
  /** Colour the part uses when Auto, also the starting colour for Solid/Gradient. */
  autoColor: string
  /** false: only Auto and Solid (the part keeps its background in a colour variable). */
  gradient?: boolean
  onChange: (paint: string | undefined) => void
}

export function PaintField({ value, autoColor, gradient = true, onChange }: PaintFieldProps) {
  useStyles(styles)
  const model: PaintModel | null = value === undefined ? null : parsePaint(value)
  const mode: Mode = model === null ? 'auto' : model.kind === 'gradient' ? 'gradient' : 'solid'
  const [stop, setStop] = useState<'from' | 'to'>('from')
  const emit = (next: PaintModel) => onChange(formatPaint(next))

  const setMode = (next: Mode) => {
    if (next === 'auto') onChange(undefined)
    else emit(convertPaint(model ?? { kind: 'solid', color: autoColor }, next, autoColor))
  }

  return (
    <div class="b-paint">
      <Segmented<Mode>
        label="Background type"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'auto', label: 'Auto' },
          { value: 'solid', label: 'Solid' },
          ...(gradient || mode === 'gradient' ? [{ value: 'gradient' as const, label: 'Gradient' }] : []),
        ]}
      />
      {model?.kind === 'custom' && (
        <div class="b-paint__custom b-mono" title="Written by hand in theme.json">
          {model.css}
        </div>
      )}
      {model?.kind === 'solid' && <ColorPicker value={model.color} onChange={color => emit({ kind: 'solid', color })} />}
      {model?.kind === 'gradient' && (
        <>
          <div class="b-paint__preview" style={{ background: formatPaint(model) }} />
          <div class="b-paint__stops" role="group" aria-label="Gradient colours">
            {(['from', 'to'] as const).map(which => (
              <button key={which} type="button" class="b-paint__stop" aria-pressed={stop === which} onClick={() => setStop(which)}>
                <Swatch color={model[which]} size={18} />
                <span class="b-mono">{model[which]}</span>
              </button>
            ))}
          </div>
          <ColorPicker value={model[stop]} onChange={color => emit({ ...model, [stop]: color })} />
          <Slider label="Direction" min={0} max={360} step={5} unit="°" value={model.angle} onInput={angle => emit({ ...model, angle })} />
        </>
      )}
    </div>
  )
}
