import type { PlaybackState } from '../types'
import { startShortcuts, type ShortcutSource } from './index'
import { ALBUM, ARTIST, menuSettings, SEARCH_DROPDOWN_HTML, SEARCH_FORM_HTML, setRowSong, TRACK_A, TRACK_B, TRACK_LIST_HTML } from './fixtures'

const flush = async () => {
  await new Promise(resolve => setTimeout(resolve, 0))
  await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
  await new Promise(resolve => setTimeout(resolve, 0))
}

function fakeSource(overrides: Partial<ShortcutSource> = {}) {
  let emit: (s: PlaybackState | null) => void = () => undefined
  const fns = {
    addToQueue: vi.fn((_uris: string[]) => Promise.resolve()),
    removeFromQueue: vi.fn((_items: { uri: string; uid: string }[]) => Promise.resolve()),
    isLiked: vi.fn((uris: string[]) => Promise.resolve(uris.map(() => false))),
    setLiked: vi.fn((_uris: string[], _liked: boolean) => Promise.resolve()),
    copyLink: vi.fn((_uri: string) => Promise.resolve()),
    navigate: vi.fn((_path: string) => undefined),
    onPlayback: vi.fn((fn: (s: PlaybackState | null) => void) => {
      emit = fn
      return () => undefined
    }),
    openPlaylistPicker: vi.fn((_at: { x: number; y: number }, _uris: string[]) => undefined),
  }
  const source: ShortcutSource = { ...fns, uriToPath: uri => `/${uri.split(':').slice(1).join('/')}`, ...overrides }
  return { source, fns, emit: (s: PlaybackState | null) => emit(s) }
}

const row = () => {
  const el = document.querySelector('[data-testid="tracklist-row"]')
  if (!el) throw new Error('no row')
  return el
}
const hosts = () => document.querySelectorAll('.sc-shortcuts')
const button = (action: string, scope: ParentNode = document) => {
  const b = scope.querySelector('.sc-shortcuts')?.shadowRoot?.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)
  if (!b) throw new Error(`no ${action} button`)
  return b
}

