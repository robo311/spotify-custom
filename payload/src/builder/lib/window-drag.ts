// Spotify marks the strip along the top of the window as a window-drag region (app-region: drag). The OS handles the
// mouse there itself, so the page gets no pointer moves or clicks over the empty parts of the top bar: pick mode
// couldn't see or select it. While picking, every region is made no-drag; restoring brings window dragging back.
const STYLE_ID = 'sc-pick-no-drag'

export function suspendWindowDrag(): () => void {
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = '* { -webkit-app-region: no-drag !important; app-region: no-drag !important; }'
  document.head.append(style)
  return () => style.remove()
}
