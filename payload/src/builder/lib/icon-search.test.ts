import { searchIcons } from './icon-search'

const icons = [
  { id: 'star', label: 'Favourites' },
  { id: 'moon', label: 'Night' },
  { id: 'coffee', label: 'Coffee' },
]

describe('searchIcons', () => {
  it('finds icons by what they show or what they mean', () => {
    expect(searchIcons(icons, 'star').map(i => i.id)).toEqual(['star'])
    expect(searchIcons(icons, 'night').map(i => i.id)).toEqual(['moon'])
  })

  it('ignores case and surrounding spaces; empty query lists everything', () => {
    expect(searchIcons(icons, '  COF ').map(i => i.id)).toEqual(['coffee'])
    expect(searchIcons(icons, '')).toBe(icons)
  })
})
