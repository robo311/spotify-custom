import { afterEach, describe, expect, it } from 'vitest'
import { mountSpotifyLayout } from './fixtures/spotify-layout'
import { startLayoutMarks } from './layout-marks'
import { GRID_ATTR, GRID_ITEM_ATTR, GRID_SCROLL_ATTR, LAYOUT_GRID, LAYOUT_GRID_FIND, LYRICS_CINEMA_HOST, RIGHT_SIDEBAR } from './selectors'

/** MutationObserver callbacks run as microtasks: one turn is enough, no display frame needed. */
const microtask = () => Promise.resolve()
const grid = () => document.querySelector(LAYOUT_GRID_FIND)
const gridHtml = (extra = '') =>
  `<div data-testid="root"><div><div id="Desktop_LeftSidebar_Id"></div><div id="main-view"></div>${extra}</div></div>`

afterEach(() => document.body.replaceChildren())

describe('layout marks', () => {
  it('marks the grid and every direct child, so the cheap selectors find what the structural ones did', () => {
    mountSpotifyLayout() // marks already applied, as at runtime
    const g = grid()
    expect(g?.hasAttribute(GRID_ATTR)).toBe(true)
    expect([...(g?.children ?? [])].every(c => c.hasAttribute(GRID_ITEM_ATTR))).toBe(true)
    expect(document.querySelector(LAYOUT_GRID)).toBe(g)
    const panel = document.getElementById('Desktop_PanelContainer_Id')
    expect(document.querySelector(RIGHT_SIDEBAR)).toBe([...(g?.children ?? [])].find(c => c.contains(panel)))
    expect(g?.querySelectorAll(`:scope * [${GRID_ITEM_ATTR}]`)).toHaveLength(0) // only direct children
  })

  it('marks a new grid child before the next frame, and unmarks one that leaves', async () => {
    document.body.innerHTML = gridHtml()
    const stop = startLayoutMarks()
    const child = document.createElement('div')
    grid()?.append(child)
    await microtask()
    expect(child.hasAttribute(GRID_ITEM_ATTR)).toBe(true)
    child.remove()
    document.body.append(child)
    await microtask()
    expect(child.hasAttribute(GRID_ITEM_ATTR)).toBe(false)
    stop()
  })

  it('finds the grid once Spotify renders it, and again when it is replaced', async () => {
    const stop = startLayoutMarks()
    document.body.innerHTML = gridHtml()
    await microtask()
    expect(grid()?.hasAttribute(GRID_ATTR)).toBe(true)
    const root = document.querySelector('[data-testid="root"]')
    root?.replaceChildren()
    root?.insertAdjacentHTML('beforeend', '<div><div id="Desktop_LeftSidebar_Id"></div><div id="later"></div></div>')
    await microtask()
    await microtask()
    expect(grid()?.hasAttribute(GRID_ATTR)).toBe(true)
    expect(document.getElementById('later')?.hasAttribute(GRID_ITEM_ATTR)).toBe(true)
    stop()
  })

  it('marks the grid item hosting a full-window scroll view only while it does', async () => {
    document.body.innerHTML = gridHtml('<div id="cinema"></div>')
    const stop = startLayoutMarks()
    const cinema = document.getElementById('cinema')
    const scrolls = () => cinema?.hasAttribute(GRID_SCROLL_ATTR)
    expect(scrolls()).toBe(false)
    const view = document.createElement('div')
    cinema?.append(view) // the lyrics view mounts…
    await microtask()
    expect(scrolls()).toBe(false)
    view.setAttribute('data-overlayscrollbars', '') // …and OverlayScrollbars starts on it
    await microtask()
    expect(scrolls()).toBe(true)
    expect(document.querySelector(LYRICS_CINEMA_HOST)).toBe(cinema)
    view.remove()
    await microtask()
    expect(scrolls()).toBe(false)
    expect(document.querySelector(LYRICS_CINEMA_HOST)).toBeNull()
    stop()
  })

  it('removes every mark when stopped (hot reload boots a fresh copy)', () => {
    document.body.innerHTML = gridHtml()
    const stop = startLayoutMarks()
    stop()
    expect(document.querySelectorAll(`[${GRID_ATTR}], [${GRID_ITEM_ATTR}]`)).toHaveLength(0)
  })
})
