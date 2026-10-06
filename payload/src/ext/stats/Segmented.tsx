// Accessible segmented control (radiogroup with roving focus).
// The selected option paints its own pill (text colour behind background colour, the theme's guaranteed-contrast
// pair), so its label is readable in every state; no separately measured overlay that could lag or be missing.
import { useRef } from 'preact/hooks'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  label: string
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
}

const STEP_BY_KEY: Partial<Record<string, number>> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

export function Segmented<T extends string>({ label, options, value, onChange }: Props<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const selected = Math.max(0, options.findIndex(option => option.value === value))

  const onKeyDown = (event: KeyboardEvent) => {
    const step = STEP_BY_KEY[event.key]
    if (step === undefined) return
    event.preventDefault()
    const next = (selected + step + options.length) % options.length
    onChange(options[next].value)
    buttons.current[next]?.focus()
  }

  return (
    <div class="sc-seg" role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((option, index) => (
        <button
          key={option.value}
          ref={el => {
            buttons.current[index] = el
          }}
          type="button"
          role="radio"
          aria-checked={index === selected}
          tabIndex={index === selected ? 0 : -1}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
