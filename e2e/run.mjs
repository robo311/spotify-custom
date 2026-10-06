#!/usr/bin/env node
// Live end-to-end checks (spec §12.2) against the real Spotify on this machine.
// Reuses a running helper if one is connected; otherwise starts one in connect mode (Spotify must already run with
// --remote-debugging-port=$SC_PORT, default 9222) and stops it at the end. Asserts behaviour through the DevTools
// protocol and restores the originally active theme, so the user's live Spotify is left as it was found.
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { connect } from '../payload/scripts/cdp.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'e2e/out')
const port = process.env.SC_PORT || '9222'
mkdirSync(outDir, { recursive: true })

const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []

async function check(name, fn) {
  try {
    await fn()
    results.push({ name, ok: true })
    console.log(`  ✓ ${name}`)
  } catch (e) {
    results.push({ name, ok: false, error: e.message })
    console.log(`  ✗ ${name}\n      ${e.message}`)
  }
}

function assert(cond, message) {
  if (!cond) throw new Error(message)
}

async function waitFor(c, expr, { timeout = 15000, interval = 100 } = {}) {
  const end = Date.now() + timeout
  for (;;) {
    const v = await c.evaluate(expr).catch(() => undefined)
    if (v) return v
    if (Date.now() > end) throw new Error(`timed out waiting for: ${expr}`)
    await sleep(interval)
  }
}

// In-page helpers: colour normalisation (any CSS colour → canvas fillStyle form) and the current base background.
const PAGE_HELPERS = `
  window.__e2e ??= {
    norm(c) { const x = document.createElement('canvas').getContext('2d'); x.fillStyle = '#000'; x.fillStyle = c.trim(); return x.fillStyle },
    bg() { return this.norm(getComputedStyle(document.documentElement).getPropertyValue('--background-base')) },
    css() { return document.getElementById('sc-theme')?.textContent ?? '' },
  }; true`

async function helperConnected() {
  const c = await connect()
  try {
    return Boolean(await c.evaluate('window.__sc?.store?.get().helper.connected'))
  } finally {
    c.close()
  }
}

function startHelper() {
  return spawn('go', ['run', './cmd/spotifycustom', '--port', port, '--dev', '--payload', resolve(root, 'payload/dist/payload.js')], {
    cwd: resolve(root, 'helper'),
    stdio: ['ignore', 'inherit', 'inherit'],
  })
}

