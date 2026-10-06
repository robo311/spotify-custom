// The #1 item: full-height image on one side bleeding into a glow of its own colour; outlined numeral behind bold text.
import { useEffect, useState } from 'preact/hooks'
import { pickImage, type TopItem, type TopKind } from './data'
import { itemAriaLabel, rankLabel } from './format'
import { imageColor } from './image-color'

interface Props {
  item: TopItem
  kind: TopKind
  rangePhrase: string
  onOpen: (item: TopItem) => void
}

// Rendered at up to ~300 CSS px; ask for enough pixels for 2x displays.
const HERO_IMAGE_MIN_WIDTH = 560

export function HeroCard({ item, kind, rangePhrase, onOpen }: Props) {
  const image = pickImage(item.images, HERO_IMAGE_MIN_WIDTH)
  const glow = useImageColor(image)

  return (
    <button
      type="button"
      class="sc-hero"
      style={glow ? { '--glow': glow } : undefined}
      data-sc-item={item.uri}
      aria-label={itemAriaLabel(item, 1, kind)}
      onClick={() => onOpen(item)}
    >
      <span class="sc-hero-media">{image ? <img src={image} alt="" decoding="async" /> : <span class="sc-ph" />}</span>
      <span class="sc-hero-text">
        <span class="sc-hero-rank" aria-hidden="true">
          {rankLabel(1)}
        </span>
        <span class="sc-eyebrow">{`Your #1 ${kind === 'artists' ? 'artist' : 'track'} · ${rangePhrase}`}</span>
        <span class="sc-hero-name">{item.name}</span>
        <span class="sc-hero-sub">{item.subtitle}</span>
      </span>
    </button>
  )
}

function useImageColor(url: string | null): string | null {
  const [colour, setColour] = useState<string | null>(null)
  useEffect(() => {
    if (!url) return
    let current = true
    void imageColor(url).then(value => {
      if (current) setColour(value)
    })
    return () => {
      current = false
    }
  }, [url])
  return url ? colour : null
}
