// A colour chip. Checkerboard underneath so translucent colours read honestly.
import { css, useStyles } from '../styles/sheet'

const styles = css`
  .b-swatch {
    position: relative;
    flex: none;
    width: var(--s);
    height: var(--s);
    border-radius: calc(var(--s) * 0.3);
    background:
      linear-gradient(var(--c), var(--c)),
      repeating-conic-gradient(#888 0 25%, #ccc 0 50%) 0 0 / 8px 8px;
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.1);
    transition: transform var(--b-fast) var(--b-ease);
  }
  button.b-swatch:hover {
    transform: scale(1.08);
  }
  .b-swatch[aria-pressed='true']::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: calc(var(--s) * 0.3 + 4px);
    box-shadow: 0 0 0 2px var(--b-accent);
  }
`

interface SwatchProps {
  color: string
  size?: number
  label?: string // makes it a button when combined with onClick
  selected?: boolean
  onClick?: (e: MouseEvent) => void
}

export function Swatch({ color, size = 20, label, selected, onClick }: SwatchProps) {
  useStyles(styles)
  const style = { '--c': color, '--s': `${size}px` }
  if (!onClick) return <span class="b-swatch" style={style} aria-hidden="true" />
  return <button type="button" class="b-swatch" style={style} aria-label={label ?? color} title={label ?? color} aria-pressed={selected} onClick={onClick} />
}
