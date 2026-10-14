// A titled group inside a tab: a recessed module on the studio's faceplate, like one module in a rack. Its title
// sits beside a small key cap with its icon, so sections are easy to find while scrolling. A section
// with an id can be gone to (lib/navigate goTo): it scrolls into view and a crisp ring marks it for a moment.
import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { useEnv, useUi } from '../context'
import { css, useStyles } from '../styles/sheet'
import { Icon } from './Icon'

const styles = css`
  .b-section {
    display: grid;
    gap: 10px;
    margin: 0 12px 10px;
    padding: 14px 14px 16px;
    border-radius: var(--b-r-lg);
    background: var(--b-well);
    box-shadow: var(--b-well-edge);
    /* Gone to (goTo), it stops short of the panel's edge, so its ring shows whole. */
    scroll-margin-top: 12px;
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
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    margin: 0;
    font-size: 14.5px;
    font-weight: 650;
    letter-spacing: -0.015em;
    color: var(--b-text);
  }
  .b-section__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 26px;
    height: 26px;
    border-radius: var(--b-r-sm);
    background: var(--b-key);
    box-shadow: var(--b-key-edge);
    color: var(--b-text);
  }
  .b-section[data-focused='true'] {
    animation: b-section-found 1600ms var(--b-ease);
  }
  @keyframes b-section-found {
    from,
    50% {
      box-shadow:
        var(--b-well-edge),
        0 0 0 2px var(--b-accent);
    }
  }
`

/** How long the ring stays after going to a section. */
const FOUND_MS = 1600

/** A titled section always has an icon beside its title; an untitled one has neither. */
type Heading = { title: string; icon: string } | { title?: undefined; icon?: undefined }

type SectionProps = Heading & {
  aside?: ComponentChildren
  children: ComponentChildren
  /** Anchor the guided tour points at (tour/steps.ts). */
  tour?: string
  /** Where goTo can bring you; for a part's own section, the part id (shell/part-places.ts). */
  id?: string
}

export function Section(props: SectionProps) {
  const { title, aside, children, tour, id } = props
  useStyles(styles)
  const { ui } = useEnv()
  const wanted = useUi(s => id !== undefined && s.focus === id)
  const [found, setFound] = useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!wanted) return
    ui.set(s => ({ ...s, focus: undefined }))
    setFound(true)
    ref.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [wanted, ui])

  useEffect(() => {
    if (!found) return
    const t = setTimeout(() => setFound(false), FOUND_MS)
    return () => clearTimeout(t)
  }, [found])

  return (
    <section ref={ref} class="b-section" data-tour={tour} data-section={id} data-focused={found}>
      {(title ?? aside) && (
        <div class="b-section__head">
          {props.title !== undefined && (
            <h3 class="b-section__title">
              <span class="b-section__icon" aria-hidden="true">
                <Icon svg={props.icon} size={14} />
              </span>
              {title}
            </h3>
          )}
          {aside}
        </div>
      )}
      {children}
    </section>
  )
}
