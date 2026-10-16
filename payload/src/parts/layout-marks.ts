// Marks Spotify's layout grid (top bar, sidebars, main view, player bar) and each of its direct children with our own
// attributes, so layout rules can name them cheaply. Found by structure alone, the grid's columns are
// `grid > :has(…)`: a :has() that Chrome tries on every element of the page on every style recalc (measured: ~1/4 of
// our CSS cost). Rules keep their :has() for meaning (`[data-sc-grid-item]:has(#Desktop_PanelContainer_Id)`), but
// only the dozen marked items are tried. The grid item hosting a full-window scroll view (the lyrics or video view) is
// marked too, while it does: rules inside that view then cost nothing on every other page (Chrome skips a rule at once
// when an ancestor it names is missing).
// Marks are set synchronously in the observer callbacks (a microtask, before the next frame is drawn): a grid child
// that shows up unmarked would miss its layout for a frame and jump.
import { GRID_ATTR, GRID_ITEM_ATTR, GRID_SCROLL_ATTR, LAYOUT_GRID_FIND, SCROLL_HOST_ATTR } from './selectors'

function markItems(grid: Element, watch?: (item: Element) => void) {
  for (const child of grid.children) {
    if (!child.hasAttribute(GRID_ITEM_ATTR)) child.setAttribute(GRID_ITEM_ATTR, '')
    const scrolls = [...child.children].some(c => c.hasAttribute(SCROLL_HOST_ATTR))
    if (child.hasAttribute(GRID_SCROLL_ATTR) !== scrolls) child.toggleAttribute(GRID_SCROLL_ATTR, scrolls)
    watch?.(child)
  }
}

/** Marks the grid and its children now; the grid, or null while Spotify hasn't rendered it. */
export function markLayout(root: ParentNode = document): Element | null {
  const grid = root.querySelector(LAYOUT_GRID_FIND)
  if (!grid) return null
  if (!grid.hasAttribute(GRID_ATTR)) grid.setAttribute(GRID_ATTR, '')
  markItems(grid)
  return grid
}

export function startLayoutMarks(): () => void {
  let grid: Element | null = null

  // The grid's children and their children (a scroll view mounting or unmounting). A child that leaves the grid loses
  // its marks.
  const items = new MutationObserver(records => {
    for (const r of records) {
      if (r.target !== grid) continue
      for (const n of r.removedNodes) {
        if (n instanceof Element && n.parentElement !== grid) {
          n.removeAttribute(GRID_ITEM_ATTR)
          n.removeAttribute(GRID_SCROLL_ATTR)
        }
      }
    }
    if (grid) markItems(grid, watchItem)
  })
  const watchItem = (item: Element) => items.observe(item, { childList: true })
  // Only that one attribute, page-wide (filtered by the browser: cheap); child changes stay direct ones above.
  const scrollHosts = new MutationObserver(() => {
    if (grid) markItems(grid)
  })
  // Until the grid exists (boot), and whenever it's replaced: watch the document for it.
  const finder = new MutationObserver(() => {
    if (grid?.isConnected) return
    attach()
  })

  const attach = () => {
    items.disconnect()
    scrollHosts.disconnect()
    finder.disconnect()
    grid = markLayout()
    if (grid?.parentElement) {
      items.observe(grid, { childList: true })
      scrollHosts.observe(grid, { subtree: true, attributes: true, attributeFilter: [SCROLL_HOST_ATTR] })
      markItems(grid, watchItem)
      // The grid replaced, or the app root around it.
      finder.observe(grid.parentElement, { childList: true })
      if (grid.parentElement.parentElement) finder.observe(grid.parentElement.parentElement, { childList: true })
    } else {
      finder.observe(document.documentElement, { childList: true, subtree: true })
    }
  }

  attach()
  return () => {
    items.disconnect()
    scrollHosts.disconnect()
    finder.disconnect()
    for (const el of document.querySelectorAll(`[${GRID_ATTR}], [${GRID_ITEM_ATTR}]`)) {
      el.removeAttribute(GRID_ATTR)
      el.removeAttribute(GRID_ITEM_ATTR)
      el.removeAttribute(GRID_SCROLL_ATTR)
    }
  }
}
