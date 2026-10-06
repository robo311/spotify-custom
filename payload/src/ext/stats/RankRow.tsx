// Ranks 02–05 as chart rows: mono numeral in its own column, thumbnail, name and subtitle.
import { pickImage, type TopItem, type TopKind } from './data'
import { itemAriaLabel, rankLabel } from './format'

interface Props {
  item: TopItem
  rank: number // 1-based
  kind: TopKind
  onOpen: (item: TopItem) => void
}

const THUMB_MIN_WIDTH = 120

export function RankRow({ item, rank, kind, onOpen }: Props) {
  const image = pickImage(item.images, THUMB_MIN_WIDTH)
  return (
    <button
      type="button"
      class={kind === 'artists' ? 'sc-row sc-round' : 'sc-row'}
      style={{ '--i': rank - 1 }}
      data-sc-item={item.uri}
      aria-label={itemAriaLabel(item, rank, kind)}
      onClick={() => onOpen(item)}
    >
      <span class="sc-row-rank" aria-hidden="true">
        {rankLabel(rank)}
      </span>
      {image ? <img class="sc-thumb" src={image} alt="" loading="lazy" decoding="async" /> : <span class="sc-thumb sc-ph" />}
      <span class="sc-row-text">
        <span class="sc-name">{item.name}</span>
        <span class="sc-sub">{item.subtitle}</span>
      </span>
    </button>
  )
}