let stop: (() => void) | null = null
function start(...args: Parameters<typeof startShortcuts>): () => void {
  const controller = startShortcuts(...args)
  return () => controller.dispose()
}
afterEach(() => {
  stop?.()
  stop = null
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('song rows', () => {
  beforeEach(() => {
    document.body.innerHTML = TRACK_LIST_HTML
    setRowSong(row(), TRACK_A, { uid: 'u1', album: ALBUM, artist: ARTIST })
  })

  it("puts the buttons first in the row's last cell, before Spotify's own, in the user's order", async () => {
    const { source } = fakeSource()
    stop = start(() => menuSettings({ rows: ['share', 'add-to-queue'] }), source)
    await flush()
    const cell = row().lastElementChild
    expect(cell?.firstElementChild?.className).toBe('sc-shortcuts')
    expect(cell?.children[1]?.id).toBe('spotify-add')
    const labels = [...(document.querySelector('.sc-shortcuts')?.shadowRoot?.querySelectorAll('button') ?? [])].map(b => b.getAttribute('aria-label'))
    expect(labels).toEqual(['Copy song link', 'Add to queue'])
    expect(button('share').tabIndex).toBe(-1)
  })

  it("widens the list's last column by the buttons, so Spotify's ✓ and the duration keep their room", () => {
    const widen = () => [...document.querySelectorAll('style')].map(s => s.textContent).find(t => t.includes('--last-min-width'))
    let settings = menuSettings({ rows: ['add-to-queue', 'add-to-playlist'] })
    const controller = startShortcuts(() => settings, fakeSource().source)
    expect(widen()).toContain('--last-min-width: 188px !important') // 120 + 2 × 28 + 12
    settings = menuSettings({ rows: [] })
    controller.refresh()
    expect(widen()).toBeUndefined()
    controller.dispose()
  })

  it('adds nothing for a place without shortcuts', async () => {
    const { source, fns } = fakeSource()
    stop = start(() => menuSettings({ rows: [], playerBar: [] }), source)
    await flush()
    expect(hosts()).toHaveLength(0)
    expect(fns.onPlayback).not.toHaveBeenCalled()
  })

  it('adds to queue in one click without the click reaching the row, and confirms with a check', async () => {
    const { source, fns } = fakeSource()
    const rowClick = vi.fn()
    row().addEventListener('click', rowClick)
    stop = start(() => menuSettings({ rows: ['add-to-queue'] }), source)
    await flush()
    const b = button('add-to-queue')
    const icon = b.innerHTML
    b.click()
    await flush()
    expect(fns.addToQueue).toHaveBeenCalledWith([TRACK_A])
    expect(rowClick).not.toHaveBeenCalled()
    expect(b.classList.contains('ok')).toBe(true)
    expect(b.innerHTML).not.toBe(icon)
    await new Promise(resolve => setTimeout(resolve, 1300))
    expect(b.classList.contains('ok')).toBe(false)
    expect(b.innerHTML).toBe(icon)
  })

  it('follows a reused row to its new song', async () => {
    const { source, fns } = fakeSource()
    stop = start(() => menuSettings({ rows: ['add-to-queue'] }), source)
    await flush()
    setRowSong(row(), TRACK_B)
    row().parentElement?.setAttribute('aria-rowindex', '40')
    await flush()
    button('add-to-queue').click()
    await flush()
    expect(fns.addToQueue).toHaveBeenCalledWith([TRACK_B])
    expect(hosts()).toHaveLength(1)
  })

  it('shows and toggles the Liked Songs state', async () => {
    const { source, fns } = fakeSource()
    stop = start(() => menuSettings({ rows: ['add-to-liked-songs'] }), source)
    await flush()
    await flush()
    const b = button('add-to-liked-songs')
    expect(fns.isLiked).toHaveBeenCalledWith([TRACK_A])
    expect(b.getAttribute('aria-pressed')).toBe('false')
    b.click()
    await flush()
    expect(fns.setLiked).toHaveBeenCalledWith([TRACK_A], true)
    expect(b.getAttribute('aria-pressed')).toBe('true')
    expect(b.classList.contains('on')).toBe(true)
    expect(b.getAttribute('aria-label')).toBe('Remove from Liked Songs')
  })

  it('opens the playlist picker at the button, and goes to the album and artist', async () => {
    const { source, fns } = fakeSource()
    stop = start(() => menuSettings({ rows: ['add-to-playlist', 'go-to-album', 'go-to-artist'] }), source)
    await flush()
    button('add-to-playlist').click()
    button('go-to-album').click()
    button('go-to-artist').click()
    await flush()
    expect(fns.openPlaylistPicker).toHaveBeenCalledWith({ x: expect.any(Number) as number, y: expect.any(Number) as number }, [TRACK_A])
    expect(fns.navigate.mock.calls).toEqual([['/album/61PCQeDaTD2gwfpHFikpbh'], ['/artist/3qiHUAX7zY4Qnjx8TNUzVx']])
  })

  it('hides go-to-album when the album is unknown', async () => {
    setRowSong(row(), TRACK_A)
    row().querySelector('a[href^="/album/"]')?.remove()
    const { source } = fakeSource()
    stop = start(() => menuSettings({ rows: ['go-to-album', 'go-to-artist'] }), source)
    await flush()
    expect(button('go-to-album').hidden).toBe(true)
    expect(button('go-to-artist').hidden).toBe(false) // from the row's artist link
  })

  it('goes to the song radio when the adapter can find it, and hides the button when it cannot', async () => {
    const without = fakeSource()
    stop = start(() => menuSettings({ rows: ['go-to-radio'] }), without.source)
    await flush()
    expect(button('go-to-radio').hidden).toBe(true)
    stop()

    const songRadio = vi.fn((_uri: string) => Promise.resolve('spotify:playlist:37i9dQZF1E8KRChqfZYnug'))
    const { source, fns } = fakeSource({ songRadio })
    stop = start(() => menuSettings({ rows: ['go-to-radio'] }), source)
    await flush()
    button('go-to-radio').click()
    await flush()
    expect(songRadio).toHaveBeenCalledWith(TRACK_A)
    expect(fns.navigate).toHaveBeenCalledWith('/playlist/37i9dQZF1E8KRChqfZYnug')
  })

  it('explains a failure in a toast and logs it once', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { source } = fakeSource({ copyLink: vi.fn(() => Promise.reject(new Error('nope'))) })
    stop = start(() => menuSettings({ rows: ['share'] }), source)
    await flush()
    button('share').click()
    await flush()
    button('share').click()
    await flush()
    expect(document.getElementById('sc-shortcuts-toast')?.shadowRoot?.textContent).toContain("Couldn't copy the link")
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]?.[0])).toContain('[spotify-custom]')
  })

  it('follows settings changes and leaves nothing behind on dispose', async () => {
    const { source } = fakeSource({ copyLink: vi.fn(() => Promise.reject(new Error('nope'))) })
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    let settings = menuSettings({ rows: ['share'] })
    const controller = startShortcuts(() => settings, source)
    await flush()
    settings = menuSettings({ rows: ['add-to-queue'] })
    controller.refresh()
    await flush()
    expect(hosts()).toHaveLength(1)
    expect(button('add-to-queue')).toBeTruthy()
    settings = menuSettings({ rows: ['share'] })
    controller.refresh()
    await flush()
    button('share').click()
    await flush()
    controller.dispose()
    expect(hosts()).toHaveLength(0)
    expect(document.getElementById('sc-shortcuts-toast')).toBeNull()
    setRowSong(row(), TRACK_B)
    row().parentElement?.setAttribute('aria-rowindex', '7')
    await flush()
    expect(hosts()).toHaveLength(0)
  })
})

