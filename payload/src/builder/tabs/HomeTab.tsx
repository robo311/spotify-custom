// Home: reorder and hide the shelves on Spotify's Home page. These are personal settings, not part of the theme.
import { House } from 'lucide-static'
import { useApp, useEnv } from '../context'
import { nextOrder, orderByKeys } from '../lib/reorder'
import { HOME_BUTTON } from '../selectors'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { ResetButton } from '../ui/ResetButton'
import { Section } from '../ui/Section'
import { SortableList } from '../ui/SortableList'

export function HomeTab() {
  const { store } = useEnv()
  const shelves = useApp(s => s.shelves)
  const home = useApp(s => s.settings.home)
  const ordered = orderByKeys(shelves, home.order).map(s => ({ ...s, note: s.stable ? undefined : 'Changes daily, hiding may not last' }))
  const customised = home.order.length > 0 || home.hidden.length > 0

  return (
    <Section
      title="Home shelves"
      aside={
        customised && (
          <ResetButton
            label="Reset Home to Spotify’s order"
            onClick={() =>
              store.editSettings(s => {
                s.home = { hidden: [], order: [] }
              })
            }
          />
        )
      }
    >
      {shelves.length === 0 ? (
        <EmptyState
          icon={House}
          action={
            <Button icon={House} onClick={() => document.querySelector<HTMLElement>(HOME_BUTTON)?.click()}>
              Go to Home
            </Button>
          }
        >
          Open Home in Spotify and its shelves appear here, ready to reorder or hide.
        </EmptyState>
      ) : (
        <>
          <span class="b-hint">Drag to reorder. Your order is kept even when Spotify changes Home.</span>
          <SortableList
            label="Home shelves"
            items={ordered}
            hidden={home.hidden}
            onReorder={next => store.editSettings(s => {
              s.home.order = nextOrder(s.home.order, next)
            })}
            onToggleHidden={(key, hidden) => store.editSettings(s => {
              const rest = s.home.hidden.filter(k => k !== key)
              s.home.hidden = hidden ? [...rest, key] : rest
            })}
          />
        </>
      )}
    </Section>
  )
}
