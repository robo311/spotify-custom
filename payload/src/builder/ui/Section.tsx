// A titled group inside a tab: a recessed module on the studio's faceplate, like one module in a rack.
import type { ComponentChildren } from 'preact'
import { css, useStyles } from '../styles/sheet'

const styles = css`
  .b-section {
    display: grid;
    gap: 10px;
    margin: 0 12px 10px;
    padding: 14px 14px 16px;
    border-radius: var(--b-r-lg);
    background: var(--b-well);
    box-shadow: var(--b-well-edge);
  }
  .b-section:first-child {
    margin-top: 12px;
  }
  .b-section__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 24px;
  }
  .b-section__title {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--b-text);
  }
`

interface SectionProps {
  title?: string
  aside?: ComponentChildren
  children: ComponentChildren
}

export function Section({ title, aside, children }: SectionProps) {
  useStyles(styles)
  return (
    <section class="b-section">
      {(title ?? aside) && (
        <div class="b-section__head">
          {title && <h3 class="b-section__title">{title}</h3>}
          {aside}
        </div>
      )}
      {children}
    </section>
  )
}
