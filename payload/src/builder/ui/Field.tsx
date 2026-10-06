// A visible label above a control (segmented choices, pickers) so every setting says what it is.
import type { ComponentChildren } from 'preact'
import { useId } from 'preact/hooks'
import { css, useStyles } from '../styles/sheet'

const styles = css`
  .b-field {
    display: grid;
    gap: 6px;
  }
  .b-field__label {
    font-weight: 500;
  }
`

export function Field({ label, children }: { label: string; children: ComponentChildren }) {
  useStyles(styles)
  const id = useId()
  return (
    <div class="b-field" role="group" aria-labelledby={id}>
      <span class="b-field__label" id={id}>
        {label}
      </span>
      {children}
    </div>
  )
}
