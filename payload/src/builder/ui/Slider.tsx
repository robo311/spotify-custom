// Range slider with a monospaced value readout. onInput fires while dragging; onCommit once released.
import { useId } from 'preact/hooks'
import { css, useStyles } from '../styles/sheet'

const styles = css`
  .b-slider {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 6px 12px;
  }
  .b-slider__label {
    font-weight: 500;
  }
  .b-slider__value {
    color: var(--b-sub);
  }
  .b-slider input {
    grid-column: 1 / -1;
    appearance: none;
    width: 100%;
    height: 22px;
    margin: 0;
    background: transparent;
    cursor: pointer;
    --fill: calc((var(--v) - var(--min)) / (var(--max) - var(--min)) * 100%);
  }
  .b-slider input::-webkit-slider-runnable-track {
    height: 4px;
    border-radius: 2px;
    background: linear-gradient(to right, var(--b-accent) var(--fill), var(--b-slot) var(--fill));
    box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--b-border) 45%, transparent);
  }
  /* A fader cap: square-shouldered, with a grip line across the direction of travel. */
  .b-slider input::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 18px;
    margin-top: -7px;
    border-radius: 3px;
    background:
      linear-gradient(90deg, transparent calc(50% - 0.5px), rgb(0 0 0 / 0.45) 0 calc(50% + 0.5px), transparent 0),
      color-mix(in oklch, var(--b-text) 86%, var(--b-bg));
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 0.35),
      0 1px 2px rgb(0 0 0 / 0.45);
    transition: background-color var(--b-fast) var(--b-ease);
  }
  .b-slider input:hover::-webkit-slider-thumb {
    background-color: var(--b-text);
  }
  .b-slider input:focus-visible::-webkit-slider-thumb {
    box-shadow:
      0 0 0 2px var(--b-panel),
      0 0 0 4px var(--b-accent);
  }
  .b-slider input:focus-visible {
    outline: none;
  }
`

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onInput: (value: number) => void
  onCommit?: (value: number) => void
}

export function Slider({ label, value, min, max, step = 1, unit = '', onInput, onCommit }: SliderProps) {
  useStyles(styles)
  const id = useId()
  return (
    <div class="b-slider">
      <label class="b-slider__label" for={id}>
        {label}
      </label>
      <span class="b-slider__value b-mono" aria-hidden="true">
        {value}
        {unit}
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={`${value}${unit}`}
        style={{ '--v': value, '--min': min, '--max': max }}
        onInput={e => onInput(Number(e.currentTarget.value))}
        onChange={e => onCommit?.(Number(e.currentTarget.value))}
      />
    </div>
  )
}
