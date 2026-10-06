// One theme in the gallery: live miniature + name. Hover previews on Spotify (see gallery-preview); click commits.
import type { ComponentChildren } from 'preact'
import { Check } from 'lucide-static'
import type { Theme } from '../../../types'
import { useEnv } from '../../context'
import { css, useStyles } from '../../styles/sheet'
import { Icon } from '../../ui/Icon'
import { MiniSpotify } from './MiniSpotify'
import { useGalleryPreviewIntent } from './gallery-preview'

const styles = css`
  .b-card {
    position: relative;
    display: grid;
    width: 100%;
    gap: 8px;
    padding: 6px 6px 8px;
    border-radius: 13px;
    text-align: left;
    transition:
      background var(--b-fast) var(--b-ease),
      transform var(--b-med) var(--b-ease);
  }
  .b-card:hover {
    background: var(--b-hover);
    transform: translateY(-2px);
  }
  .b-card:active {
    transform: translateY(0) scale(0.985);
  }
  .b-card .b-mini {
    box-shadow:
      inset 0 0 0 1px rgb(255 255 255 / 0.06),
      0 6px 18px rgb(0 0 0 / 0.28);
    transition: box-shadow var(--b-med) var(--b-ease);
  }
  .b-card[aria-pressed='true'] .b-mini {
    box-shadow:
      0 0 0 2px var(--b-accent),
      0 6px 22px color-mix(in oklch, var(--b-accent) 30%, transparent);
  }
  .b-card__meta {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 0 2px;
  }
  .b-card__name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12.5px;
    font-weight: 500;
  }
  .b-card__check {
    display: grid;
    place-items: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--b-accent);
    color: var(--b-on-accent);
  }
`

interface ThemeCardProps {
  theme: Theme
  active: boolean
  /** Small trailing controls (rename/delete for your own themes). Rendered outside the button. */
  actions?: ComponentChildren
}

export function ThemeCard({ theme, active, actions }: ThemeCardProps) {
  useStyles(styles)
  const { store } = useEnv()
  const preview = useGalleryPreviewIntent()

  return (
    <div>
      <button
        type="button"
        class="b-card"
        aria-pressed={active}
        aria-label={`${theme.name}${active ? ' (in use)' : ''}`}
        onPointerEnter={() => preview.enter(theme)}
        onPointerLeave={() => preview.leaveCard()}
        onClick={e => {
          preview.commit()
          store.selectTheme(theme.id, { x: e.clientX, y: e.clientY })
        }}
      >
        <MiniSpotify theme={theme} />
        <span class="b-card__meta">
          <span class="b-card__name">{theme.name}</span>
          {active && (
            <span class="b-card__check">
              <Icon svg={Check} size={11} />
            </span>
          )}
        </span>
      </button>
      {actions}
    </div>
  )
}
