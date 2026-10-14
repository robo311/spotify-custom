// Look › Icon pack: choose an icon pack from a gallery that shows the actual icons, or make your own. Icons for
// single buttons are chosen in their area's tab (Top bar, Player) and win over the pack.
// User packs are drawn as CSS masks (never injected as markup), so a pack file can't run code.
import { Check, Shapes } from 'lucide-static'
import type { IconPack } from '../../../types'
import { ICON_NAMES } from '../../../icons'
import { useApp, useEnv } from '../../context'
import { css, useStyles } from '../../styles/sheet'
import { SPOTIFY_ICON_SAMPLES } from '../../selectors'
import { Icon } from '../../ui/Icon'
import { Section } from '../../ui/Section'
import { Button } from '../../ui/Button'

const styles = css`
  .b-packs {
    display: grid;
    gap: 8px;
  }
  .b-pack {
    display: grid;
    gap: 10px;
    padding: 12px 14px;
    border-radius: var(--b-r-md);
    box-shadow: inset 0 0 0 1px var(--b-line);
    text-align: left;
    transition:
      background var(--b-fast) var(--b-ease),
      box-shadow var(--b-fast) var(--b-ease);
  }
  .b-pack:hover {
    background: var(--b-hover);
  }
  .b-pack[aria-pressed='true'] {
    box-shadow: inset 0 0 0 2px var(--b-accent);
    background: var(--b-accent-soft);
  }
  .b-pack__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 600;
  }
  .b-pack__check {
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--b-accent);
    color: var(--b-on-accent);
  }
  .b-pack__icons {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    color: var(--b-text);
  }
  .b-glyph {
    width: 20px;
    height: 20px;
    background: currentColor;
    mask: var(--m) center / contain no-repeat;
  }
  .b-glyph-native {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
  }
  .b-glyph-native svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }
`

const toMask = (svg: string) => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`

/** Spotify's own icons, copied from its live buttons (Spotify's markup, so safe to render as-is). */
function NativeIcons() {
  const samples = SPOTIFY_ICON_SAMPLES.map(sel => document.querySelector(sel)?.outerHTML).filter((svg): svg is string => Boolean(svg))
  if (!samples.length) return <span class="b-hint">Spotify’s original icons</span>
  return (
    <>
      {samples.map((svg, i) => (
        <span key={i} class="b-glyph-native" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
      ))}
    </>
  )
}

function PackIcons({ pack }: { pack: IconPack }) {
  const names = ICON_NAMES.filter(n => pack.icons[n])
  if (!names.length) return <NativeIcons />
  return (
    <>
      {names.slice(0, 10).map(n => (
        <span key={n} class="b-glyph" title={n} style={{ '--m': toMask(pack.icons[n]) }} />
      ))}
    </>
  )
}

export function IconPacks() {
  useStyles(styles)
  const { store } = useEnv()
  const packs = useApp(s => s.iconPacks)
  const current = useApp(s => s.active.icons)
  const connected = useApp(s => s.helper.connected)

  return (
    <Section title="Icon pack" icon={Shapes}>
      <span class="b-hint">Icons for single buttons are in Top bar and Player, and win over the pack.</span>
      <div class="b-packs" role="radiogroup" aria-label="Icon pack">
        {packs.map(pack => (
          <button
            key={pack.id}
            type="button"
            class="b-pack"
            role="radio"
            aria-checked={pack.id === current}
            aria-pressed={pack.id === current}
            onClick={() => store.edit(t => {
              t.icons = pack.id
            })}
          >
            <span class="b-pack__head">
              {pack.name}
              {pack.id === current && (
                <span class="b-pack__check">
                  <Icon svg={Check} size={12} />
                </span>
              )}
            </span>
            <span class="b-pack__icons" aria-hidden="true">
              <PackIcons pack={pack} />
            </span>
          </button>
        ))}
      </div>
      <span class="b-hint">
        Make your own: put SVG files named <span class="b-mono">play.svg</span>, <span class="b-mono">pause.svg</span>, <span class="b-mono">home.svg</span>… in a
        folder inside your icons folder. It appears here after restarting Spotify.
      </span>
      <div>
        <Button disabled={!connected} onClick={() => store.openFolder('icons')}>
          Open icons folder
        </Button>
      </div>
    </Section>
  )
}
