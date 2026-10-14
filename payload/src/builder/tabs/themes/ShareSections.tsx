// Themes › sharing: copy a code to send in any chat, save a file, or bring in someone else's theme.
import { useEffect, useState } from 'preact/hooks'
import { Check, Copy, Download, Share2 } from 'lucide-static'
import { useApp, useEnv } from '../../context'
import { css, useStyles } from '../../styles/sheet'
import { downloadText } from '../../lib/files'
import { shareFileName } from '../../lib/share-input'
import { Button } from '../../ui/Button'
import { Section } from '../../ui/Section'
import { ImportPanel } from './ImportPanel'

const styles = css`
  .b-share__code {
    padding: 10px 12px;
    border-radius: var(--b-r-md);
    background: var(--b-hover);
    box-shadow: inset 0 0 0 1px var(--b-line);
    color: var(--b-sub);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    user-select: all;
  }
  .b-share__row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
`

/** Clipboard API can be unavailable in embedded browsers; fall back to the classic selection copy. */
async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    document.body.append(area)
    area.select()
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- the only fallback when the Clipboard API is blocked
    document.execCommand('copy')
    area.remove()
  }
}

export function ShareSections() {
  useStyles(styles)
  const { store } = useEnv()
  const active = useApp(s => s.active)
  const [copied, setCopied] = useState(false)
  const code = store.exportShareCode()
  const hasPicture = Object.values(active.parts).some(p => p.layers?.some(l => 'data' in l.src))

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(t)
  }, [copied])

  return (
    <>
      <Section title="Share this theme" icon={Share2} tour="share">
        <span class="b-hint">Send the code to a friend. They paste it here and get exactly your look.</span>
        {hasPicture && (
          <span class="b-hint">
            It includes your bar picture, so the code is long ({Math.round(code.length / 1024)} KB): many chats won’t take it
            in one message, so Save as file is the easier way to send it.
          </span>
        )}
        <div class="b-share__code b-mono" title={code}>
          {code}
        </div>
        <div class="b-share__row">
          <Button
            variant="primary"
            icon={copied ? Check : Copy}
            onClick={() => void copyText(code).then(() => setCopied(true))}
          >
            {copied ? 'Copied' : 'Copy code'}
          </Button>
          <Button icon={Download} onClick={() => downloadText(shareFileName(active.name), code)}>
            Save as file
          </Button>
        </div>
      </Section>
      <Section title="Use a theme from someone" icon={Download}>
        <ImportPanel />
      </Section>
    </>
  )
}
