#!/usr/bin/env node
// Dev tool: talk to the running Spotify over the DevTools protocol.
//   node scripts/cdp.mjs inject [file]          inject payload (default dist/payload.js) into the live page
//   node scripts/cdp.mjs eval "<js expression>"  evaluate in the page (awaits promises), print JSON result
//   node scripts/cdp.mjs shot <out.png> [selector] screenshot (whole window or element bbox)
// Env: SC_PORT (default 9222). Spotify must be running with --remote-debugging-port.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const port = process.env.SC_PORT || '9222'
const here = dirname(fileURLToPath(import.meta.url))

export async function connect() {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const page = list.find(t => t.type === 'page' && t.url.includes('xpui'))
  if (!page) throw new Error('Spotify xpui page not found — is Spotify running with --remote-debugging-port?')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.onopen = res
    ws.onerror = rej
  })
  let id = 0
  const pending = new Map()
  ws.onmessage = e => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id)
      pending.delete(m.id)
      if (m.error) rej(new Error(m.error.message))
      else res(m.result)
    }
  }
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const i = ++id
      pending.set(i, { res, rej })
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
    return r.result.value
  }
  return { send, evaluate, close: () => ws.close() }
}

async function main() {
  const [cmd, arg, arg2] = process.argv.slice(2)
  const c = await connect()
  try {
    if (cmd === 'inject') {
      const file = resolve(arg || resolve(here, '../dist/payload.js'))
      await c.evaluate(readFileSync(file, 'utf8') + '\n;void 0')
      console.log('injected', file)
    } else if (cmd === 'eval') {
      console.log(JSON.stringify(await c.evaluate(arg), null, 1))
    } else if (cmd === 'shot') {
      let clip
      if (arg2) {
        const r = await c.evaluate(`(() => { const r = document.querySelector(${JSON.stringify(arg2)})?.getBoundingClientRect(); return r && { x: r.x, y: r.y, width: r.width, height: r.height } })()`)
        if (r) clip = { ...r, scale: 1 }
      }
      const { data } = await c.send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) })
      writeFileSync(arg, Buffer.from(data, 'base64'))
      console.log('saved', arg)
    } else {
      console.log('usage: cdp.mjs inject [file] | eval "<expr>" | shot <out.png> [selector]')
    }
  } finally {
    c.close()
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(e => (console.error(e.message), process.exit(1)))
