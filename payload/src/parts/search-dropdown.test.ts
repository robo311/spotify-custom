import { defaultSearchDropdown } from '../theme/model'
import type { SearchDropdownLayout } from '../types'
import { SEARCH_DROPDOWN_DOM } from './fixtures/search-dropdown'
import { compileSearchDropdown, searchTextScrollCss } from './search-dropdown'

const apply = (layout: Partial<SearchDropdownLayout>) => {
  document.body.innerHTML = SEARCH_DROPDOWN_DOM
  const style = document.createElement('style')
  style.textContent = compileSearchDropdown({ ...defaultSearchDropdown(), ...layout })
  document.head.append(style)
  return style
}
const styleOf = (id: string) => {
  const el = document.getElementById(id)
  if (!el) throw new Error(`no #${id}`)
  return getComputedStyle(el)
}

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('compileSearchDropdown', () => {
  it("is empty for Spotify's own look", () => {
    expect(compileSearchDropdown(defaultSearchDropdown())).toBe('')
  })

  it('tightens every row for compact and dense', () => {
    apply({ density: 'compact' })
    expect(styleOf('song-row').paddingBlock).toBe('4px')
    expect(styleOf('term-row').paddingBlock).toBe('4px')
    apply({ density: 'dense' })
    expect(styleOf('song-row').paddingBlock).toBe('2px')
  })

  it('sizes covers and the search-term circles, with the magnifier at half their size', () => {
    apply({ imageSize: 32 })
    for (const id of ['song-image', 'term-image']) {
      expect(styleOf(id).width, id).toBe('32px')
      expect(styleOf(id).height, id).toBe('32px')
    }
    expect(styleOf('term-icon').width).toBe('16px')
  })

  it('sizes titles, with subtitles 2px smaller', () => {
    const css = compileSearchDropdown({ ...defaultSearchDropdown(), textSize: 14 })
    expect(css).toMatch(/\[data-encore-id="listRowTitle"\][^{]*\{\s*font-size: 14px !important;/)
    expect(css).toMatch(/\[data-encore-id="listRowSubtitle"\][^{]*\{\s*font-size: 12px !important;/)
  })

  it("sizes search-term titles too, whose inner text span sets Spotify's 16px itself", () => {
    // The rule must match the span itself: happy-dom lets an !important parent size win, a browser doesn't.
    const style = apply({ textSize: 14 })
    const selector = /([^{}]+)\{\s*font-size: 14px/.exec(style.textContent)?.[1] ?? ''
    expect(document.getElementById('term-title')?.matches(selector)).toBe(true)
  })

  it('lets the dropdown grow to the chosen height', () => {
    apply({ maxHeight: 600 })
    expect(styleOf('panel').maxHeight).toBe('600px')
    expect(styleOf('search-dropdown').height).toBe('600px')
  })

  it('hides the keyboard hint bar', () => {
    apply({ hideHints: true })
    expect(styleOf('hints').display).toBe('none')
  })

  it('drops the type label and its bullet before an artist, but keeps a type that stands alone', () => {
    apply({ hideTypeLabel: true })
    expect(styleOf('song-type').display).toBe('none')
    expect(styleOf('song-subtitle').fontSize).toBe('0px') // the " • " text node
    expect(styleOf('song-artist').fontSize).toBe('14px')
    expect(styleOf('artist-type').display).not.toBe('none')
  })
})

// Long titles and artist lists end in "…"; on hover (or the keyboard's row) they scroll to show the rest. The shortcut
// buttons take room from the text, so the text column must be able to shrink to keep them on its line.
describe('searchTextScrollCss', () => {
  const mount = () => {
    document.body.innerHTML = SEARCH_DROPDOWN_DOM
    const style = document.createElement('style')
    style.textContent = searchTextScrollCss()
    document.head.append(style)
  }

  it('lets the text column shrink', () => {
    mount()
    expect(styleOf('song-text').minWidth).toBe('0')
  })

  it("scrolls a selected row's title and subtitle by their overflow, and nothing else", () => {
    mount()
    // happy-dom caches computed styles: select first, read after.
    document.getElementById('song-row')?.setAttribute('aria-selected', 'true')
    for (const id of ['song-title', 'song-subtitle']) expect(styleOf(id).display, id).toBe('inline-block')
    const idleLine = document.querySelector('#artist-row [data-encore-id="listRowSubtitle"] > span')
    expect(idleLine && getComputedStyle(idleLine).display).not.toBe('inline-block')
    expect(searchTextScrollCss()).toMatch(/animation: sc-search-scroll [^;]*infinite alternate/)
    expect(searchTextScrollCss()).toMatch(/@keyframes sc-search-scroll \{[^@]*translateX\(min\(0px, calc\(100cqw - 100%\)\)\)/)
  })
})
