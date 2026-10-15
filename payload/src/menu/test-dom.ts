// Test helpers: a fake Spotify context menu (DOM + React fiber props, as on 1.3.4) and trusted-looking key presses.

type Props = Record<string, unknown>

export interface FakeItem {
  label: string
  /** Fiber props nearest first, e.g. [{ menuAction: 'add-to-queue' }, { uri }]. */
  chain: Props[]
  submenu?: boolean
  link?: boolean
  onClick?: () => void
}

export function fakeMenu(items: FakeItem[], depth = 0): HTMLElement {
  const root = document.createElement('div')
  root.setAttribute('data-tippy-root', '')
  const ul = document.createElement('ul')
  ul.setAttribute('role', 'menu')
  ul.setAttribute('data-depth', String(depth))
  for (const it of items) {
    const li = document.createElement('li')
    li.setAttribute('role', 'presentation')
    const el = document.createElement(it.link ? 'a' : 'button')
    el.setAttribute('role', 'menuitem')
    if (it.submenu) el.setAttribute('aria-expanded', 'false')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const span = document.createElement('span')
    span.textContent = it.label
    el.append(svg, span)
    if (it.onClick) el.addEventListener('click', it.onClick)
    let fiber: Props | null = { memoizedProps: { role: 'menu' }, return: null }
    for (const props of [...it.chain].reverse()) fiber = { memoizedProps: props, return: fiber }
    ;(el as unknown as Props).__reactFiber$t = { memoizedProps: { role: 'menuitem' }, return: fiber }
    li.append(el)
    ul.append(li)
  }
  if (depth === 0) {
    const cm = document.createElement('div')
    cm.id = 'context-menu'
    cm.setAttribute('data-testid', 'context-menu')
    cm.append(ul)
    root.append(cm)
  } else root.append(ul)
  return root
}

/** Lets MutationObservers and a couple of animation frames run. */
export async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) await new Promise(r => requestAnimationFrame(() => r(null)))
}

export function press(key: string): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  Object.defineProperty(e, 'isTrusted', { value: true })
  window.dispatchEvent(e)
  return e
}

export function shadowOf(id: string): ShadowRoot | null {
  return document.getElementById(id)?.shadowRoot ?? null
}

/** Visible row labels of each open panel (separators as ---, group labels in brackets). */
export function panels(id: string): string[][] {
  const shadow = shadowOf(id)
  if (!shadow) return []
  return [...shadow.querySelectorAll('.panel')].map(p =>
    [...p.querySelectorAll('.row, .sep, .group, .status')].map(el =>
      el.classList.contains('sep') ? '---' : el.classList.contains('group') ? `[${el.textContent}]` : el.textContent.trim(),
    ),
  )
}

export function row(id: string, depth: number, label: string): HTMLElement {
  const el = [...(shadowOf(id)?.querySelectorAll<HTMLElement>(`.panel[data-depth="${depth}"] .row`) ?? [])].find(r => r.textContent.trim() === label)
  if (!el) throw new Error(`no row ${label} at depth ${depth}`)
  return el
}
