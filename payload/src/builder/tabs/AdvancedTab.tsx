// Advanced: hand-written CSS (applied live, last), the customisations folder, and restarting Spotify.
import { useEffect, useRef, useState } from 'preact/hooks'
import { FolderOpen, RotateCw } from 'lucide-static'
import { useApp, useEnv } from '../context'
import { css, useStyles } from '../styles/sheet'
import { Button } from '../ui/Button'
import { Section } from '../ui/Section'

const styles = css`
  .b-css {
    width: 100%;
    min-height: 220px;
    padding: 12px;
    border: 0;
    border-radius: var(--b-r-md);
    background: color-mix(in oklch, var(--b-bg) 80%, black);
    box-shadow: inset 0 0 0 1px var(--b-line);
    color: var(--b-text);
    font-family: var(--b-mono);
    font-size: 12px;
    line-height: 1.6;
    tab-size: 2;
    resize: vertical;
    white-space: pre-wrap;
  }
  .b-css:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--b-accent);
  }
  .b-adv__path {
    padding: 8px 10px;
    border-radius: var(--b-r-sm);
    background: var(--b-hover);
    color: var(--b-sub);
    word-break: break-all;
  }
  .b-adv__status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--b-sub);
  }
  .b-adv__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--b-warn);
  }
  .b-adv__dot[data-ok='true'] {
    background: #4cc38a;
  }
`

const APPLY_DELAY_MS = 300
const EXAMPLE = `/* Runs after everything else. The palette is available as variables:
   --sc-background --sc-surface --sc-elevated --sc-text
   --sc-text-subdued --sc-accent --sc-on-accent --sc-border */
`

function CssEditor() {
  const { store } = useEnv()
  const saved = useApp(s => s.active.css)
  const [draft, setDraft] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const change = (value: string) => {
    setDraft(value)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      store.edit(t => {
        t.css = value
      }, { coalesceKey: 'css' })
      setDraft(null)
    }, APPLY_DELAY_MS)
  }

  return (
    <textarea
      class="b-css"
      aria-label="Custom CSS"
      spellcheck={false}
      placeholder={EXAMPLE}
      value={draft ?? saved}
      onInput={e => change(e.currentTarget.value)}
      onKeyDown={e => {
        if (e.key !== 'Tab' || e.shiftKey) return
        e.preventDefault()
        const el = e.currentTarget
        el.setRangeText('  ', el.selectionStart, el.selectionEnd, 'end')
        change(el.value)
      }}
    />
  )
}

export function AdvancedTab() {
  useStyles(styles)
  const { store } = useEnv()
  const helper = useApp(s => s.helper)

  return (
    <>
      <Section title="Custom CSS">
        <span class="b-hint">For people who know CSS. Changes apply as you type and are saved with this theme.</span>
        <CssEditor />
      </Section>
      <Section title="Your customisations folder">
        <span class="b-hint">Themes, icon packs and extensions you add by hand live here.</span>
        {helper.connected && <div class="b-adv__path b-mono">{helper.dataDir}</div>}
        <div>
          <Button icon={FolderOpen} disabled={!helper.connected} onClick={() => store.openFolder('')}>
            Open folder
          </Button>
        </div>
      </Section>
      <Section title="Spotify">
        <div class="b-adv__status">
          <span class="b-adv__dot" data-ok={helper.connected} />
          {helper.connected ? `Connected to Spotify Custom ${helper.version}` : 'Running without the Spotify Custom app: changes are kept in this Spotify only'}
        </div>
        <div>
          <Button icon={RotateCw} disabled={!helper.connected} onClick={() => store.restartSpotify()}>
            Restart Spotify
          </Button>
        </div>
      </Section>
    </>
  )
}