describe("Spotify's own add button", () => {
  it('is hidden only where the user removed it, and comes back on dispose', () => {
    document.body.innerHTML = `${TRACK_LIST_HTML}<div data-testid="now-playing-widget"><button id="bar-add" aria-checked="false"></button></div>`
    const rowAdd = document.getElementById('spotify-add')
    const barAdd = document.getElementById('bar-add')
    let settings = { ...menuSettings({}), hideSpotifyAdd: ['rows' as const] }
    const controller = startShortcuts(() => settings, fakeSource().source)
    const shown = (el: Element | null) => el !== null && getComputedStyle(el).display !== 'none'
    expect(shown(rowAdd)).toBe(false)
    expect(shown(barAdd)).toBe(true)
    settings = { ...settings, hideSpotifyAdd: [] }
    controller.refresh()
    expect(shown(rowAdd)).toBe(true)
    settings = { ...settings, hideSpotifyAdd: ['rows'] }
    controller.refresh()
    controller.dispose()
    expect(shown(rowAdd)).toBe(true)
  })
})

describe('queue panel', () => {
  const panelRow = (uri: string) =>
    `<li role="row"><div><div data-encore-id="listRowTitle" id="listrow-title-${uri}">Song</div></div><div><button data-testid="more-button"></button></div></li>`

  beforeEach(() => {
    document.body.innerHTML = `<aside id="Desktop_PanelContainer_Id">
      <div id="queue-panel"><ul>${panelRow(TRACK_A)}</ul></div>
      <div id="history-panel"><ul>${panelRow(TRACK_B)}</ul></div>
    </aside>`
    const rows = document.querySelectorAll('li[role="row"]')
    const queued = rows.item(0)
    const history = rows.item(1)
    setRowSong(queued, TRACK_A, { uid: 'q1' })
    setRowSong(history, TRACK_B, { uid: 'h1' })
  })

  it('offers remove-from-queue only on queued rows and removes that entry by uid', async () => {
    const { source, fns } = fakeSource()
    stop = start(() => menuSettings({ queue: ['remove-from-queue', 'add-to-queue'] }), source)
    await flush()
    const rows = document.querySelectorAll('li[role="row"]')
    const queued = rows.item(0)
    const history = rows.item(1)
    expect(queued.querySelector('.sc-shortcuts')?.nextElementSibling?.getAttribute('data-testid')).toBe('more-button')
    expect(button('remove-from-queue', history).hidden).toBe(true)
    expect(button('add-to-queue', history).hidden).toBe(false)
    button('remove-from-queue', queued).click()
    await flush()
    expect(fns.removeFromQueue).toHaveBeenCalledWith([{ uri: TRACK_A, uid: 'q1' }])
  })

  it("stacks the buttons above the row's full-size click layer, like Spotify's own ⋯ (clicks went to the row)", async () => {
    stop = start(() => menuSettings({ queue: ['add-to-queue'] }), fakeSource().source)
    await flush()
    const css = document.querySelector('.sc-shortcuts')?.shadowRoot?.querySelector('style')?.textContent ?? ''
    expect(css).toMatch(/:host \{[^}]*position: relative; z-index: 1;/)
  })
})

