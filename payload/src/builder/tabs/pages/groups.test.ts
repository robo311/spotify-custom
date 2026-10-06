import { describe, expect, it } from 'vitest'
import { defaultPageStyle } from '../../../theme/model'
import { isGroupCustomised, PAGE_GROUPS, resetGroup } from './groups'

describe('Pages tab groups', () => {
  it('puts every page setting in exactly one tab', () => {
    const grouped = Object.values(PAGE_GROUPS).flat()
    expect(new Set(grouped).size).toBe(grouped.length)
    expect([...grouped].sort()).toEqual(Object.keys(defaultPageStyle()).sort())
  })

  it("resets only the tab's own settings", () => {
    const page = { ...defaultPageStyle(), artistBanner: 'tint' as const, rows: 'cards' as const }
    expect(resetGroup(page, 'artists')).toEqual({ ...defaultPageStyle(), rows: 'cards' })
  })

  it('tells which tabs differ from Spotify', () => {
    const page = { ...defaultPageStyle(), headerLayout: 'banner' as const }
    expect(isGroupCustomised(page, 'albums')).toBe(true)
    expect(isGroupCustomised(page, 'general')).toBe(false)
  })
})
