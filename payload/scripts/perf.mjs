#!/usr/bin/env node
// Dev tool: measures how heavy the running Spotify is, without changing anything in the page.
//   node scripts/perf.mjs [--seconds 10] [--json] [--baseline before.json]
//   node scripts/perf.mjs --styles [--json] [--baseline styles.json]   what our CSS costs Spotify's style work (below)
// CPU per process over the window, then a short trace (frames the page renders and what each costs), compositor
// layers, JS heap, DOM counters and running animations. Save a run with --json > before.json and compare a later one
// with --baseline before.json. Short samples are noisy (±5 points): compare runs taken in the same state.
// Port: SC_PORT, else the running Spotify's --remote-debugging-port (macOS), else 9222.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const flag = name => args.includes(name)
const option = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const SECONDS = Number(option('--seconds', '10'))
const TRACE_SECONDS = 3

function spotifyPort() {
  if (process.env.SC_PORT) return process.env.SC_PORT
  if (process.platform === 'darwin') {
    const ps = execFileSync('ps', ['-axo', 'command'], { encoding: 'utf8' })
    const m = ps.match(/Spotify\.app\/Contents\/MacOS\/Spotify .*--remote-debugging-port=(\d+)/)
    if (m) return m[1]
  }
  return '9222'
}
process.env.SC_PORT = spotifyPort()
const { connect } = await import('./cdp.mjs')