describe('search suggestions', () => {
  const songRow = () => {
    const el = document.querySelector('#search-dropdown [role="row"][aria-rowindex="1"]')
    if (!el) throw new Error('no song row')
    return el
  }
  const openDropdown = () => {
    document.querySelector('form[role="search"]')?.insertAdjacentHTML('beforeend', SEARCH_DROPDOWN_HTML)
    setRowSong(songRow(), TRACK_A, { album: ALBUM, artist: ARTIST })
  }

  beforeEach(() => {
    document.body.innerHTML = SEARCH_FORM_HTML
  })

  it("puts the buttons on song suggestions only, before Spotify's ⋯, when the dropdown opens", async () => {
    const { source, fns } = fakeSource()
    stop = start(() => menuSettings({ search: ['add-to-queue', 'go-to-album'] }), source)
    await flush()
    openDropdown()
    await flush()
    expect(hosts()).toHaveLength(1)
    expect(document.getElementById('song-trailing')?.firstElementChild?.className).toBe('sc-shortcuts')
    expect(document.getElementById('song-menu')?.previousElementSibling?.className).toBe('sc-shortcuts')
    button('go-to-album').click()
    button('add-to-queue').click()
    await flush()
    expect(fns.navigate).toHaveBeenCalledWith('/album/61PCQeDaTD2gwfpHFikpbh')
    expect(fns.addToQueue).toHaveBeenCalledWith([TRACK_A])
  })

  // Recent searches (1.3.5): no ⋯, only a remove × after the text. Appended to the row, the buttons wrapped onto a
  // line of their own (the row is a two-column grid).
  it('puts the buttons before the remove × on a recent search, in the row with the text', async () => {
    stop = start(() => menuSettings({ search: ['add-to-queue'] }), fakeSource().source)
    document.querySelector('form[role="search"]')?.insertAdjacentHTML(
      'beforeend',
      `<div id="search-dropdown" role="listbox" data-testid="search-dropdown"><ul role="grid" data-encore-id="typeList">
        <div data-encore-id="listRow" role="row" aria-rowindex="0">
          <div data-testid="mouse-only-link"></div>
          <div><div><img data-testid="entity-image" alt=""><div role="gridcell"><button></button></div></div></div>
          <div id="recent-text"><div><div role="gridcell"><a href="/track/54E6zLaoW4ofXKaXhLVu3G"><span data-encore-id="listRowTitle">POP/STARS</span></a></div>
            <p data-encore-id="listRowSubtitle"><span>Song</span> • <a href="/artist/1">K/DA</a></p></div>
            <div id="recent-remove"><div role="gridcell"><button data-encore-id="buttonTertiary"></button></div></div></div>
        </div>
      </ul></div>`,
    )
    const row = document.querySelector('#search-dropdown [role="row"]')
    if (row) setRowSong(row, TRACK_A)
    await flush()
    expect(hosts()).toHaveLength(1)
    expect(document.getElementById('recent-remove')?.previousElementSibling?.className).toBe('sc-shortcuts')
    expect(document.getElementById('recent-text')?.contains(hosts().item(0))).toBe(true)
  })

  it('drops the buttons when the dropdown closes and adds them again when it reopens', async () => {
    stop = start(() => menuSettings({ search: ['share'] }), fakeSource().source)
    openDropdown()
    await flush()
    document.getElementById('search-dropdown')?.remove()
    await flush()
    expect(hosts()).toHaveLength(0)
    openDropdown()
    await flush()
    expect(hosts()).toHaveLength(1)
  })

  it("hides Spotify's ✓ on song suggestions only when the user removed it there", () => {
    document.body.innerHTML = SEARCH_FORM_HTML
    openDropdown()
    const shown = (id: string) => {
      const el = document.getElementById(id)
      return el !== null && getComputedStyle(el).display !== 'none'
    }
    const controller = startShortcuts(() => ({ ...menuSettings({}), hideSpotifyAdd: ['search'] }), fakeSource().source)
    expect(shown('song-save')).toBe(false)
    expect(shown('playlist-save')).toBe(true)
    controller.dispose()
    expect(shown('song-save')).toBe(true)
  })
})

describe('player bar', () => {
  it('shows the playing song beside its title, always visible and in the tab order', async () => {
    document.body.innerHTML = `<div data-testid="now-playing-widget">
      <div id="cover"></div>
      <div id="info"><div data-testid="context-item-info-title"><a>Track</a></div></div>
      <button id="spotify-add"></button>
    </div>`
    const { source, fns, emit } = fakeSource()
    stop = start(() => menuSettings({ playerBar: ['go-to-artist'] }), source)
    await flush()
    emit({
      track: { uri: TRACK_A, name: 'Song', artists: [{ name: 'Yeat', uri: ARTIST }], album: { name: 'A', uri: ALBUM }, image: null, thumb: null, canvasId: null, video: false },
      next: [],
      paused: false,
    })
    const host = document.querySelector('.sc-shortcuts')
    expect(host?.previousElementSibling?.id).toBe('info')
    expect(host?.nextElementSibling?.id).toBe('spotify-add')
    expect(host?.hasAttribute('data-always')).toBe(true)
    expect(button('go-to-artist').tabIndex).toBe(0)
    button('go-to-artist').click()
    await flush()
    expect(fns.navigate).toHaveBeenCalledWith('/artist/3qiHUAX7zY4Qnjx8TNUzVx')
    emit(null)
    expect((host as HTMLElement | null)?.hidden).toBe(true)
  })
})
