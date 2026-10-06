// Text button and icon-only button. Variants encode intent: primary = the one main action, quiet = everything else.
import type { ButtonHTMLAttributes, ComponentChildren } from 'preact'
import { css, useStyles } from '../styles/sheet'
import { Icon } from './Icon'

const styles = css`
  .b-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 32px;
    padding: 0 14px;
    border-radius: var(--b-r-sm);
    font-weight: 500;
    white-space: nowrap;
    transition:
      background var(--b-fast) var(--b-ease),
      color var(--b-fast) var(--b-ease),
      transform var(--b-fast) var(--b-ease);
  }
  .b-btn:active:not(:disabled) {
    transform: scale(0.97);
  }
  .b-btn:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .b-btn--primary {
    background: var(--b-accent);
    color: var(--b-on-accent);
  }
  .b-btn--primary:hover:not(:disabled) {
    background: color-mix(in oklch, var(--b-accent) 88%, var(--b-text));
  }
  .b-btn--quiet {
    background: var(--b-hover);
    box-shadow: inset 0 0 0 1px var(--b-line);
  }
  .b-btn--quiet:hover:not(:disabled) {
    background: var(--b-press);
  }
  .b-btn--danger {
    background: transparent;
    color: #f08a8a;
    box-shadow: inset 0 0 0 1px color-mix(in oklch, #f08a8a 40%, transparent);
  }
  .b-btn--danger:hover:not(:disabled) {
    background: color-mix(in oklch, #f08a8a 14%, transparent);
  }
  .b-btn--block {
    width: 100%;
  }

  .b-icon-btn {
    display: inline-grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: var(--b-r-sm);
    color: var(--b-sub);
    transition:
      background var(--b-fast) var(--b-ease),
      color var(--b-fast) var(--b-ease);
  }
  .b-icon-btn:hover:not(:disabled) {
    background: var(--b-hover);
    color: var(--b-text);
  }
  .b-icon-btn[aria-pressed='true'] {
    background: var(--b-accent-soft);
    color: var(--b-accent);
  }
  .b-icon-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }
`

type ButtonProps = Omit<ButtonHTMLAttributes, 'icon'> & {
  variant?: 'primary' | 'quiet' | 'danger'
  icon?: string
  block?: boolean
  children: ComponentChildren
}

export function Button({ variant = 'quiet', icon, block, children, class: cls, ...rest }: ButtonProps) {
  useStyles(styles)
  const classes = ['b-btn', `b-btn--${variant}`, block ? 'b-btn--block' : '', typeof cls === 'string' ? cls : ''].filter(Boolean).join(' ')
  return (
    <button type="button" class={classes} {...rest}>
      {icon && <Icon svg={icon} size={15} />}
      {children}
    </button>
  )
}

type IconButtonProps = Omit<ButtonHTMLAttributes, 'icon' | 'label'> & {
  icon: string
  label: string // required: icon-only buttons need an accessible name
  size?: number
}

export function IconButton({ icon, label, size = 16, ...rest }: IconButtonProps) {
  useStyles(styles)
  return (
    <button type="button" class="b-icon-btn" aria-label={label} title={label} {...rest}>
      <Icon svg={icon} size={size} />
    </button>
  )
}
