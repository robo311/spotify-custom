// Grid of theme cards. Works for presets and for your own themes (which get rename/delete controls).
import type { Theme } from '../../../types'
import { useApp } from '../../context'
import { css, useStyles } from '../../styles/sheet'
import { ThemeCard } from './ThemeCard'
import { UserThemeActions } from './UserThemeActions'

const styles = css`
  .b-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
    gap: 6px;
    margin: 0 -6px;
  }
`

export function ThemeGallery({ themes, editable = false }: { themes: readonly Theme[]; editable?: boolean }) {
  useStyles(styles)
  const activeId = useApp(s => s.active.id)

  return (
    <div class="b-gallery">
      {themes.map(t => (
        <ThemeCard key={t.id} theme={t} active={t.id === activeId} actions={editable ? <UserThemeActions theme={t} /> : undefined} />
      ))}
    </div>
  )
}
