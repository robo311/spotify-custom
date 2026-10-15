import { describe, expect, it } from 'vitest'
import { radioUriOf } from './radio'

describe('radioUriOf', () => {
  it('takes the first mix playlist', () => {
    expect(radioUriOf({ mediaItems: [{ uri: 'spotify:playlist:37i9dQZF1E8KRChqfZYnug' }] })).toBe('spotify:playlist:37i9dQZF1E8KRChqfZYnug')
  })

  it('gives null for anything else', () => {
    expect(radioUriOf({ mediaItems: [] })).toBeNull()
    expect(radioUriOf({ mediaItems: [{ uri: 'javascript:x' }] })).toBeNull()
    expect(radioUriOf(null)).toBeNull()
  })
})
