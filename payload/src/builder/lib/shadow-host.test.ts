import { h } from 'preact'
import type { Store } from '../../types'
import type { UiSnapshot } from '../context'
import { observable } from './observable'
import { createShadowMount, isOwnElement } from './shadow-host'

describe('isOwnElement', () => {
  it("recognises the builder's own hosts and what's inside them", () => {
    const ui = observable<UiSnapshot>({ open: true, tab: 'start', picking: true, editingArtwork: null })
    const mount = createShadowMount('builder', 'div', {} as Store, ui, h('span', {}))
    const child = document.createElement('span')
    mount.host.append(child)
    expect(isOwnElement(mount.host)).toBe(true)
    expect(isOwnElement(child)).toBe(true)
    mount.unmount()
  })

  it("doesn't claim other features' sc- elements, so pick mode can still pick them", () => {
    const lyrics = document.createElement('div')
    lyrics.id = 'sc-lyrics-npv'
    const title = document.createElement('h2')
    title.id = 'sc-stats-title'
    lyrics.append(title)
    expect(isOwnElement(lyrics)).toBe(false)
    expect(isOwnElement(title)).toBe(false)
  })
})
