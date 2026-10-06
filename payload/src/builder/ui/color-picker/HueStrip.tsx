// Hue slider. Its gradient is sampled from the same Okhsv space as the field, so the strip and the field agree.
import { css, useStyles } from '../../styles/sheet'
import { hsvToHex } from '../../lib/okhsv'
import { handleStyles } from './handle'
import { useDrag } from './use-drag'

const stops = Array.from({ length: 25 }, (_, i) => hsvToHex({ h: i * 15, s: 0.85, v: 0.95 })).join(', ')

const styles = css`
  .b-hue {
    position: relative;
    height: 10px;
    margin: 2px 7px;
    border-radius: 999px;
    touch-action: none;
    cursor: ew-resize;
  }
  .b-hue::before {
    content: '';
    position: absolute;
    inset: 0 -7px;
    border-radius: inherit;
    background: linear-gradient(to right, ${stops});
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.08);
  }
  .b-hue .b-handle {
    top: 50%;
  }
`

export function HueStrip({ hue, onChange }: { hue: number; onChange: (hue: number) => void }) {
  useStyles(handleStyles, styles)
  const [dragging, drag] = useDrag(fx => onChange(fx * 360))
  const color = hsvToHex({ h: hue, s: 0.85, v: 0.95 })

  return (
    <div
      class="b-hue"
      role="slider"
      tabIndex={0}
      aria-label="Hue"
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={Math.round(hue)}
      onKeyDown={e => {
        const step = e.shiftKey ? 15 : 2
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange((hue + step) % 360)
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange((hue - step + 360) % 360)
        else return
        e.preventDefault()
      }}
      {...drag}
    >
      <span class="b-handle" data-active={dragging} style={{ left: `${(hue / 360) * 100}%`, '--c': color }} />
    </div>
  )
}
