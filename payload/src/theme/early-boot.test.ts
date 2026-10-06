// The payload is injected at document start, where on reload <html> (and so <head>) may not exist yet.
import { afterEach, describe, expect, it } from 'vitest'
import { createBridge } from '../core/bridge'
import { createStore } from '../core/store'
import { startEffects } from './effects'

const slotIds = () => Array.from(document.head.querySelectorAll('style[id^="sc-"]'), s => s.id)

describe('booting before <html> exists', () => {
  const html = document.documentElement

  afterEach(() => {
    localStorage.clear()
  })

  it('starts the store, recolor and effects without throwing, then attaches styles in cascade order', async () => {
    localStorage.setItem('sc:last-theme-css', ':root { --sc-background: #123456; }')
    html.remove()
    expect(document.querySelector(':root')).toBeNull()

    const store = createStore(createBridge())
    await store.init()
    const stopEffects = startEffects(store)
    expect(document.querySelector('style')).toBeNull()

    // The parser creates <html><head> later.
    const root = document.createElement('html')
    root.append(document.createElement('head'), document.createElement('body'))
    document.appendChild(root)
    await new Promise(r => setTimeout(r, 0))

    expect(slotIds()).toEqual(['sc-base', 'sc-theme', 'sc-recolor', 'sc-effects'])
    expect(document.getElementById('sc-theme')?.textContent).toContain('--sc-background: #1e1f22')

    stopEffects()
    store.dispose()
    root.remove()
    document.appendChild(html)
  })
})
