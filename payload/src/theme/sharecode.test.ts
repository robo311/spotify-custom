import { describe, expect, it } from 'vitest'
import { decodeShareCode, encodeShareCode } from './sharecode'
import { PRESETS } from './presets'

describe('share codes', () => {
  it.each(PRESETS.map(p => [p.name, p] as const))('round-trips %s', (_name, theme) => {
    const code = encodeShareCode(theme)
    expect(code).toMatch(/^SC1:[A-Za-z0-9_-]+$/)
    expect(decodeShareCode(code)).toEqual(theme)
  })

  it('tolerates whitespace from chat apps', () => {
    const code = encodeShareCode(PRESETS[0])
    expect(decodeShareCode(`  ${code.slice(0, 20)}\n${code.slice(20)} `)).toEqual(PRESETS[0])
  })

  it.each([
    ['hello', 'start with SC1:'],
    ['SC1:@@@', 'damaged or incomplete'],
    ['SC1:' + encodeShareCode(PRESETS[0]).slice(4, 30), 'damaged or incomplete'],
  ])('explains what is wrong with %j', (code, message) => {
    expect(() => decodeShareCode(code)).toThrow(message)
  })

  it('rejects codes that decode to an invalid theme', () => {
    const code = encodeShareCode({ ...PRESETS[0], name: '' })
    expect(() => decodeShareCode(code)).toThrow("doesn't contain a usable theme (The theme needs a name.)")
  })
})
