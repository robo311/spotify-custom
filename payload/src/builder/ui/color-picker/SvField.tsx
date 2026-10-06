// Saturation × value field for one hue, in Okhsv: a full rectangle, every point a real colour.
// Rendered at a small fixed size and scaled up by the browser; Okhsv is smooth, so bilinear scaling is invisible
// and a hue change costs a few milliseconds.
import { useEffect, useRef } from 'preact/hooks'
import { css, useStyles } from '../../styles/sheet'
import { hsvToBytes, type Hsv } from '../../lib/okhsv'
import { handleStyles } from './handle'
import { useDrag } from './use-drag'

const styles = css`
  .b-sv {
    position: relative;
    height: 150px;
    border-radius: var(--b-r-md);
    touch-action: none;
    cursor: crosshair;
  }
  .b-sv canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border-radius: inherit;
  }
  .b-sv::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.08);
    pointer-events: none;
  }
`

const W = 128
const H = 64

function paint(canvas: HTMLCanvasElement, h: number): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const image = ctx.createImageData(W, H)
  for (let y = 0; y < H; y++) {
    const v = 1 - y / (H - 1)
    for (let x = 0; x < W; x++) {
      const [r, g, b] = hsvToBytes({ h, s: x / (W - 1), v })
      const i = (y * W + x) * 4
      image.data[i] = r
      image.data[i + 1] = g
      image.data[i + 2] = b
      image.data[i + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
}

interface SvFieldProps {
  value: Hsv
  hex: string
  onChange: (next: Hsv) => void
}

export function SvField({ value, hex, onChange }: SvFieldProps) {
  useStyles(handleStyles, styles)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hue = Math.round(value.h)
  const [dragging, drag] = useDrag((fx, fy) => onChange({ h: value.h, s: fx, v: 1 - fy }))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const frame = requestAnimationFrame(() => paint(canvas, hue))
    return () => cancelAnimationFrame(frame)
  }, [hue])

  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.05 : 0.01
    const clamp = (n: number) => Math.min(1, Math.max(0, n))
    const moves: Partial<Record<string, Partial<Hsv>>> = {
      ArrowUp: { v: clamp(value.v + step) },
      ArrowDown: { v: clamp(value.v - step) },
      ArrowRight: { s: clamp(value.s + step) },
      ArrowLeft: { s: clamp(value.s - step) },
    }
    const move = moves[e.key]
    if (!move) return
    e.preventDefault()
    onChange({ ...value, ...move })
  }

  return (
    <div
      class="b-sv"
      role="slider"
      tabIndex={0}
      aria-label="Colour intensity and brightness"
      aria-valuetext={`Intensity ${Math.round(value.s * 100)}%, brightness ${Math.round(value.v * 100)}%`}
      onKeyDown={onKeyDown}
      {...drag}
    >
      <canvas ref={canvasRef} width={W} height={H} />
      <span class="b-handle" data-active={dragging} style={{ left: `${value.s * 100}%`, top: `${(1 - value.v) * 100}%`, '--c': hex }} />
    </div>
  )
}
