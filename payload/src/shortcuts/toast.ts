// A small themed note above a shortcut button when its action failed. One at a time; it removes itself.
const HOST_ID = 'sc-shortcuts-toast'
const SHOW_MS = 2400

const STYLE = `
  :host { position: fixed; z-index: 2147483000; pointer-events: none; transform: translate(-50%, calc(-100% - 6px)); }
  p {
    margin: 0; padding: 6px 10px; max-width: 260px;
    font: 500 12px/1.35 "SC Inter", sans-serif; color: var(--sc-text);
    background: var(--sc-elevated); border: 1px solid var(--sc-border); border-radius: 8px;
    box-shadow: 0 4px 12px rgb(0 0 0 / .3);
    animation: in 160ms cubic-bezier(.2, .8, .2, 1);
  }
  @keyframes in { from { opacity: 0; transform: translateY(4px); } }
  @media (prefers-reduced-motion: reduce) { p { animation: none; } }
`

let timer = 0

export function showToast(message: string, at: DOMRect): void {
  hideToast()
  const host = document.createElement('div')
  host.id = HOST_ID
  host.style.left = `${at.left + at.width / 2}px`
  host.style.top = `${at.top}px`
  const root = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = STYLE
  const text = document.createElement('p')
  text.setAttribute('role', 'status')
  text.textContent = message
  root.append(style, text)
  document.body.append(host)
  timer = window.setTimeout(hideToast, SHOW_MS)
}

export function hideToast(): void {
  window.clearTimeout(timer)
  document.getElementById(HOST_ID)?.remove()
}
