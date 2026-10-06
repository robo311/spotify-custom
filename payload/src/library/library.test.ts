import { compileArtworkCss } from './css'
import { cssString, isDataImage, safeColor, safePaint } from './css-values'
import { ARTWORK_ICONS, artworkIconSvg, normaliseIcon } from './icons'
import { centerSquare, encodeWithinBudget, type Encode } from './image'
import { folderIdFromUri, folderUriFromLabelledBy, libraryItemAt, LIKED_SONGS_URI, readLibraryItem } from './keys'
import { startLibrary } from './controller'

const URI = 'spotify:user:user1:folder:8f32592f2ae19c87'
const PNG = 'data:image/png;base64,iVBORw0KGgo='

// Trimmed from Spotify 1.3.3 markup (hashed classes removed, ids anonymised).
const LIST_ROW = `
  <div data-encore-id="listRow" role="group" aria-labelledby="listrow-title-${URI} listrow-subtitle-${URI}">
    <div><div><div aria-label="Chill"><svg data-testid="folder" viewBox="0 0 24 24"></svg></div></div></div>
    <p id="listrow-title-${URI}">Chill</p>
  </div>`
const GRID_CARD = `
  <div data-encore-id="card" role="group" aria-labelledby="card-title-spotify:user:user1:folder:aa11 card-subtitle-x">
    <div><svg data-testid="card-image-fallback"></svg></div>
    <span id="card-title-spotify:user:user1:folder:aa11">Road trip</span>
  </div>`
// Liked Songs: the row key is a per-user playlist URI; only the cover asset identifies it.
const LIKED_ROW = `
  <div data-encore-id="listRow" role="group" aria-labelledby="listrow-title-spotify:playlist:likedPerUser1">
    <div><div><img data-testid="entity-image" src="https://misc.scdn.co/liked-songs/liked-songs-300.png" alt=""></div></div>
    <p id="listrow-title-spotify:playlist:likedPerUser1"><span class="pick-target">Liked Songs</span></p>
  </div>`
const PLAYLIST_ROW = `
  <div data-encore-id="listRow" role="group" aria-labelledby="listrow-title-spotify:playlist:other">
    <div><img data-testid="entity-image" src="https://i.scdn.co/image/abc" alt=""></div>
    <p id="listrow-title-spotify:playlist:other">Other</p>
  </div>`

describe('keys', () => {
  it('extracts folder URIs from list rows and grid cards', () => {
    expect(folderUriFromLabelledBy(`listrow-title-${URI} listrow-subtitle-${URI}`)).toBe(URI)
    expect(folderUriFromLabelledBy('card-title-spotify:user:u:folder:aa11 card-subtitle-x')).toBe('spotify:user:u:folder:aa11')
  })

  it('ignores playlists, artists and missing attributes', () => {
    expect(folderUriFromLabelledBy('listrow-title-spotify:playlist:37i9dQZF1')).toBeNull()
    expect(folderUriFromLabelledBy(null)).toBeNull()
  })

  it('reads the display name through aria-labelledby', () => {
    document.body.innerHTML = LIST_ROW
    const row = document.querySelector('[data-encore-id="listRow"]')
    expect(row && readLibraryItem(row)).toEqual({ kind: 'folder', uri: URI, name: 'Chill' })
    expect(folderIdFromUri(URI)).toBe('8f32592f2ae19c87')
  })

  it('recognises Liked Songs by its cover asset and keys it with a constant URI', () => {
    document.body.innerHTML = LIKED_ROW + PLAYLIST_ROW
    const [liked, other] = document.querySelectorAll('[data-encore-id="listRow"]')
    expect(readLibraryItem(liked)).toEqual({ kind: 'liked', uri: LIKED_SONGS_URI, name: 'Liked Songs' })
    expect(readLibraryItem(other)).toBeNull()
  })

  it('libraryItemAt resolves any element inside a row (pick mode)', () => {
    document.body.innerHTML = LIST_ROW + LIKED_ROW + PLAYLIST_ROW
    const inner = (sel: string) => document.querySelector(sel) ?? document.body
    expect(libraryItemAt(inner('[data-testid="folder"]'))).toMatchObject({ kind: 'folder', uri: URI })
    expect(libraryItemAt(inner('.pick-target'))).toMatchObject({ kind: 'liked' })
    expect(libraryItemAt(inner('img[src*="i.scdn.co"]'))).toBeNull()
    expect(libraryItemAt(document.body)).toBeNull()
  })
})

