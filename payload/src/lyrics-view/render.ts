// DOM of the animated lyrics view: lines of word spans built once per song, then per frame only the active line's
// words get their progress (--p) and emphasis (--g). Line states (past / active / distance) change on line changes.
import type { LyricsAnimation, PlaybackTrack } from '../types'
import { activeLineAt, wordProgress, type TimedLine } from './timing'
import { VIEW_CSS } from './styles'

export interface Typography {
  font: string
  size: string
  weight: string
  align: string
  zoom: string
}

export interface LineColours {
  sung: string
  rest: string
  past: string
}

export interface LyricsDom {
  setLyrics(timeline: TimedLine[], provider: string): void
  /** Fades the lines out (the next song's are on their way). */
  clearLyrics(): void
  setTrack(track: PlaybackTrack | null): void
  setOptions(options: LyricsAnimation): void
  setLook(typography: Typography, colours: LineColours): void
  /** Positions everything at playback time positionMs. */
  update(positionMs: number, durationMs: number | null): void
  dispose(): void
}

const DOTS = 3
/** Share of the way to its target a word's emphasis moves each frame (its glow fades in and out). */
const EASE_PER_FRAME = 0.2
/** Auto-follow pauses this long after the user scrolls the lyrics. */
const USER_SCROLL_MS = 3000
/** Where the active line sits, as a share of the view's height from the top. */
const FOLLOW_AT = 0.32

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) => {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

const time = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Emphasis of a word at progress p: full while sung, a trace after, none before. */
export const emphasis = (p: number) => (p <= 0 ? 0 : p < 1 ? 1 : 0.3)

export function createLyricsDom(shadow: ShadowRoot, onSeek: (ms: number) => void): LyricsDom {
  const style = document.createElement('style')
  style.textContent = VIEW_CSS
  const view = el('div', 'view entering')
  view.addEventListener('animationend', e => {
    if (e.target === view) view.classList.remove('entering')
  })
  const scroller = el('div', 'scroller')
  const lines = el('div', 'lines')
  scroller.append(lines)

  const panel = el('aside', 'panel')
  const cover = el('img', 'cover')
  cover.alt = ''
  const title = el('div', 'title')
  const artist = el('div', 'artist')
  const progress = el('div', 'progress')
  const track = el('div', 'track')
  const fill = el('div', 'fill')
  const at = el('span', '')
  const length = el('span', '')
  const times = el('div', 'times')
  track.append(fill)
  times.append(at, length)
  progress.append(track, times)
  panel.append(cover, title, artist, progress)
  view.append(scroller)
  shadow.append(style, view)

  let timeline: TimedLine[] = []
  let lineEls: HTMLElement[] = []
  let wordEls: HTMLElement[][] = []
  /** Eased emphasis of the active line's words. */
  let glow: number[] = []
  let active = -2
  let options: LyricsAnimation | null = null
  let lastUserScroll = -Infinity
  let lastDuration: number | null = null
  /** New lines wait, faded out, until the first update has put the sung one in place. */
  let revealOnUpdate = false
  let coverUrl: string | null = null
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')

  const markUserScroll = () => {
    lastUserScroll = performance.now()
  }
  scroller.addEventListener('wheel', markUserScroll, { passive: true })
  scroller.addEventListener('touchmove', markUserScroll, { passive: true })
  scroller.addEventListener('click', e => {
    const line = e.target instanceof Element ? e.target.closest<HTMLElement>('.line') : null
    const start = line ? timeline[Number(line.dataset.i)]?.startMs : undefined
    if (start !== undefined && !getSelection()?.toString()) {
      lastUserScroll = -Infinity
      onSeek(start)
    }
  })
  progress.addEventListener('click', e => {
    const rect = track.getBoundingClientRect()
    if (lastDuration && rect.width > 0) onSeek(((e.clientX - rect.left) / rect.width) * lastDuration)
  })

  const follow = (instant: boolean) => {
    const line = lineEls.at(active)
    if (active < 0 || !line || performance.now() - lastUserScroll < USER_SCROLL_MS) return
    const top = scroller.scrollTop + line.getBoundingClientRect().top - scroller.getBoundingClientRect().top - scroller.clientHeight * FOLLOW_AT
    scroller.scrollTo({ top, behavior: instant || reducedMotion.matches ? 'instant' : 'smooth' })
  }

  // A new layout, a resized window or new options move the lines; keep the active one in place.
  const resized = new ResizeObserver(() => {
    follow(true)
  })
  resized.observe(scroller)

  /** Line states after the active line changed: past / active, distance for the blur, words of other lines reset. */
  const setActive = (index: number, jumped: boolean) => {
    const previous = active
    active = index
    lineEls.forEach((line, i) => {
      line.classList.toggle('past', i < index)
      line.classList.toggle('active', i === index)
      line.style.setProperty('--d', String(Math.abs(i - index)))
    })
    glow = []
    for (const w of previous >= 0 ? (wordEls.at(previous) ?? []) : []) {
      w.style.removeProperty('--p')
      w.style.removeProperty('--g')
    }
    follow(jumped)
  }

  const updateActiveLine = (positionMs: number) => {
    if (active < 0 || active >= timeline.length) return
    const line = timeline[active]
    const words = wordEls[active]
    if (line.instrumental) {
      const share = (positionMs - line.startMs) / Math.max(1, line.endMs - line.startMs)
      words.forEach((dot, k) => dot.style.setProperty('--p', Math.min(1, Math.max(0, share * DOTS - k)).toFixed(3)))
      return
    }
    const byWord = options?.words !== false
    words.forEach((w, k) => {
      const timed = line.words.at(k)
      const p = timed && byWord ? wordProgress(timed, positionMs) : 1
      const from = glow.at(k) ?? 0
      const level = from + (emphasis(byWord ? p : 0.5) - from) * EASE_PER_FRAME
      glow[k] = level
      w.style.setProperty('--p', p.toFixed(3))
      w.style.setProperty('--g', level.toFixed(3))
    })
  }

  return {
    setLyrics(next, provider) {
      timeline = next
      active = -2
      lineEls = []
      wordEls = []
      const frag = document.createDocumentFragment()
      next.forEach((line, i) => {
        const lineEl = el('div', line.instrumental ? 'line break' : 'line')
        lineEl.dataset.i = String(i)
        const words: HTMLElement[] = []
        if (line.instrumental) {
          for (let k = 0; k < DOTS; k++) words.push(lineEl.appendChild(el('span', 'dot')))
        } else {
          for (const word of line.words) {
            const w = el('span', 'w', word.text.trim())
            lineEl.append(w)
            if (/\s$/.test(word.text)) lineEl.append(' ')
            words.push(w)
          }
        }
        lineEls.push(lineEl)
        wordEls.push(words)
        frag.append(lineEl)
      })
      if (provider) frag.append(el('div', 'credit', `Lyrics provided by ${provider}`))
      lines.replaceChildren(frag)
      scroller.scrollTop = 0
      lastUserScroll = -Infinity
      revealOnUpdate = true
    },
    clearLyrics() {
      lines.classList.add('leaving')
    },
    setTrack(t) {
      // Swap the cover once the new one is decoded, so it never blinks empty between songs.
      const url = t?.image ?? null
      if (url !== coverUrl) {
        coverUrl = url
        if (!url) cover.removeAttribute('src')
        else {
          const next = new Image()
          next.src = url
          const swap = () => {
            if (coverUrl === url) cover.src = url
          }
          next.decode().then(swap, swap)
        }
      }
      title.textContent = t?.name ?? ''
      artist.textContent = t?.artists.map(a => a.name).join(', ') ?? ''
    },
    setOptions(next) {
      options = next
      view.classList.toggle('words', next.words)
      view.classList.toggle('glow', next.glow)
      view.classList.toggle('lift', next.lift)
      view.classList.toggle('blur', next.blurRest)
      view.classList.toggle('gradient', next.gradient)
      view.dataset.layout = next.layout
      if (next.layout === 'cover-left' && !panel.isConnected) view.prepend(panel)
      if (next.layout !== 'cover-left') panel.remove()
      requestAnimationFrame(() => {
        follow(true)
      })
    },
    setLook(type, colours) {
      const s = view.style
      s.setProperty('--ly-font', type.font)
      s.setProperty('--ly-size', type.size)
      s.setProperty('--ly-weight', type.weight)
      s.setProperty('--ly-align', type.align)
      s.setProperty('--ly-zoom', type.zoom)
      const centred = type.align === 'center'
      s.setProperty('--ly-origin', centred ? 'center' : 'left')
      s.setProperty('--ly-justify', centred ? 'center' : 'flex-start')
      s.setProperty('--ly-sung', colours.sung)
      s.setProperty('--ly-rest', colours.rest)
      s.setProperty('--ly-past', colours.past)
    },
    update(positionMs, durationMs) {
      const index = activeLineAt(timeline, positionMs)
      if (index !== active) setActive(index, active === -2 || Math.abs(index - active) > 1)
      else if (performance.now() - lastUserScroll >= USER_SCROLL_MS && lastUserScroll > 0) {
        lastUserScroll = -Infinity
        follow(false)
      }
      updateActiveLine(positionMs)
      if (revealOnUpdate) {
        revealOnUpdate = false
        lines.classList.remove('leaving')
      }
      if (panel.isConnected) {
        lastDuration = durationMs
        fill.style.setProperty('--t', durationMs ? String(Math.min(1, positionMs / durationMs)) : '0')
        at.textContent = time(positionMs)
        length.textContent = durationMs ? time(durationMs) : ''
      }
    },
    dispose() {
      resized.disconnect()
      shadow.replaceChildren()
    },
  }
}
