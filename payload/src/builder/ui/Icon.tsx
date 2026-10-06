// Renders a Lucide SVG string at the builder's stroke weight. Icons are decorative unless a label is given.
import { css, useStyles } from '../styles/sheet'

const styles = css`
  .b-icon {
    display: inline-grid;
    place-items: center;
    flex: none;
    line-height: 0;
  }
  .b-icon svg {
    width: 100%;
    height: 100%;
  }
`

const sized = new Map<string, string>()
function withStroke(svg: string): string {
  let out = sized.get(svg)
  if (!out) {
    out = svg.replace(/stroke-width="[\d.]+"/, 'stroke-width="1.75"').replace(/\s(width|height)="24"/g, '')
    sized.set(svg, out)
  }
  return out
}

export function Icon({ svg, size = 16, label }: { svg: string; size?: number; label?: string }) {
  useStyles(styles)
  return (
    <span
      class="b-icon"
      style={{ width: `${size}px`, height: `${size}px` }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: withStroke(svg) }}
    />
  )
}
