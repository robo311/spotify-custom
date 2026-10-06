// One item in the "cards" layout: square artwork (round for artists) with the rank numeral breaking its corner.
import { pickImage, type TopItem, type TopKind } from './data'
import { itemAriaLabel, rankLabel } from './format'

interface Props {
  item: TopItem
  rank: number // 1-based
  kind: TopKind
  onOpen: (item: TopItem) => void
}

const CARD_IMAGE_MIN_WIDTH = 320

export function GridCard({ item, rank, kind, onOpen }: Props) {
  const image = pickImage(item.images, CARD_IMAGE_MIN_WIDTH)
  return (
    <button
      type="button"
      class={kind === 'artists' ? 'sc-card sc-round' : 'sc-card'}
      style={{ '--i': rank - 1 }}
      data-sc-item={item.uri}
      aria-label={itemAriaLabel(item, rank, kind)}
      onClick={() => onOpen(item)}
    >
      <span class="sc-card-media">
        {image ? <img src={image} alt="" loading="lazy" decoding="async" /> : <span class="sc-ph" />}
      </span>
      <span class="sc-card-rank" aria-hidden="true">
        {rankLabel(rank)}
      </span>
      <span class="sc-row-text">
        <span class="sc-name">{item.name}</span>
        <span class="sc-sub">{item.subtitle}</span>
      </span>
    </button>
  )
}
