import { describe, expect, it } from 'vitest'
import { compilePanelFit } from './panel-fit'

describe('compilePanelFit', () => {
  const css = compilePanelFit()

  it('never lets the right panel scroll sideways (a focused tab used to slide everything left)', () => {
    expect(css).toMatch(/#Desktop_PanelContainer_Id \{\s*overflow: clip !important;/)
  })

  it('lets the panel tabs shrink to an ellipsis so the close button always fits', () => {
    expect(css).toContain('#Desktop_PanelContainer_Id div:has(> div > [role="tablist"])')
    expect(css).toContain('#Desktop_PanelContainer_Id [role="tablist"]')
    expect(css).toContain('#Desktop_PanelContainer_Id [role="tab"]')
    expect(css).toContain('text-overflow: ellipsis !important;')
    expect(css).toContain('min-width: 0 !important;')
  })
})