async function main() {
  const helper = (await helperConnected()) ? null : startHelper()
  console.log(helper ? 'started a helper for this run' : 'reusing the running helper')
  let c
  try {
    c = await connect()
    // Chromium pauses requestAnimationFrame for hidden windows, and the payload batches its DOM work per frame,
    // so results against a minimised or background-space Spotify are meaningless.
    if ((await c.evaluate('document.visibilityState')) !== 'visible') {
      throw new Error('Spotify window is hidden (minimised or on another desktop). Bring it to the front and rerun.')
    }
    const ready = 'window.__sc?.store?.get().ready && window.__sc.store.get().helper.connected'
    await check('helper injects payload and bridge connects', async () => {
      await waitFor(c, ready, { timeout: 30000 })
    })
    await c.evaluate(PAGE_HELPERS)
    const originalTheme = await c.evaluate('window.__sc.store.get().settings.activeTheme')
    const presetBg = id => c.evaluate(`window.__e2e.norm(window.__sc.store.get().presets.find(p => p.id === ${JSON.stringify(id)}).palette.background)`)

    await check('Darcula: --background-base equals palette background', async () => {
      await c.evaluate(`window.__sc.store.selectTheme('darcula')`)
      const want = await presetBg('darcula')
      await waitFor(c, `window.__e2e.bg() === ${JSON.stringify(want)}`, { timeout: 2000 })
    })

    await check('switch to Nord applies within 1 s without page reload', async () => {
      await c.evaluate('window.__e2eMarker = 1')
      await c.evaluate(`window.__sc.store.selectTheme('nord')`)
      const want = await presetBg('nord')
      await waitFor(c, `window.__e2e.bg() === ${JSON.stringify(want)}`, { timeout: 1000, interval: 50 })
      assert(await c.evaluate('window.__e2eMarker === 1'), 'page was reloaded')
    })

    await check('layout.hidden friendActivity hides the button', async () => {
      await c.evaluate(`window.__sc.store.edit(t => { t.layout.hidden = [...new Set([...t.layout.hidden, 'friendActivity'])] })`)
      await waitFor(c, `(() => { const el = document.querySelector('[data-testid="friend-activity-button"]'); return !el || getComputedStyle(el).display === 'none' })()`, { timeout: 2000 })
      await c.evaluate('window.__sc.store.undo()')
    })

    await check('share code round-trip gives identical compiled CSS', async () => {
      await c.evaluate(`window.__sc.store.selectTheme('nord')`)
      await sleep(700)
      const code = await c.evaluate('window.__sc.store.exportShareCode()')
      const before = await c.evaluate('window.__e2e.css()')
      await c.evaluate(`window.__sc.store.selectTheme('spotify-original')`)
      await sleep(700)
      await c.evaluate(`window.__sc.store.importTheme(window.__sc.store.parseShareCode(${JSON.stringify(code)}))`)
      await sleep(700)
      const after = await c.evaluate('window.__e2e.css()')
      assert(before.length > 0, 'no compiled CSS found in #sc-theme')
      assert(before === after, `compiled CSS differs (${before.length} vs ${after.length} chars)`)
      const imported = await c.evaluate('window.__sc.store.get().settings.activeTheme')
      await c.evaluate(`window.__sc.store.deleteTheme(${JSON.stringify(imported)})`)
    })

    await check('theme survives Page.reload without helper restart', async () => {
      await c.evaluate(`window.__sc.store.selectTheme('darcula')`)
      await sleep(800)
      // Spotify keeps the old document alive for a while after Page.reload; mark it so we wait for the new one.
      await c.evaluate('window.__e2eOldDocument = true')
      await c.send('Page.reload', {})
      c.close()
      await sleep(1500)
      c = await connect()
      await waitFor(c, `!window.__e2eOldDocument && document.readyState === 'complete' && ${ready}`, { timeout: 30000 })
      await c.evaluate(PAGE_HELPERS)
      const want = await presetBg('darcula')
      await waitFor(c, `window.__e2e.bg() === ${JSON.stringify(want)}`, { timeout: 5000 })
    })

    await check('stats shelf renders at least one item', async () => {
      await c.evaluate(`document.querySelector('[data-testid="home-button"]')?.click()`)
      const state = await waitFor(
        c,
        `(() => { const r = document.querySelector('[data-sc-shelf-key="ext:stats"]')?.shadowRoot; const s = r?.querySelector('[data-sc-state]')?.getAttribute('data-sc-state'); return s && s !== 'loading' ? s : null })()`,
        { timeout: 20000 },
      )
      const items = await c.evaluate(`document.querySelector('[data-sc-shelf-key="ext:stats"]').shadowRoot.querySelectorAll('[data-sc-item]').length`)
      assert(items >= 1, `state=${state}, items=${items}`)
    })

    await check('stats shelf hides on filtered Home (Music) and returns on All', async () => {
      const chips = `[...document.querySelectorAll('#main-view [data-carousel-item] > button[role="checkbox"][data-encore-id="chip"]')]`
      const statsDisplay = `getComputedStyle(document.querySelector('[data-sc-shelf-key="ext:stats"]')).display`
      await c.evaluate(`${chips}[1].click()`)
      await waitFor(c, `${statsDisplay} === 'none'`, { timeout: 3000 })
      await c.evaluate(`${chips}[0].click()`)
      await waitFor(c, `${statsDisplay} !== 'none'`, { timeout: 3000 })
    })

    await check('screenshots of every preset', async () => {
      const ids = await c.evaluate('window.__sc.store.get().presets.map(p => p.id)')
      for (const id of ids) {
        await c.evaluate(`window.__sc.store.selectTheme(${JSON.stringify(id)})`)
        await sleep(900)
        const { data } = await c.send('Page.captureScreenshot', { format: 'png' })
        writeFileSync(resolve(outDir, `${id}.png`), Buffer.from(data, 'base64'))
      }
      console.log(`      saved ${ids.length} screenshots to e2e/out/`)
    })

    await c.evaluate(`window.__sc.store.selectTheme(${JSON.stringify(originalTheme)})`)
  } finally {
    c?.close()
    helper?.kill('SIGINT')
  }

  const failed = results.filter(r => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  process.exit(failed.length ? 1 : 0)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
