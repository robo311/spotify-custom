// Root of the drawer layer: the drawer itself (mounted on first open) and pick mode.
import { useState } from 'preact/hooks'
import { useUi } from '../context'
import { Drawer } from './Drawer'
import { PickLayer } from '../pick/PickLayer'
import { useShortcuts } from './use-shortcuts'

export function App() {
  const open = useUi(s => s.open)
  const picking = useUi(s => s.picking)
  // Lazily mount on first open, then keep mounted so closing can animate and reopening is instant.
  const [everOpened, setEverOpened] = useState(open)
  if (open && !everOpened) setEverOpened(true)
  useShortcuts(open)

  return (
    <>
      {picking && <PickLayer />}
      {everOpened && <Drawer open={open} />}
    </>
  )
}
