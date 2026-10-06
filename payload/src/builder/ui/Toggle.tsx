// On/off switch with a label and an optional one-line explanation.
import type { ComponentChildren } from 'preact'
import { useId } from 'preact/hooks'
import { css, useStyles } from '../styles/sheet'

const styles = css`
  .b-toggle {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    cursor: pointer;
  }
  .b-toggle__text {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .b-toggle__label {
    font-weight: 500;
  }
  /* A slide switch: a recessed slot with a square cap that travels to the lit side. */
  .b-toggle__switch {
    position: relative;
    flex: none;
    width: 34px;
    height: 18px;
    border-radius: 5px;
    background: var(--b-slot);
    box-shadow: var(--b-well-edge);
    transition: background var(--b-med) var(--b-ease);
  }
  .b-toggle__switch::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 14px;
    height: 12px;
    border-radius: 3px;
    background: color-mix(in oklch, var(--b-sub) 80%, var(--b-text));
    box-shadow: 0 1px 1px rgb(0 0 0 / 0.35);
    transition:
      transform var(--b-med) var(--b-ease),
      background var(--b-med) var(--b-ease);
  }
  .b-toggle__switch[aria-checked='true'] {
    background: var(--b-accent);
    box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.25);
  }
  .b-toggle__switch[aria-checked='true']::after {
    transform: translateX(14px);
    background: var(--b-on-accent);
  }
  .b-toggle__switch:disabled {
    opacity: 0.4;
    cursor: default;
  }
`

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ComponentChildren
  description?: ComponentChildren
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  useStyles(styles)
  const id = useId()
  return (
    <div class="b-toggle" onClick={() => !disabled && onChange(!checked)}>
      <span class="b-toggle__text">
        <span class="b-toggle__label" id={`${id}-l`}>
          {label}
        </span>
        {description && (
          <span class="b-hint" id={`${id}-d`}>
            {description}
          </span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        class="b-toggle__switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={e => {
          e.stopPropagation()
          onChange(!checked)
        }}
      />
    </div>
  )
}