describe('Liked Songs artwork', () => {
  const COVER = 'img[src*="//misc.scdn.co/liked-songs/"]'

  it('swaps the cover image itself for a picture', () => {
    const css = compileArtworkCss({ [LIKED_SONGS_URI]: { image: PNG } }, artworkIconSvg)
    expect(css).toBe(`:root { --sc-art-0-image: url("${PNG}"); }\n${COVER} { content: var(--sc-art-0-image) !important; object-fit: cover !important; }`)
  })

  it('draws a coloured icon over the chosen background, hiding the stock cover', () => {
    const css = compileArtworkCss({ [LIKED_SONGS_URI]: { icon: 'moon', color: '#ffd166', background: 'linear-gradient(135deg, #3a2f7a, #12123a)' } }, artworkIconSvg)
    expect(css).toContain('stroke%3D%22%23ffd166%22') // colour baked into the SVG
    expect(css).toContain(`${COVER} { content: linear-gradient(transparent, transparent) !important; background: center / 50% no-repeat var(--sc-art-0-icon), linear-gradient(135deg, #3a2f7a, #12123a) !important; }`)
  })

  it('keeps a heart for background-only styles and uses defaults for icon-only styles', () => {
    const bgOnly = compileArtworkCss({ [LIKED_SONGS_URI]: { background: '#0b6' } }, artworkIconSvg)
    expect(bgOnly).toContain(encodeURIComponent(artworkIconSvg('heart')?.replaceAll('currentColor', '#ffffff') ?? 'x'))
    const iconOnly = compileArtworkCss({ [LIKED_SONGS_URI]: { icon: 'star' } }, artworkIconSvg)
    expect(iconOnly).toContain('var(--sc-elevated, #282828) !important')
    expect(compileArtworkCss({ [LIKED_SONGS_URI]: {} }, artworkIconSvg)).toBe('')
  })

  it('never lets an unsafe colour into the SVG or the stylesheet', () => {
    const css = compileArtworkCss({ [LIKED_SONGS_URI]: { icon: 'star', color: '"/><script>x</script>' } }, artworkIconSvg)
    expect(css).not.toContain('script')
    expect(css).toContain(encodeURIComponent('stroke="#ffffff"'))
  })

  it('combines folders and Liked Songs with position-based variable names', () => {
    const css = compileArtworkCss({ [URI]: { image: PNG }, [LIKED_SONGS_URI]: { image: PNG } }, artworkIconSvg)
    expect(css.split('\n')[0]).toBe(`:root { --sc-art-0-image: url("${PNG}"); --sc-art-1-image: url("${PNG}"); }`)
  })
})

