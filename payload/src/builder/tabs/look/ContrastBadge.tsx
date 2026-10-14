// Readability of one palette colour against what it's paired with: a quiet line when fine, an amber one with
// a one-click Fix when not. Shows the weakest pairing, since that's the one people would notice.
import { useMemo } from 'preact/hooks'
import { CircleCheck, TriangleAlert } from 'lucide-static'
import type { Palette } from '../../../types'
import { useApp, useEnv } from '../../context'
import { css, useStyles } from '../../styles/sheet'
import { MIN_CONTRAST, fixFor, formatRatio, issuesFor, pairsFor } from '../../lib/contrast'
import { contrastTools, useContrastIssues } from '../../lib/use-contrast'
import { paletteLabel } from '../../lib/palette-meta'
import { Icon } from '../../ui/Icon'

const styles = css`
  .b-contrast {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 32px;
    padding: 0 4px 0 10px;
    border-radius: var(--b-r-sm);
    background: var(--b-hover);
    font-size: 12px;
    color: var(--b-sub);
  }
  .b-contrast__text {
    flex: 1;
    min-width: 0;
  }
  .b-contrast__ratio {
    padding-right: 6px;
    color: var(--b-sub);
    font-size: 11.5px;
  }
  .b-contrast .b-icon {
    color: #4cc38a;
  }
  .b-contrast[data-ok='false'] {
    background: color-mix(in oklch, var(--b-warn) 10%, transparent);
    color: var(--b-text);
  }
  .b-contrast[data-ok='false'] .b-icon,
  .b-contrast[data-ok='false'] .b-contrast__ratio {
    color: var(--b-warn);
  }
  .b-contrast__fix {
    height: 24px;
    padding: 0 10px;
    border-radius: 4px;
    background: var(--b-warn);
    color: #1a1a1a;
    font-size: 11.5px;
    font-weight: 600;
  }
  .b-contrast__fix:hover {
    background: color-mix(in oklch, var(--b-warn) 85%, white);
  }
  .b-contrast-marker {
    color: var(--b-warn);
  }
`

export function ContrastBadge({ colorKey }: { colorKey: keyof Palette }) {
  useStyles(styles)
  const { store } = useEnv()
  const palette = useApp(s => s.active.palette)
  const weakest = useMemo(() => pairsFor(colorKey, palette, contrastTools).at(0), [colorKey, palette])
  if (!weakest) return null

  const ok = weakest.ratio >= MIN_CONTRAST
  const other = paletteLabel(weakest.fg === colorKey ? weakest.bg : weakest.fg).toLowerCase()

  return (
    <div class="b-contrast" data-ok={ok} role="status">
      <Icon svg={ok ? CircleCheck : TriangleAlert} size={14} />
      <span class="b-contrast__text">{ok ? `Easy to read with ${other}` : `Hard to read with ${other}`}</span>
      <span class="b-contrast__ratio b-mono">{formatRatio(weakest.ratio)}</span>
      {!ok && (
        <button type="button" class="b-contrast__fix" onClick={() => store.edit(t => Object.assign(t.palette, fixFor(palette, weakest, contrastTools)))}>
          Fix
        </button>
      )}
    </div>
  )
}

/** Small icon-only marker for collapsed colour rows. */
export function ContrastMarker({ colorKey }: { colorKey: keyof Palette }) {
  useStyles(styles)
  const worst = issuesFor(colorKey, useContrastIssues()).at(0)
  if (!worst) return null
  return (
    <span class="b-contrast-marker" title={`Hard to read: ${formatRatio(worst.ratio)}`}>
      <Icon svg={TriangleAlert} size={14} label="Hard to read" />
    </span>
  )
}
