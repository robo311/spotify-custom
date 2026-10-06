import { describe, expect, it } from 'vitest'
import { suspendWindowDrag } from './window-drag'

describe('suspendWindowDrag', () => {
  it('turns every window-drag region into a no-drag one until restored', () => {
    const restore = suspendWindowDrag()
    const style = document.getElementById('sc-pick-no-drag')
    expect(style?.textContent).toContain('app-region: no-drag !important')
    restore()
    expect(document.getElementById('sc-pick-no-drag')).toBeNull()
  })
})
