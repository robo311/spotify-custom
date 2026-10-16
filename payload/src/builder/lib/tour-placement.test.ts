import { clipBox, placeTourCard } from './tour-placement'

const viewport = { width: 1400, height: 900 }
const card = { width: 300, height: 160 }

describe('placeTourCard', () => {
  it('sits to the left of a target in the docked drawer, top-aligned', () => {
    expect(placeTourCard({ x: 1050, y: 200, width: 300, height: 120 }, card, viewport)).toEqual({ x: 1050 - 16 - 300, y: 200 })
  })

  it('goes to the right when there is no room on the left', () => {
    expect(placeTourCard({ x: 40, y: 200, width: 300, height: 120 }, card, viewport)).toEqual({ x: 40 + 300 + 16, y: 200 })
  })

  it('goes below a full-width target, then above when below does not fit', () => {
    const wide = { x: 0, y: 100, width: 1400, height: 80 }
    expect(placeTourCard(wide, card, viewport)).toEqual({ x: 12, y: 100 + 80 + 16 })
    const low = { x: 0, y: 700, width: 1400, height: 180 }
    expect(placeTourCard(low, card, viewport)).toEqual({ x: 12, y: 700 - 16 - 160 })
  })

  it('keeps the card inside the viewport vertically', () => {
    expect(placeTourCard({ x: 1050, y: 850, width: 300, height: 40 }, card, viewport).y).toBe(900 - 160 - 12)
  })

  it('centres the card near the bottom when there is no target', () => {
    expect(placeTourCard(null, card, viewport)).toEqual({ x: 550, y: 900 - 160 - 40 })
  })
})

describe('clipBox', () => {
  it('keeps the part of a tall target its scroll area shows (the spotlight ran past the drawer)', () => {
    const section = { x: 100, y: 200, width: 400, height: 1200 }
    const drawerBody = { x: 90, y: 120, width: 460, height: 600 }
    expect(clipBox(section, [drawerBody])).toEqual({ x: 100, y: 200, width: 400, height: 520 })
  })

  it('leaves a target that fits alone, and has no box when it is scrolled out of sight', () => {
    const box = { x: 10, y: 10, width: 50, height: 50 }
    expect(clipBox(box, [{ x: 0, y: 0, width: 500, height: 500 }])).toEqual(box)
    expect(clipBox(box, [{ x: 0, y: 100, width: 500, height: 500 }])).toBeNull()
  })
})
