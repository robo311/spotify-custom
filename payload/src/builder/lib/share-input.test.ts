import type { Theme } from '../../types'
import { extractShareCode, parseShareInput, shareFileName } from './share-input'

const theme = { id: 'x', name: 'X' } as Theme

describe('extractShareCode', () => {
  it('finds a bare code', () => {
    expect(extractShareCode('SC1:abc-DEF_123')).toBe('SC1:abc-DEF_123')
  })

  it('finds a code inside a chat message', () => {
    expect(extractShareCode("here's my theme: SC1:abc_D-9 enjoy!")).toBe('SC1:abc_D-9')
  })

  it('returns null for unrelated text', () => {
    expect(extractShareCode('hello there')).toBeNull()
  })
})

describe('parseShareInput', () => {
  it('asks for input when empty', () => {
    expect(parseShareInput('   ', () => theme)).toEqual({ ok: false, message: 'Paste a share code first.' })
  })

  it('explains the expected format when no code is found', () => {
    const r = parseShareInput('my cool theme', () => theme)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toContain('SC1:')
  })

  it('passes the extracted code to the parser', () => {
    const parse = vi.fn(() => theme)
    expect(parseShareInput('  SC1:abc  ', parse)).toEqual({ ok: true, theme, code: 'SC1:abc' })
    expect(parse).toHaveBeenCalledWith('SC1:abc')
  })

  it("surfaces the parser's friendly error", () => {
    const r = parseShareInput('SC1:zzz', () => {
      throw new Error('This code is from a newer version.')
    })
    expect(r).toEqual({ ok: false, message: 'This code is from a newer version.' })
  })
})

describe('shareFileName', () => {
  it('makes readable, safe names', () => {
    expect(shareFileName('Darcula (my version)')).toBe('darcula-my-version.sctheme')
    expect(shareFileName('Leto à la Košice!')).toBe('leto-a-la-kosice.sctheme')
    expect(shareFileName('***')).toBe('theme.sctheme')
  })
})
