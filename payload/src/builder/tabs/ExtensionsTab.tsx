// Extras: turn extensions on or off. Extensions from your folder are code, so they start switched off.
import { TriangleAlert } from 'lucide-static'
import type { ExtensionInfo } from '../../types'
import { useApp, useEnv } from '../context'
import { css, useStyles } from '../styles/sheet'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Section } from '../ui/Section'
import { Toggle } from '../ui/Toggle'

const styles = css`
  .b-ext__error {
    display: flex;
    gap: 6px;
    margin: -2px 0 8px;
    padding: 8px 10px;
    border-radius: var(--b-r-sm);
    background: color-mix(in oklch, var(--b-warn) 12%, transparent);
    color: var(--b-warn);
    font-size: 12px;
  }
  .b-ext__note {
    padding: 10px 12px;
    border-radius: var(--b-r-md);
    box-shadow: inset 0 0 0 1px var(--b-line);
    font-size: 12px;
    color: var(--b-sub);
  }
  .b-ext__empty {
    color: var(--b-sub);
    font-size: 12px;
  }
`

function ExtensionRow({ ext }: { ext: ExtensionInfo }) {
  const { store } = useEnv()
  return (
    <div>
      <Toggle label={ext.name} description={ext.description} checked={ext.enabled} onChange={v => store.setExtensionEnabled(ext.id, v)} />
      {ext.error && (
        <div class="b-ext__error" role="alert">
          <Icon svg={TriangleAlert} size={14} />
          <span>Stopped because of an error: {ext.error}</span>
        </div>
      )}
    </div>
  )
}

export function ExtensionsTab() {
  useStyles(styles)
  const { store } = useEnv()
  const extensions = useApp(s => s.extensions)
  const connected = useApp(s => s.helper.connected)
  const builtIn = extensions.filter(e => e.builtIn)
  const fromFolder = extensions.filter(e => !e.builtIn)

  return (
    <>
      <Section title="Built in">
        {builtIn.length ? builtIn.map(ext => <ExtensionRow key={ext.id} ext={ext} />) : <p class="b-ext__empty">Nothing here yet.</p>}
      </Section>
      <Section
        title="From your folder"
        aside={
          <Button disabled={!connected} onClick={() => store.openFolder('extensions')}>
            Open folder
          </Button>
        }
      >
        <p class="b-ext__note">Extensions can change anything in Spotify. Only turn on ones you got from someone you trust.</p>
        {fromFolder.length ? (
          fromFolder.map(ext => <ExtensionRow key={ext.id} ext={ext} />)
        ) : (
          <p class="b-ext__empty">
            Drop a <span class="b-mono">.js</span> extension into the folder and restart Spotify to see it here.
          </p>
        )}
      </Section>
    </>
  )
}
