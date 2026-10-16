import { afterEach, describe, expect, it, vi } from 'vitest'
import { startPanelDragToHide } from './panel-resize'

function need<T>(el: T | null): T {
  if (!el) throw new Error('missing element')
  return el
}

const bar = (min: number) =>
  `<div data-testid="LayoutResizer__resize-bar"><label><input class="LayoutResizer__input" type="range" min="${min}" max="420"></label></div>`

/** The right panel, 320px wide at the window's right edge (1000px), its resize bar on its left edge. */
function layout(panel = '<div data-npv-root="true"><div><button aria-label="Hide Now Playing view"></button></div></div>') {
  document.body.innerHTML = `
    <div data-testid="root"><div>
      <div id="Desktop_LeftSidebar_Id">${bar(280)}</div>
      <div id="right">${bar(280)}<aside id="Desktop_PanelContainer_Id">${panel}</aside><div><button aria-label="Show Now Playing view"></button></div></div>
    </div></div>`
  const right = need(document.getElementById('right'))
  right.getBoundingClientRect = () => ({ left: 680, right: 1000, top: 0, bottom: 800, width: 320, height: 800, x: 680, y: 0, toJSON: () => ({}) })
  const hide = vi.fn()
  const show = vi.fn()
  right.querySelector('aside button')?.addEventListener('click', hide)
  right.querySelector(':scope > div > button')?.addEventListener('click', show)
  return { right, hide, show }
}

const resizeBar = (root: ParentNode) => need(root.querySelector<HTMLElement>('[data-testid="LayoutResizer__resize-bar"]'))
const pointer = (type: string, target: EventTarget, clientX: number) =>
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX, button: 0 }))

/** Drags the bar from its spot to x, then lets go. */
function drag(handle: HTMLElement, x: number) {
  pointer('pointerdown', handle, 684)
  pointer('pointermove', window, (684 + x) / 2)
  pointer('pointermove', window, x)
  pointer('pointerup', window, x)
}

let stop: (() => void) | null = null
afterEach(() => {
  stop?.()
  stop = null
  document.body.innerHTML = ''
})

describe('startPanelDragToHide', () => {
  it('hides the Now playing panel when its edge is dragged well past the narrowest width', () => {
    const { right, hide } = layout()
    stop = startPanelDragToHide()
    drag(resizeBar(right), 900) // 100px wide: far under the 280px minimum
    expect(hide).toHaveBeenCalledTimes(1)
  })

  it('reveals the panel again when the same drag comes back, and hands the resize back to Spotify', () => {
    const { right, hide, show } = layout()
    stop = startPanelDragToHide()
    const spotifyMoves = vi.fn()
    const spotifyUp = vi.fn()
    document.addEventListener('pointermove', spotifyMoves, true)
    document.addEventListener('pointerup', spotifyUp, true)
    pointer('pointerdown', resizeBar(right), 684)
    pointer('pointermove', document.body, 760)
    expect(spotifyMoves).toHaveBeenCalledTimes(1)
    pointer('pointermove', document.body, 900) // 100px: hides
    expect(hide).toHaveBeenCalledTimes(1)
    pointer('pointermove', document.body, 950)
    pointer('pointermove', document.body, 815) // 185px: just over the line, not yet
    expect(spotifyMoves).toHaveBeenCalledTimes(1) // hidden: Spotify doesn't resize on against the changed layout
    expect(show).not.toHaveBeenCalled()
    pointer('pointermove', document.body, 790) // 210px: back
    expect(show).toHaveBeenCalledTimes(1)
    expect(spotifyMoves).toHaveBeenCalledTimes(2) // open again: Spotify resizes as usual, from this move on
    pointer('pointermove', document.body, 700)
    expect(spotifyMoves).toHaveBeenCalledTimes(3)
    pointer('pointermove', document.body, 900) // and it can hide again in the same drag
    expect(hide).toHaveBeenCalledTimes(2)
    pointer('pointerup', document.body, 900)
    expect(spotifyUp).toHaveBeenCalledTimes(1) // Spotify still ends its drag
    pointer('pointermove', document.body, 600) // let go: it stays hidden
    expect(show).toHaveBeenCalledTimes(1)
    document.removeEventListener('pointermove', spotifyMoves, true)
    document.removeEventListener('pointerup', spotifyUp, true)
  })

  it('leaves a panel that is already hidden alone (it opens with a click)', () => {
    const { right, hide, show } = layout()
    right.querySelector('aside')?.setAttribute('inert', '')
    stop = startPanelDragToHide()
    drag(resizeBar(right), 900)
    drag(resizeBar(right), 600)
    expect(hide).not.toHaveBeenCalled()
    expect(show).not.toHaveBeenCalled()
  })

  it('leaves a drag that stays near the narrowest width to Spotify', () => {
    const { right, hide } = layout()
    stop = startPanelDragToHide()
    drag(resizeBar(right), 760) // 240px: just past the minimum
    expect(hide).not.toHaveBeenCalled()
  })

  it("ignores the library's resize bar and the other panels (queue, friend activity)", () => {
    const { hide } = layout()
    stop = startPanelDragToHide()
    drag(resizeBar(need(document.getElementById('Desktop_LeftSidebar_Id'))), 900)
    expect(hide).not.toHaveBeenCalled()

    const queue = layout('<div><button aria-label="Close"></button></div>')
    drag(resizeBar(queue.right), 900)
    expect(queue.hide).not.toHaveBeenCalled()
  })

  it('folds our Now playing column instead while it stands beside the lyrics', () => {
    const { right, hide } = layout()
    const html = document.documentElement
    html.setAttribute('data-cinema-npv-postenter', '')
    html.setAttribute('data-sc-lyrics-npv', '')
    const column = document.createElement('div')
    column.id = 'sc-lyrics-npv'
    column.attachShadow({ mode: 'open' }).innerHTML = '<button class="fold"></button><button class="unfold"></button>'
    const fold = vi.fn()
    const unfold = vi.fn()
    column.shadowRoot?.querySelector('.fold')?.addEventListener('click', fold)
    column.shadowRoot?.querySelector('.unfold')?.addEventListener('click', unfold)
    document.body.append(column)
    stop = startPanelDragToHide()
    pointer('pointerdown', resizeBar(right), 684)
    pointer('pointermove', window, 900)
    expect(fold).toHaveBeenCalledTimes(1)
    pointer('pointermove', window, 700)
    expect(unfold).toHaveBeenCalledTimes(1)
    pointer('pointerup', window, 700)
    expect(hide).not.toHaveBeenCalled()

    column.shadowRoot?.replaceChildren() // already folded to its strip: nothing left to fold
    drag(resizeBar(right), 900)
    expect(fold).toHaveBeenCalledTimes(1)
    expect(hide).not.toHaveBeenCalled()
    html.removeAttribute('data-cinema-npv-postenter')
    html.removeAttribute('data-sc-lyrics-npv')
  })

  it('stops listening once disposed', () => {
    const { right, hide } = layout()
    startPanelDragToHide()()
    drag(resizeBar(right), 900)
    expect(hide).not.toHaveBeenCalled()
  })
})
