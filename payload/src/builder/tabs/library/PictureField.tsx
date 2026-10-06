// Folder picture: choose an image, see it as the tile first, then apply (or cancel). A picture replaces the icon.
import { useState } from 'preact/hooks'
import { ImagePlus, Trash2 } from 'lucide-static'
import type { ArtworkStyle, LibraryItemInfo } from '../../../types'
import { imageToDataUrl } from '../../../library'
import { css, useStyles } from '../../styles/sheet'
import { pickFile } from '../../lib/files'
import { Button } from '../../ui/Button'
import { ArtworkTile } from './ArtworkTile'

const styles = css`
  .b-pic {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .b-pic__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .b-pic__error {
    color: var(--b-warn);
    font-size: 12px;
  }
`

interface PictureFieldProps {
  kind: LibraryItemInfo['kind']
  style: ArtworkStyle
  onApply: (image: string | undefined) => void
}

export function PictureField({ kind, style, onApply }: PictureFieldProps) {
  useStyles(styles)
  const [pending, setPending] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const choose = async () => {
    setError(null)
    const file = await pickFile('image/*')
    if (!file) return
    setBusy(true)
    try {
      setPending(await imageToDataUrl(file))
    } catch {
      setError('That picture couldn’t be read. Try a JPG or PNG.')
    } finally {
      setBusy(false)
    }
  }

  if (pending) {
    return (
      <div class="b-pic">
        <ArtworkTile kind={kind} style={{ ...style, image: pending }} size={56} />
        <div class="b-pic__actions">
          <Button
            variant="primary"
            onClick={() => {
              onApply(pending)
              setPending(null)
            }}
          >
            Use this picture
          </Button>
          <Button onClick={() => setPending(null)}>Cancel</Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div class="b-pic__actions">
        <Button icon={ImagePlus} disabled={busy} onClick={() => void choose()}>
          {busy ? 'Preparing…' : style.image ? 'Change picture' : 'Upload picture'}
        </Button>
        {style.image && (
          <Button icon={Trash2} onClick={() => onApply(undefined)}>
            Remove picture
          </Button>
        )}
      </div>
      {error && (
        <div class="b-pic__error" role="alert">
          {error}
        </div>
      )}
    </>
  )
}
