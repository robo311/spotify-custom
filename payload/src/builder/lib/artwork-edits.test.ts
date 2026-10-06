import type { Settings } from '../../types'
import { defaultSettings } from '../../theme/model'
import { artworkStyle, isArtworkCustomised, patchArtworkStyle, resetArtworkStyle } from './artwork-edits'

const uri = 'spotify:user:me:folder:1'
const settings = (): Settings => defaultSettings('darcula')

describe('folder edits', () => {
  it('adds and merges style properties', () => {
    const s = settings()
    patchArtworkStyle(uri, { icon: 'star' })(s)
    patchArtworkStyle(uri, { color: '#ff0000' })(s)
    expect(artworkStyle(s, uri)).toEqual({ icon: 'star', color: '#ff0000' })
    expect(isArtworkCustomised(s, uri)).toBe(true)
  })

  it('clears properties with undefined and drops empty styles', () => {
    const s = settings()
    patchArtworkStyle(uri, { image: 'data:image/webp;base64,AA' })(s)
    patchArtworkStyle(uri, { image: undefined })(s)
    expect(s.artworkStyles).toEqual({})
    expect(isArtworkCustomised(s, uri)).toBe(false)
  })

  it('resets one folder without touching others', () => {
    const s = settings()
    patchArtworkStyle(uri, { icon: 'star' })(s)
    patchArtworkStyle('other', { icon: 'heart' })(s)
    resetArtworkStyle(uri)(s)
    expect(s.artworkStyles).toEqual({ other: { icon: 'heart' } })
  })
})
