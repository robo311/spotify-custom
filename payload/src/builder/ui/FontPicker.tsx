// Font choice as a grid of tiles, each previewing the font in the theme's colours.
import type { FontId } from '../../types'
import { FONT_CHOICES, fontStack } from '../../theme/fonts'
import { useApp } from '../context'
import { css, useStyles } from '../styles/sheet'
import { OptionTiles, type TileOption } from './OptionTiles'

const styles = css`
  .b-fontprev {
    display: grid;
    place-items: center;
    height: 40px;
    background: var(--fp-bg);
    color: var(--fp-text);
    font-size: 20px;
    line-height: 1;
  }
`

interface FontPickerProps<T extends FontId | 'theme'> {
  label: string
  value: T
  onChange: (value: T) => void
  /** Leading "Theme" tile meaning "the same font as the rest of the theme". */
  withTheme?: boolean
}

export function FontPicker<T extends FontId | 'theme'>({ label, value, onChange, withTheme = false }: FontPickerProps<T>) {
  useStyles(styles)
  const palette = useApp(s => s.active.palette)
  const themeFont = useApp(s => s.active.font)
  const preview = (stack: string) => (
    <span class="b-fontprev" style={{ fontFamily: stack, '--fp-bg': palette.surface, '--fp-text': palette.text }}>
      Aa
    </span>
  )
  const choices = FONT_CHOICES.map(f => ({ value: f.id, label: f.label, preview: preview(f.stack) }))
  const options = (withTheme
    ? [{ value: 'theme', label: 'Theme', title: 'The same font as the rest of your theme', preview: preview(fontStack(themeFont)) }, ...choices]
    : choices) as TileOption<T>[]
  return <OptionTiles label={label} value={value} options={options} onChange={onChange} columns={4} />
}
