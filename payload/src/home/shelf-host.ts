// Host element for an extension's custom Home shelf. Our own node (never a React one), rendered once into an
// open shadow root; when Spotify re-renders Home the same host is re-attached, so extension content survives.
import type { ShelfDef } from '../types'
import { extensionKey } from './keys'
import { SHELF_KEY_ATTR } from './selectors'

export interface ShelfHost {
  readonly key: string
  readonly title: string
  readonly element: HTMLElement
  dispose(): void
}

// Inherited custom properties (palette, --sc-*) and fonts cross the shadow boundary; Spotify's styles don't.
const BASE_STYLE = `
:host { display: block; min-width: 0; color: var(--sc-text, var(--text-base, #fff)); font-family: var(--sc-font-ui, inherit); }
.sc-shelf-body { display: block; min-width: 0; }
`

export function createShelfHost(def: ShelfDef): ShelfHost {
  const key = extensionKey(def.id)
  const element = document.createElement('section')
  element.className = 'sc-shelf'
  element.setAttribute(SHELF_KEY_ATTR, key)
  element.setAttribute('aria-label', def.title)

  const shadow = element.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = BASE_STYLE
  const body = document.createElement('div')
  body.className = 'sc-shelf-body'
  shadow.append(style, body)

  let cleanup: (() => void) | undefined
  try {
    cleanup = def.render(body) ?? undefined
  } catch (e) {
    console.error(`[spotify-custom] shelf "${def.id}" failed to render`, e)
  }

  return {
    key,
    title: def.title,
    element,
    dispose() {
      try {
        cleanup?.()
      } catch (e) {
        console.error(`[spotify-custom] shelf "${def.id}" cleanup failed`, e)
      }
      element.remove()
    },
  }
}
