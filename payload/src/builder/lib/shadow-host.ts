// Creates an element with an open shadow root that our Preact trees render into, isolated from Spotify's CSS.
import { h, render, type VNode } from 'preact'
import type { Store } from '../../types'
import { BuilderContext, type UiSnapshot } from '../context'
import type { Observable } from './observable'
import { adoptSheets } from '../styles/sheet'
import { tokens } from '../styles/tokens'

export interface ShadowMount {
  host: HTMLElement
  unmount(): void
}

export const OWN_ID_PREFIX = 'sc-'

/** Marks the builder's own hosts (drawer, entry button), so pick mode can ignore them. Not the `sc-` id prefix:
 *  other features' injected elements (lyrics panel, stats shelf) share it and must stay pickable. */
const OWN_ATTR = 'data-sc-builder-ui'

export function createShadowMount(id: string, tag: string, store: Store, ui: Observable<UiSnapshot>, app: VNode): ShadowMount {
  const host = document.createElement(tag)
  host.id = `${OWN_ID_PREFIX}${id}`
  host.setAttribute(OWN_ATTR, '')
  const root = host.attachShadow({ mode: 'open' })
  adoptSheets(root, [tokens])
  const mountPoint = document.createElement('div')
  mountPoint.style.display = 'contents'
  root.append(mountPoint)
  render(h(BuilderContext.Provider, { value: { store, ui, root } }, app), mountPoint)
  return {
    host,
    unmount() {
      render(null, mountPoint)
      host.remove()
    },
  }
}

export function isOwnElement(el: Element): boolean {
  return el.closest(`[${OWN_ATTR}]`) !== null
}