describe('compileArtworkCss', () => {
  it('paints a picture on list and grid tiles and hides the stock glyph', () => {
    const css = compileArtworkCss({ [URI]: { image: PNG } }, artworkIconSvg)
    expect(css).toContain(`[aria-labelledby$=":folder:8f32592f2ae19c87"]`)
    expect(css).toContain(`[aria-labelledby*=":folder:8f32592f2ae19c87 "]`)
    expect(css).toContain(`:root { --sc-art-0-image: url("${PNG}"); }`)
    expect(css).toContain(':has(> [data-testid="folder"]) { background: center / cover no-repeat var(--sc-art-0-image) !important; }')
    expect(css.split(PNG)).toHaveLength(2) // the data URL is emitted exactly once
    expect(css).toContain(':has(> [data-testid="card-image-fallback"])')
    expect(css).toContain('[data-testid="folder"] { opacity: 0 !important; }')
  })

  it('paints an icon mask in the chosen colour on the chosen background', () => {
    const css = compileArtworkCss({ [URI]: { icon: 'moon', color: '#ffd166', background: 'linear-gradient(#123, #456)' } }, artworkIconSvg)
    expect(css).toContain('background: linear-gradient(#123, #456) !important;')
    expect(css).toContain('background-color: #ffd166 !important;')
    expect(css).toMatch(/--sc-art-0-mask: url\("data:image\/svg\+xml,%3Csvg/)
    expect(css).toContain('[data-testid="folder"] { background-color: #ffd166 !important; -webkit-mask: var(--sc-art-0-mask)')
    expect(css).toContain('[data-testid="folder"] > * { visibility: hidden !important; }')
    // Paint only: tile layout differs per view. (:root holds the icon data URL, which itself contains width="24".)
    const rules = css.split('\n').filter(line => !line.startsWith(':root'))
    expect(rules.join('\n')).not.toMatch(/position|inset|display|width|height/)
  })

  it('emits nothing for empty, unknown-icon or non-folder entries', () => {
    expect(compileArtworkCss({ [URI]: {}, 'spotify:user:x:folder:': { image: PNG }, x: { image: PNG } }, artworkIconSvg)).toBe('')
    expect(compileArtworkCss({ [URI]: { icon: 'no-such-icon' } }, artworkIconSvg)).toBe('')
  })

  it('escapes hostile folder ids so they cannot break out of the selector', () => {
    const css = compileArtworkCss({ 'spotify:user:u:folder:a"]{} body{display:none} [x="': { image: PNG } }, artworkIconSvg)
    expect(css).toContain('[aria-labelledby$=":folder:a\\"]{} body{display:none} [x=\\""]')
    expect(css.split('\n').every(line => line.startsWith('#Desktop_LeftSidebar_Id') || line.startsWith(':root {'))).toBe(true)
  })

  it('drops unsafe paints and non-data images', () => {
    const css = compileArtworkCss(
      {
        [URI]: { icon: 'moon', color: 'red; } body { display: none', background: 'url(https://evil.example/x.png)' },
        'spotify:user:u:folder:b2': { image: 'https://evil.example/track.png' },
      },
      artworkIconSvg,
    )
    expect(css).not.toContain('evil')
    expect(css).not.toContain('display: none')
    expect(css).toContain('background-color: var(--sc-text, #fff) !important;')
  })
})

describe('validation helpers', () => {
  it('escapes CSS strings', () => {
    expect(cssString('a"b\\c\nd')).toBe('"a\\"b\\\\c\\a d"')
  })

  it('accepts colours and gradients, rejects breakers and URLs', () => {
    expect(safePaint(' #fff ')).toBe('#fff')
    expect(safePaint('radial-gradient(circle, #f00 0%, transparent 70%)')).not.toBeNull()
    for (const bad of ['red;color:blue', 'a{b}', 'url(x)', 'image-set("x" 1x)', '</style>', 'red /* x */']) expect(safePaint(bad)).toBeNull()
  })

  it('safeColor accepts plain colours only', () => {
    expect(safeColor('rgb(1 2 3 / 50%)')).toBe('rgb(1 2 3 / 50%)')
    for (const bad of ['linear-gradient(red, blue)', '"red"', "red'", 'a&b', 'red;']) expect(safeColor(bad)).toBeNull()
  })

  it('only accepts base64 data images', () => {
    expect(isDataImage(PNG)).toBe(true)
    expect(isDataImage('data:image/svg+xml,<svg onload=alert(1)>')).toBe(false)
    expect(isDataImage('data:image/png;base64,abc")} body{x')).toBe(false)
  })
})

describe('ARTWORK_ICONS', () => {
  it('has ~40+ icons with unique ids and labels', () => {
    expect(ARTWORK_ICONS.length).toBeGreaterThanOrEqual(40)
    expect(new Set(ARTWORK_ICONS.map(i => i.id)).size).toBe(ARTWORK_ICONS.length)
    expect(new Set(ARTWORK_ICONS.map(i => i.label)).size).toBe(ARTWORK_ICONS.length)
  })

  it('every icon is a valid 24×24 currentColor svg with stroke 1.75 and no class', () => {
    const parser = new DOMParser()
    for (const icon of ARTWORK_ICONS) {
      const svg = parser.parseFromString(icon.svg, 'image/svg+xml').documentElement
      expect(svg.tagName, icon.id).toBe('svg')
      expect(svg.getAttribute('viewBox'), icon.id).toBe('0 0 24 24')
      expect(svg.getAttribute('stroke'), icon.id).toBe('currentColor')
      expect(svg.getAttribute('stroke-width'), icon.id).toBe('1.75')
      expect(svg.hasAttribute('class'), icon.id).toBe(false)
      expect(svg.children.length, icon.id).toBeGreaterThan(0)
    }
  })

  it('normalises Lucide markup', () => {
    expect(normaliseIcon('<svg\n  class="lucide x"\n  stroke-width="2"\n>\n  <path d="M1 1" />\n</svg>')).toBe('<svg stroke-width="1.75"><path d="M1 1"/></svg>')
  })
})

describe('image encoding', () => {
  it('crops the centred square', () => {
    expect(centerSquare(400, 300)).toEqual({ sx: 50, sy: 0, side: 300 })
    expect(centerSquare(300, 401)).toEqual({ sx: 0, sy: 50, side: 300 })
  })

  it('prefers webp and lowers quality, then size, until it fits', () => {
    const calls: string[] = []
    const encode: Encode = (size, type, quality) => {
      calls.push(`${size}@${quality}`)
      const length = size === 1 ? 10 : size * size * quality * 0.6
      return `data:${type};base64,${'A'.repeat(Math.round(length))}`
    }
    const url = encodeWithinBudget(encode, 256, 15_000)
    expect(url.startsWith('data:image/webp')).toBe(true)
    expect(url.length).toBeLessThanOrEqual(15_000)
    expect(calls).toContain('192@0.86')
  })

  it('falls back to jpeg when webp encoding is unsupported', () => {
    const encode: Encode = (_size, _type, _quality) => 'data:image/png;base64,AAAA'
    const jpegOnly: Encode = (size, type, quality) => (type === 'image/webp' ? encode(size, type, quality) : 'data:image/jpeg;base64,AAAA')
    expect(encodeWithinBudget(jpegOnly, 256)).toBe('data:image/jpeg;base64,AAAA')
  })
})

describe('startLibrary', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = `<div id="Desktop_LeftSidebar_Id">${LIST_ROW}${GRID_CARD}${LIKED_ROW}${PLAYLIST_ROW}</div>`
  })

  it('reports rendered folders, remembers virtualised-away ones, and reports changes only', async () => {
    const reports: unknown[] = []
    const library = startLibrary({ getStyles: () => ({}), onItems: f => reports.push(f) })
    expect(reports).toEqual([
      [
        { kind: 'folder', uri: URI, name: 'Chill' },
        { kind: 'folder', uri: 'spotify:user:user1:folder:aa11', name: 'Road trip' },
        { kind: 'liked', uri: LIKED_SONGS_URI, name: 'Liked Songs' },
      ],
    ])

    document.querySelector('[data-encore-id="card"]')?.remove() // scrolled out of the virtual list
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
    expect(reports).toHaveLength(1)
    library.dispose()
  })

  it('owns one stylesheet, refreshes it, and removes it on dispose', () => {
    let styles = {}
    const library = startLibrary({ getStyles: () => styles, onItems: () => undefined })
    const sheet = () => document.getElementById('sc-library')
    expect(sheet()?.textContent).toBe('')
    styles = { [URI]: { image: PNG } }
    library.refresh()
    expect(sheet()?.textContent).toContain(PNG)
    library.dispose()
    expect(sheet()).toBeNull()
  })
})
