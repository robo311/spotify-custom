// "Use someone's theme": paste a code (or open a file), see it on Spotify, then keep it.
import { useEffect, useState } from 'preact/hooks'
import { Eye, FolderOpen } from 'lucide-static'
import { useEnv } from '../../context'
import { css, useStyles } from '../../styles/sheet'
import { parseShareInput, type ShareParseResult } from '../../lib/share-input'
import { pickFile, readFileAsText } from '../../lib/files'
import { Button } from '../../ui/Button'
import { MiniSpotify } from '../start/MiniSpotify'

const styles = css`
  .b-import {
    display: grid;
    gap: 10px;
  }
  .b-import textarea {
    width: 100%;
    min-height: 70px;
    padding: 10px;
    border: 0;
    border-radius: var(--b-r-md);
    background: var(--b-hover);
    box-shadow: inset 0 0 0 1px var(--b-line);
    font-family: var(--b-mono);
    font-size: 11.5px;
    resize: vertical;
    word-break: break-all;
  }
  .b-import textarea:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--b-accent);
  }
  .b-import__error {
    color: var(--b-warn);
    font-size: 12px;
  }
  .b-import__found {
    display: grid;
    grid-template-columns: 120px 1fr;
    align-items: center;
    gap: 12px;
    padding: 10px;
    border-radius: var(--b-r-md);
    background: var(--b-hover);
  }
  .b-import__name {
    font-weight: 600;
  }
  .b-import__row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
`

export function ImportPanel() {
  useStyles(styles)
  const { store } = useEnv()
  const [text, setText] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const result: ShareParseResult | null = text.trim() ? parseShareInput(text, code => store.parseShareCode(code)) : null

  // Never leave Spotify showing a preview after the panel goes away.
  useEffect(() => () => store.preview(null), [store])

  const update = (next: string) => {
    if (previewing) store.preview(null)
    setPreviewing(false)
    setText(next)
  }

  const openFile = async () => {
    const file = await pickFile('.sctheme,.txt,text/plain')
    if (file) update(await readFileAsText(file))
  }

  return (
    <div class="b-import">
      <textarea aria-label="Share code" placeholder="Paste a share code here" spellcheck={false} value={text} onInput={e => update(e.currentTarget.value)} />
      {result && !result.ok && (
        <div class="b-import__error" role="alert">
          {result.message}
        </div>
      )}
      {result?.ok && (
        <div class="b-import__found">
          <MiniSpotify theme={result.theme} />
          <div class="b-import__row" style={{ display: 'grid', gap: '8px' }}>
            <span class="b-import__name">{result.theme.name}</span>
            <div class="b-import__row">
              <Button
                icon={Eye}
                aria-pressed={previewing}
                onClick={() => {
                  store.preview(previewing ? null : result.theme)
                  setPreviewing(!previewing)
                }}
              >
                {previewing ? 'Stop preview' : 'Preview'}
              </Button>
              <Button
                variant="primary"
                onClick={e => {
                  store.preview(null)
                  store.importTheme(result.theme, { x: e.clientX, y: e.clientY })
                  setPreviewing(false)
                  setText('')
                }}
              >
                Add theme
              </Button>
            </div>
          </div>
        </div>
      )}
      <div>
        <Button icon={FolderOpen} onClick={() => void openFile()}>
          Open a theme file…
        </Button>
      </div>
    </div>
  )
}
