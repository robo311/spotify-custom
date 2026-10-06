import { describe, expect, it } from 'vitest'
import { PRESETS } from '../../theme/presets'
import { capture, hasChanges, restore } from './edit-session'
import { isPartCustomised, partSlices, resetPartFully } from './part-slices'

const theme = () => structuredClone(PRESETS[0])

describe('part extras', () => {
  it('lets Cancel put back the shortcut card layout', () => {
    const t = theme()
    const slices = partSlices('shortcuts')
    const snap = capture(t, slices)
    t.homeStyle.shortcutSize = 'large'
    t.homeStyle.shortcutColumns = 2
    expect(hasChanges(t, slices, snap)).toBe(true)
    restore(slices, snap)(t)
    expect(t.homeStyle).toMatchObject({ shortcutSize: 'spotify', shortcutColumns: 0 })
  })

  it("covers the Home button's icon", () => {
    const t = theme()
    const slices = partSlices('homeButton')
    const snap = capture(t, slices)
    t.iconOverrides = { home: { gallery: 'castle' } }
    expect(hasChanges(t, slices, snap)).toBe(true)
    restore(slices, snap)(t)
    expect(t.iconOverrides).toEqual({})
  })

  it('lets the search box editor own the search and browse icons', () => {
    const t = theme()
    t.iconOverrides = { search: { gallery: 'telescope' }, browse: { gallery: 'compass' }, home: { gallery: 'castle' } }
    resetPartFully('searchBox')(t)
    expect(t.iconOverrides).toEqual({ home: { gallery: 'castle' } })
  })

  it('resets extras with the part and counts them as customised', () => {
    const t = theme()
    t.homeStyle.statsLayout = 'grid'
    t.homeStyle.statsRanks = false
    t.iconOverrides = { home: { gallery: 'castle' }, search: { gallery: 'telescope' } }
    expect(isPartCustomised(t, 'stats')).toBe(true)
    expect(isPartCustomised(t, 'homeButton')).toBe(true)
    resetPartFully('stats')(t)
    resetPartFully('homeButton')(t)
    expect(t.homeStyle.statsLayout).toBe('hero')
    expect(t.homeStyle.statsRanks).toBe(true)
    expect(t.iconOverrides).toEqual({ search: { gallery: 'telescope' } })
    expect(isPartCustomised(t, 'stats')).toBe(false)
  })

  it("keeps the progress bar's style on reset, as before", () => {
    const t = theme()
    t.effects.progressBar = 'wave'
    resetPartFully('progressBar')(t)
    expect(t.effects.progressBar).toBe('wave')
  })
})
