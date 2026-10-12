import { listenEscape } from './escape-key'

const esc = () => new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, composed: true })

const teardowns: (() => void)[] = []
afterEach(() => {
  for (const fn of teardowns.splice(0)) fn()
})

function setup() {
  const host = document.createElement('div')
  document.body.append(host)
  const root = host.attachShadow({ mode: 'open' })
  const field = document.createElement('input')
  const plain = document.createElement('button')
  root.append(field, plain)
  const spotifyInput = document.createElement('input')
  document.body.append(spotifyInput)
  const handle = vi.fn()
  const page = vi.fn()
  window.addEventListener('keydown', page)
  const stop = listenEscape(root, handle)
  teardowns.push(() => {
    stop()
    window.removeEventListener('keydown', page)
    host.remove()
    spotifyInput.remove()
  })
  return { field, plain, spotifyInput, handle, page, stop }
}

describe('listenEscape', () => {
  it('lets a nested control that handles Esc itself win', () => {
    const t = setup()
    t.field.addEventListener('keydown', e => e.stopPropagation())
    t.field.dispatchEvent(esc())
    expect(t.handle).not.toHaveBeenCalled()
  })

  it('skips Esc a control already handled with preventDefault', () => {
    const t = setup()
    t.field.addEventListener('keydown', e => e.preventDefault())
    t.field.dispatchEvent(esc())
    expect(t.handle).not.toHaveBeenCalled()
  })

  it('takes Esc from inside our UI and keeps it from the page', () => {
    const t = setup()
    t.plain.dispatchEvent(esc())
    expect(t.handle).toHaveBeenCalledTimes(1)
    expect(t.page).not.toHaveBeenCalled()
  })

  it('takes Esc from outside our UI before the page sees it', () => {
    const t = setup()
    const spotify = vi.fn()
    t.spotifyInput.addEventListener('keydown', spotify)
    t.spotifyInput.dispatchEvent(esc())
    expect(t.handle).toHaveBeenCalledTimes(1)
    expect(spotify).not.toHaveBeenCalled()
  })

  it('stops listening once disposed', () => {
    const t = setup()
    t.stop()
    t.plain.dispatchEvent(esc())
    window.dispatchEvent(esc())
    expect(t.handle).not.toHaveBeenCalled()
  })
})