async function connectBrowser(port) {
  const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
  const ws = new WebSocket(webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.onopen = res
    ws.onerror = rej
  })
  let id = 0
  const pending = new Map()
  ws.onmessage = e => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m.result)
      pending.delete(m.id)
    }
  }
  const send = (method, params = {}) =>
    new Promise(res => {
      const i = ++id
      pending.set(i, res)
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  return { send, close: () => ws.close() }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d

/** CPU % of one core per process type, summed over processes of that type. */
async function cpu(browser) {
  const sample = async () => (await browser.send('SystemInfo.getProcessInfo')).processInfo
  const a = await sample()
  await sleep(SECONDS * 1000)
  const b = await sample()
  const out = {}
  for (const p of b) {
    const before = a.find(q => q.id === p.id)
    if (!before) continue
    const type = p.type === 'GPU' ? 'gpu' : p.type.replace(/\.mojom\.\w+$/, '')
    out[type] = (out[type] ?? 0) + ((p.cpuTime - before.cpuTime) / SECONDS) * 100
  }
  for (const k of Object.keys(out)) out[k] = round(out[k])
  return { pct: out, pids: b.map(p => ({ id: p.id, type: p.type })) }
}

/**
 * Memory footprint (MB) per process type, as Activity Monitor shows it; macOS only (Chrome doesn't report it over
 * CDP). Not RSS: macOS compresses idle pages, which drops RSS by hundreds of MB from one run to the next.
 */
function footprint(pids) {
  if (process.platform !== 'darwin') return null
  const unit = { KB: 1 / 1024, MB: 1, GB: 1024 }
  const out = {}
  for (const { id, type } of pids) {
    let text
    try {
      text = execFileSync('footprint', ['-p', String(id)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    } catch {
      continue // the process ended between the two calls
    }
    const m = text.match(/Footprint: ([\d.]+) (KB|MB|GB)/)
    if (!m) continue
    const key = type === 'GPU' ? 'gpu' : type.replace(/\.mojom\.\w+$/, '')
    out[key] = round((out[key] ?? 0) + Number(m[1]) * unit[m[2]], 0)
  }
  return out
}

/** Frames the page's renderer produced, and what the main thread spent per frame. */
async function frames(page) {
  const events = []
  let done
  const finished = new Promise(r => (done = r))
  const { ws } = page
  const listener = e => {
    const m = JSON.parse(e.data)
    if (m.method === 'Tracing.dataCollected') events.push(...m.params.value)
    if (m.method === 'Tracing.tracingComplete') done()
  }
  ws.addEventListener('message', listener)
  await page.send('Tracing.start', {
    transferMode: 'ReportEvents',
    traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'cc', 'viz'] },
  })
  await sleep(TRACE_SECONDS * 1000)
  await page.send('Tracing.end')
  await finished
  ws.removeEventListener('message', listener)

  const sum = name => {
    const hits = events.filter(e => e.name === name && e.ph === 'X' && e.dur)
    return { n: hits.length, ms: hits.reduce((s, e) => s + e.dur / 1000, 0) }
  }
  const main = sum('ProxyMain::BeginMainFrame')
  const commit = sum('Commit')
  const draws = sum('ProxyImpl::ScheduledActionDraw')
  return {
    mainFramesPerSec: round(main.n / TRACE_SECONDS),
    mainFrameMs: main.n ? round(main.ms / main.n, 2) : 0,
    commitMs: commit.n ? round(commit.ms / commit.n, 2) : 0,
    mainThreadMsPerSec: round(main.ms / TRACE_SECONDS, 0),
    drawsPerSec: round(draws.n / TRACE_SECONDS),
  }
}

async function layers(page) {
  let latest = []
  const listener = e => {
    const m = JSON.parse(e.data)
    if (m.method === 'LayerTree.layerTreeDidChange' && m.params.layers) latest = m.params.layers
  }
  page.ws.addEventListener('message', listener)
  await page.send('LayerTree.enable')
  await sleep(1000)
  await page.send('LayerTree.disable')
  page.ws.removeEventListener('message', listener)
  const drawn = latest.filter(l => l.drawsContent)
  return { total: latest.length, drawing: drawn.length, areaMpx: round(drawn.reduce((s, l) => s + l.width * l.height, 0) / 1e6) }
}

async function pageStats(page) {
  await page.send('Performance.enable')
  const metrics = Object.fromEntries((await page.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]))
  await page.send('Performance.disable')
  const counters = await page.send('Memory.getDOMCounters')
  const live = await page.evaluate(`(() => {
    const running = document.getAnimations().filter(a => a.playState === 'running')
    const names = {}
    for (const a of running) {
      const k = a.animationName || a.transitionProperty || 'script'
      names[k] = (names[k] ?? 0) + 1
    }
    return {
      elements: document.getElementsByTagName('*').length,
      runningAnimations: running.length,
      topAnimations: Object.entries(names).sort((a, b) => b[1] - a[1]).slice(0, 5),
      visible: document.visibilityState === 'visible',
    }
  })()`)
  return {
    heapUsedMB: round(metrics.JSHeapUsedSize / 2 ** 20, 0),
    heapTotalMB: round(metrics.JSHeapTotalSize / 2 ** 20, 0),
    nodes: counters.nodes,
    listeners: counters.jsEventListeners,
    documents: counters.documents,
    ...live,
  }
}

/**
 * --styles: what our CSS costs Spotify's own style work. Forces full style recalcs (a changing `*` rule) with our
 * sheets on and off, all inside one task so nothing is painted in between (no visible flash), then lists the
 * selectors that cost most during the same recalcs (Chrome's selector stats).
 */
const STYLE_ROUNDS = 15
const styleBench = (withOurs, rounds = STYLE_ROUNDS) => `(() => {
  const ours = [...document.querySelectorAll('style[id^="sc-"]')]
  const media = ours.map(s => s.media)
  if (!${withOurs}) for (const s of ours) s.media = 'not all'
  const probe = document.createElement('style')
  document.head.append(probe)
  const times = []
  for (let i = 0; i < ${rounds}; i++) {
    probe.textContent = '* { --sc-style-bench: ' + i + ' }'
    const t = performance.now()
    void document.documentElement.offsetHeight
    times.push(performance.now() - t)
  }
  probe.remove()
  ours.forEach((s, i) => (s.media = media[i]))
  times.sort((a, b) => a - b)
  return { median: times[times.length >> 1], elements: document.getElementsByTagName('*').length }
})()`

async function styles(page) {
  const runs = { on: [], off: [] }
  for (let i = 0; i < 3; i++) {
    runs.on.push((await page.evaluate(styleBench(true))).median)
    runs.off.push((await page.evaluate(styleBench(false))).median)
  }
  const median = a => [...a].sort((x, y) => x - y)[a.length >> 1]
  const ourSelectors = new Set(
    await page.evaluate(`(() => {
      const out = []
      const walk = rules => { for (const r of rules) { if (r.selectorText) out.push(r.selectorText); if (r.cssRules) walk(r.cssRules) } }
      for (const s of document.querySelectorAll('style[id^="sc-"]')) walk(s.sheet?.cssRules ?? [])
      return out
    })()`),
  )
  const events = []
  let done
  const finished = new Promise(r => (done = r))
  const listener = e => {
    const m = JSON.parse(e.data)
    if (m.method === 'Tracing.dataCollected') events.push(...m.params.value)
    if (m.method === 'Tracing.tracingComplete') done()
  }
  page.ws.addEventListener('message', listener)
  await page.send('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { includedCategories: ['disabled-by-default-blink.debug'] } })
  await page.evaluate(styleBench(true, 5))
  await page.send('Tracing.end')
  await finished
  page.ws.removeEventListener('message', listener)
  const cost = new Map()
  for (const e of events) {
    for (const t of e.name === 'SelectorStats' ? (e.args?.selector_stats?.selector_timings ?? []) : []) {
      const c = cost.get(t.selector) ?? { us: 0, tries: 0, hits: 0 }
      c.us += t['elapsed (us)'] ?? 0
      c.tries += t.match_attempts ?? 0
      c.hits += t.match_count ?? 0
      cost.set(t.selector, c)
    }
  }
  // Selector stats split selector lists; a selector counts as ours if one of our rules' lists contains it.
  const ourParts = new Set([...ourSelectors].flatMap(s => s.split(/,(?![^(]*\))/).map(p => p.trim())))
  const isOurs = s => ourSelectors.has(s) || ourParts.has(s)
  let oursUs = 0
  let allUs = 0
  for (const [s, c] of cost) {
    allUs += c.us
    if (isOurs(s)) oursUs += c.us
  }
  return {
    recalcMs: { withOurs: round(median(runs.on), 2), withoutOurs: round(median(runs.off), 2) },
    ourShareOfMatching: allUs ? round((oursUs / allUs) * 100, 0) : null,
    top: [...cost].sort((a, b) => b[1].us - a[1].us).slice(0, Number(option('--top', '15'))).map(([s, c]) => ({ ours: isOurs(s), ms: round(c.us / 1000, 1), tries: c.tries, hits: c.hits, selector: s })),
  }
}

const page = await connect()
const browser = await connectBrowser(process.env.SC_PORT)
try {
  if (flag('--styles')) {
    const s = await styles(page)
    if (flag('--json')) console.log(JSON.stringify(s, null, 1))
    else {
      const base = option('--baseline', null) && JSON.parse(readFileSync(option('--baseline'), 'utf8'))
      const vs = (v, b) => (typeof b === 'number' ? `  (${v - b >= 0 ? '+' : ''}${round(v - b, 2)} vs baseline ${b})` : '')
      console.log(`Full style recalc (median of ${STYLE_ROUNDS} × 3)`)
      console.log(`  with our CSS        ${s.recalcMs.withOurs} ms${vs(s.recalcMs.withOurs, base?.recalcMs?.withOurs)}`)
      console.log(`  without our CSS     ${s.recalcMs.withoutOurs} ms`)
      console.log(`  our CSS adds        ${round(s.recalcMs.withOurs - s.recalcMs.withoutOurs, 2)} ms per recalc`)
      console.log(`  our share of selector matching: ${s.ourShareOfMatching}%${vs(s.ourShareOfMatching, base?.ourShareOfMatching)}`)
      console.log('Costliest selectors')
      for (const t of s.top) console.log(`  ${String(t.ms).padStart(6)} ms ${String(t.tries).padStart(7)} tries ${String(t.hits).padStart(6)} hits  ${t.ours ? 'ours' : '    '}  ${t.selector.slice(0, 160)}`)
    }
    process.exit(0)
  }
  const { pct, pids } = await cpu(browser)
  const report = {
    at: new Date().toISOString(),
    seconds: SECONDS,
    cpu: pct,
    memoryMB: footprint(pids),
    frames: await frames(page),
    layers: await layers(page),
    page: await pageStats(page),
  }
  if (flag('--json')) {
    console.log(JSON.stringify(report, null, 1))
  } else {
    const base = option('--baseline', null) && JSON.parse(readFileSync(option('--baseline'), 'utf8'))
    const at = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)
    const line = (label, path, unit = '') => {
      const v = at(report, path)
      if (v === undefined || v === null) return
      const b = base ? at(base, path) : undefined
      const delta = typeof b === 'number' && typeof v === 'number' ? `  (${v - b >= 0 ? '+' : ''}${round(v - b)} vs baseline ${b})` : ''
      console.log(`  ${label.padEnd(30)} ${String(v).padStart(8)}${unit}${delta}`)
    }
    console.log(`Spotify on port ${process.env.SC_PORT}, CPU over ${SECONDS}s, frames over ${TRACE_SECONDS}s${report.page.visible ? '' : ' (window hidden)'}`)
    // A covered or minimised window still reports "visible", but Chrome stops drawing it: such a run measures nothing.
    if (report.frames.drawsPerSec === 0) console.log('  ! nothing was drawn: is the window covered or minimised? Compare runs with it in front.')
    console.log('CPU (% of one core)')
    for (const k of Object.keys(report.cpu).sort()) line(k, `cpu.${k}`, ' %')
    if (report.memoryMB) {
      console.log('Memory (MB footprint)')
      for (const k of Object.keys(report.memoryMB).sort()) line(k, `memoryMB.${k}`, ' MB')
    }
    console.log('Frames')
    line('main-thread frames / s', 'frames.mainFramesPerSec')
    line('main-thread ms / frame', 'frames.mainFrameMs', ' ms')
    line('  of which commit', 'frames.commitMs', ' ms')
    line('main-thread frame ms / s', 'frames.mainThreadMsPerSec', ' ms')
    line('compositor draws / s', 'frames.drawsPerSec')
    console.log('Page')
    line('compositor layers', 'layers.total')
    line('  drawing content', 'layers.drawing')
    line('  painted area', 'layers.areaMpx', ' Mpx')
    line('JS heap used', 'page.heapUsedMB', ' MB')
    line('DOM elements', 'page.elements')
    line('DOM nodes (incl. detached)', 'page.nodes')
    line('event listeners', 'page.listeners')
    line('running animations', 'page.runningAnimations')
    if (report.page.topAnimations.length) console.log(`    ${report.page.topAnimations.map(([n, c]) => `${n} ×${c}`).join(', ')}`)
  }
} finally {
  page.close()
  browser.close()
}
