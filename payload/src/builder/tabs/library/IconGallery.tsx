// Searchable grid of the built-in artwork icons (by meaning or by what they show).
import { useState } from 'preact/hooks'
import { Search } from 'lucide-static'
import { ARTWORK_ICONS } from '../../../library'
import { css, useStyles } from '../../styles/sheet'
import { Icon } from '../../ui/Icon'
import { searchIcons } from '../../lib/icon-search'

const styles = css`
  .b-igal {
    display: grid;
    gap: 8px;
  }
  .b-igal__search {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 32px;
    padding: 0 10px;
    border-radius: var(--b-r-sm);
    background: var(--b-hover);
    box-shadow: inset 0 0 0 1px var(--b-line);
    color: var(--b-sub);
  }
  .b-igal__search:focus-within {
    box-shadow: inset 0 0 0 1.5px var(--b-accent);
  }
  .b-igal__search input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: none;
    outline: none;
    color: var(--b-text);
  }
  .b-igal__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
    gap: 4px;
    max-height: 168px;
    overflow-y: auto;
    scrollbar-width: thin;
  }
  .b-igal__icon {
    display: grid;
    place-items: center;
    aspect-ratio: 1;
    border-radius: var(--b-r-sm);
    color: var(--b-sub);
    transition:
      background var(--b-fast) var(--b-ease),
      color var(--b-fast) var(--b-ease);
  }
  .b-igal__icon:hover {
    background: var(--b-hover);
    color: var(--b-text);
  }
  .b-igal__icon[aria-checked='true'] {
    background: var(--b-accent-soft);
    color: var(--b-accent);
    box-shadow: inset 0 0 0 1.5px var(--b-accent);
  }
  .b-igal__empty {
    color: var(--b-sub);
    font-size: 12px;
  }
`

export function IconGallery({ value, onChange }: { value: string | undefined; onChange: (id: string | undefined) => void }) {
  useStyles(styles)
  const [query, setQuery] = useState('')
  const icons = searchIcons(ARTWORK_ICONS, query)

  if (!ARTWORK_ICONS.length) return <p class="b-igal__empty">Icons aren’t available in this version yet.</p>

  return (
    <div class="b-igal">
      <label class="b-igal__search">
        <Icon svg={Search} size={14} />
        <input type="search" placeholder="Search icons" aria-label="Search icons" value={query} onInput={e => setQuery(e.currentTarget.value)} />
      </label>
      {icons.length === 0 ? (
        <p class="b-igal__empty">No icons match “{query}”.</p>
      ) : (
        <div class="b-igal__grid" role="radiogroup" aria-label="Folder icon">
          {icons.map(icon => (
            <button
              key={icon.id}
              type="button"
              role="radio"
              class="b-igal__icon"
              title={icon.label}
              aria-label={icon.label}
              aria-checked={icon.id === value}
              onClick={() => onChange(icon.id === value ? undefined : icon.id)}
            >
              <Icon svg={icon.svg} size={18} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
