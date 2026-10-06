// Tile previews for the Pages tab: each header backdrop and row style drawn as a tiny page in the theme's colours.
import type { PageStyle } from '../../../types'
import { useApp } from '../../context'
import { css, useStyles } from '../../styles/sheet'
import type { TileOption } from '../../ui/OptionTiles'

const styles = css`
  .b-pgprev {
    position: relative;
    display: grid;
    grid-template-columns: 14px 1fr;
    align-content: start;
    gap: 3px 5px;
    height: 52px;
    padding: 8px 6px 0;
    background: var(--pp-bg);
    overflow: hidden;
  }
  .b-pgprev__back {
    position: absolute;
    inset: 0 0 45% 0;
    background: var(--pp-back);
  }
  .b-pgprev__cover {
    position: relative;
    grid-row: span 2;
    width: 14px;
    height: 14px;
    border-radius: 2px;
    background: var(--pp-cover);
    box-shadow: 0 2px 4px rgb(0 0 0 / 0.4);
  }
  .b-pgprev i {
    position: relative;
    display: block;
    height: 3px;
    border-radius: 2px;
    background: color-mix(in oklch, var(--pp-text) 70%, transparent);
  }
  .b-pgprev i:nth-of-type(2) {
    width: 60%;
    opacity: 0.6;
  }
  .b-rowprev {
    display: grid;
    gap: 3px;
    height: 52px;
    padding: 7px 6px;
    background: var(--pp-bg);
  }
  .b-rowprev i {
    display: block;
    height: 7px;
    border-radius: 2px;
  }
  .b-rowprev[data-rows='spotify'] i {
    background: transparent;
    box-shadow: inset 0 -1px 0 color-mix(in oklch, var(--pp-text) 10%, transparent);
  }
  .b-rowprev[data-rows='striped'] i:nth-child(even) {
    background: color-mix(in oklch, var(--pp-text) 9%, transparent);
  }
  .b-rowprev[data-rows='cards'] i {
    border-radius: 3px;
    background: var(--pp-elevated);
  }
  .b-rowprev[data-rows='lines'] i {
    border-radius: 0;
    box-shadow: inset 0 -1px 0 color-mix(in oklch, var(--pp-text) 22%, transparent);
  }
  .b-rowprev[data-rows='outlined'] i {
    border-radius: 3px;
    box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--pp-text) 22%, transparent);
  }
  .b-rowprev[data-rows='glow'] i:nth-child(2) {
    background: linear-gradient(90deg, color-mix(in oklch, var(--b-accent) 30%, transparent), transparent 70%);
    box-shadow: inset 2px 0 0 var(--b-accent);
  }
  .b-rowprev i::before {
    content: '';
    display: block;
    width: 55%;
    height: 2px;
    margin: 2.5px 6px;
    border-radius: 2px;
    background: color-mix(in oklch, var(--pp-text) 55%, transparent);
  }
`

type Backdrop = PageStyle['backdrop']
type Rows = PageStyle['rows']

function usePreviewVars() {
  const p = useApp(s => s.active.palette)
  const custom = useApp(s => s.active.pageStyle.backdropColor)
  return { '--pp-bg': p.background, '--pp-text': p.text, '--pp-elevated': p.elevated, '--pp-cover': p.accent, '--pp-custom': custom ?? p.accent }
}

const wash = (color: string) => `linear-gradient(color-mix(in oklch, ${color} 70%, var(--pp-bg)), color-mix(in oklch, ${color} 30%, var(--pp-bg)))`

const BACKDROP_PAINT: Record<Backdrop, string> = {
  spotify: 'linear-gradient(#6a9cb4, #2a4f5f)',
  accent: wash('var(--b-accent)'),
  theme: 'linear-gradient(var(--pp-elevated), var(--pp-bg))',
  'cover-blur': 'radial-gradient(60% 90% at 30% 20%, color-mix(in oklch, var(--b-accent) 60%, transparent), transparent), radial-gradient(70% 90% at 80% 40%, #8a5cc4, transparent), var(--pp-bg)',
  custom: wash('var(--pp-custom)'),
  none: 'none',
}

function BackdropPreview({ backdrop }: { backdrop: Backdrop }) {
  useStyles(styles)
  return (
    <span class="b-pgprev" style={{ ...usePreviewVars(), '--pp-back': BACKDROP_PAINT[backdrop] }}>
      <span class="b-pgprev__back" style={backdrop === 'cover-blur' ? { filter: 'blur(4px)' } : undefined} />
      <span class="b-pgprev__cover" />
      <i />
      <i />
    </span>
  )
}

function RowsPreview({ rows }: { rows: Rows }) {
  useStyles(styles)
  return (
    <span class="b-rowprev" data-rows={rows} style={usePreviewVars()}>
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}

export const BACKDROPS: readonly TileOption<Backdrop>[] = [
  { value: 'spotify', label: 'Cover colour', title: 'Spotify’s own: a colour picked from the cover', preview: <BackdropPreview backdrop="spotify" /> },
  { value: 'accent', label: 'Accent', preview: <BackdropPreview backdrop="accent" /> },
  { value: 'theme', label: 'Theme', preview: <BackdropPreview backdrop="theme" /> },
  { value: 'cover-blur', label: 'Blurred cover', preview: <BackdropPreview backdrop="cover-blur" /> },
  { value: 'custom', label: 'Own colour', title: 'A colour you pick', preview: <BackdropPreview backdrop="custom" /> },
  { value: 'none', label: 'None', preview: <BackdropPreview backdrop="none" /> },
]

export const ROWS: readonly TileOption<Rows>[] = [
  { value: 'spotify', label: 'Spotify', preview: <RowsPreview rows="spotify" /> },
  { value: 'striped', label: 'Striped', preview: <RowsPreview rows="striped" /> },
  { value: 'cards', label: 'Cards', preview: <RowsPreview rows="cards" /> },
  { value: 'lines', label: 'Lines', preview: <RowsPreview rows="lines" /> },
  { value: 'outlined', label: 'Outlined', preview: <RowsPreview rows="outlined" /> },
  { value: 'glow', label: 'Glow', title: 'An accent bar and glow on the row under the pointer', preview: <RowsPreview rows="glow" /> },
]
