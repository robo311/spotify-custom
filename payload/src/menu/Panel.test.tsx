import { h, render } from 'preact'
import { describe, expect, it } from 'vitest'
import { Panel } from './Panel'
import type { PanelRow } from './model'
import { PANEL_CSS } from './styles'

const svg = () => document.createElementNS('http://www.w3.org/2000/svg', 'svg')

function labelsWithIconSlot(rows: PanelRow[]): boolean[] {
  const el = document.createElement('div')
  render(h(Panel, { rows, label: 'Menu' }), el)
  return [...el.querySelectorAll('[role=menuitem]')].map(r => r.querySelector('.icon, .cover') !== null)
}

describe('Panel', () => {
  it('keeps an icon-less row in line with rows that have icons (Spotify\'s "Remove from Liked Songs" has none)', () => {
    const rows: PanelRow[] = [
      { kind: 'item', entry: { id: 'a', label: 'Add to queue', icon: { kind: 'svg', node: svg() } } },
      { kind: 'item', entry: { id: 'b', label: 'Remove from Liked Songs' } },
    ]
    expect(labelsWithIconSlot(rows)).toEqual([true, true])
  })

  it('adds no empty icon column to a panel without icons', () => {
    const rows: PanelRow[] = [
      { kind: 'item', entry: { id: 'a', label: '5 minutes' } },
      { kind: 'item', entry: { id: 'b', label: '10 minutes' } },
    ]
    expect(labelsWithIconSlot(rows)).toEqual([false, false])
  })
})

describe('panel styles', () => {
  it('strokes every line icon in the text colour, chevrons and search included (they rendered as black triangles)', () => {
    expect(PANEL_CSS).toMatch(/^\.line \{ fill: none; stroke: currentColor;/m)
  })
})
