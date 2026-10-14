// Look: what the whole theme shares. The accent up front, every other colour one click away, type and roundness,
// colours that follow the music, the icon pack, and the elements found all over Spotify (cards, buttons, play buttons).
import { useMemo, useState } from 'preact/hooks'
import { Blend, ChevronDown, Droplet, Type, WandSparkles } from 'lucide-static'
import type { FontId, Palette } from '../../types'
import { useApp, useEnv } from '../context'
import { css, useStyles } from '../styles/sheet'
import { PALETTE_KEYS } from '../lib/palette-meta'
import { fixFor } from '../lib/contrast'
import { contrastTools, useContrastIssues } from '../lib/use-contrast'
import { setPaletteColor } from '../lib/theme-edits'
import { suggestAccents } from '../lib/suggest'
import { MIN_ACCENT_CONTRAST, contrastRatio } from '../../theme/palette'
import { Button } from '../ui/Button'
import { ColorField } from '../ui/ColorField'
import { ColorPicker } from '../ui/color-picker/ColorPicker'
import { Icon } from '../ui/Icon'
import { Section } from '../ui/Section'
import { Field } from '../ui/Field'
import { FontPicker } from '../ui/FontPicker'
import { Slider } from '../ui/Slider'
import { Toggle } from '../ui/Toggle'
import { PartSection } from '../parts/PartSection'
import { ContrastBadge, ContrastMarker } from './look/ContrastBadge'
import { IconPacks } from './look/IconPacks'

const styles = css`
  .b-colours__alert {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 14px 20px 0;
    padding: 10px 12px;
    border-radius: var(--b-r-md);
    background: color-mix(in oklch, var(--b-warn) 12%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--b-warn) 35%, transparent);
    font-size: 12.5px;
  }
  .b-colours__alert span {
    flex: 1;
  }
  .b-colours__more {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 4px 0;
    color: var(--b-sub);
    font-weight: 500;
  }
  .b-colours__more:hover {
    color: var(--b-text);
  }
  .b-colours__more .b-icon {
    transition: transform var(--b-med) var(--b-ease);
  }
  .b-colours__more[aria-expanded='true'] .b-icon {
    transform: rotate(180deg);
  }
  .b-colours__list {
    display: grid;
    gap: 2px;
    margin: 0 -8px;
  }
`

export function LookTab() {
  useStyles(styles)
  const { store } = useEnv()
  const palette = useApp(s => s.active.palette)
  const font = useApp(s => s.active.font)
  const radius = useApp(s => s.active.radius)
  const effects = useApp(s => s.active.effects)
  const issues = useContrastIssues()
  const [showAll, setShowAll] = useState(false)
  const [openKey, setOpenKey] = useState<keyof Palette | null>(null)
  // Anchored to the accent as it was when the tab opened, so the ideas don't shift under the pointer while dragging.
  const [anchorAccent] = useState(palette.accent)
  const { background, surface } = palette
  const suggestions = useMemo(
    () => suggestAccents({ background, surface, accent: anchorAccent }, contrastRatio, MIN_ACCENT_CONTRAST),
    [background, surface, anchorAccent],
  )

  const setColor = (key: keyof Palette, hex: string) => store.edit(setPaletteColor(key, hex), { coalesceKey: `palette.${key}` })
  const fixAll = () =>
    store.edit(t => {
      // Fix one pair at a time against the progressively fixed palette, so later fixes see earlier ones.
      for (const issue of issues) Object.assign(t.palette, fixFor(t.palette, issue, contrastTools))
    })

  return (
    <>
      {issues.length > 0 && (
        <div class="b-colours__alert" role="status">
          <span>
            {issues.length === 1 ? 'One colour pair is' : `${issues.length} colour pairs are`} hard to read.
          </span>
          <Button icon={WandSparkles} onClick={fixAll}>
            Fix all
          </Button>
        </div>
      )}

      <Section title="Accent" icon={Droplet} tour="accent">
        <ColorPicker value={palette.accent} onChange={hex => setColor('accent', hex)} suggestions={suggestions} footer={<ContrastBadge colorKey="accent" />} />
      </Section>

      <Section>
        <button type="button" class="b-colours__more" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>
          <span class="b-label">All colours</span>
          <Icon svg={ChevronDown} size={14} />
        </button>
        {showAll && (
          <div class="b-colours__list">
            {PALETTE_KEYS.filter(m => m.key !== 'accent').map(m => (
              <ColorField
                key={m.key}
                label={m.label}
                hint={m.hint}
                value={palette[m.key]}
                open={openKey === m.key}
                onToggle={() => setOpenKey(openKey === m.key ? null : m.key)}
                onChange={hex => hex && setColor(m.key, hex)}
                badge={<ContrastMarker colorKey={m.key} />}
                footer={<ContrastBadge colorKey={m.key} />}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Type & shape" icon={Type}>
        <Field label="Font">
          <FontPicker<FontId>
            label="Font"
            value={font}
            onChange={v => store.edit(t => {
              t.font = v
            })}
          />
        </Field>
        <Slider
          label="Roundness"
          min={0}
          max={24}
          unit="px"
          value={radius}
          onInput={v => store.edit(t => {
            t.radius = v
          }, { coalesceKey: 'radius' })}
        />
      </Section>

      <Section title="Living colours" icon={Blend} tour="effects">
        <Toggle
          label="Album Mode"
          description="Colours follow the cover of whatever’s playing"
          checked={effects.albumMode}
          onChange={v =>
            store.edit(t => {
              t.effects.albumMode = v
            })
          }
        />
        <Toggle
          label="Ambient glow"
          description="A soft light from the cover behind each page"
          checked={effects.ambientGlow}
          onChange={v =>
            store.edit(t => {
              t.effects.ambientGlow = v
            })
          }
        />
      </Section>

      <IconPacks />

      <PartSection partId="cards" />
      <PartSection partId="buttons" />
      <PartSection partId="cardPlayButton" hint="Their size and shape on album and playlist pages: Pages › General." />
    </>
  )
}
