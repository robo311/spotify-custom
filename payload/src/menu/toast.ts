// A small themed confirmation near the bottom of the window ("Added to …"). One at a time; a new one replaces it.
import { TOAST_CSS } from './styles'

const HOST_ID = 'sc-menu-toast'
const SHOW_MS = 2400
const FADE_MS = 160

const OK = 'M3.5 8.5 6.5 11.5 12.5 4.5'
const BAD = 'M8 4.5v4.5M8 11.5v.01'

let hide = 0
let remove = 0

export function showToast(message: string, ok: boolean): void {
  hideToast()
  const host = document.createElement('div')
  host.id = HOST_ID
  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = TOAST_CSS
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.setAttribute('role', 'status')
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('class', ok ? 'ok' : 'bad')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', ok ? OK : BAD)
  svg.append(path)
  const text = document.createElement('span')
  text.textContent = message
  toast.append(svg, text)
  shadow.append(style, toast)
  document.body.append(host)
  hide = window.setTimeout(() => {
    toast.setAttribute('data-leaving', '')
    remove = window.setTimeout(hideToast, FADE_MS)
  }, SHOW_MS)
}

export function hideToast(): void {
  clearTimeout(hide)
  clearTimeout(remove)
  document.getElementById(HOST_ID)?.remove()
}
