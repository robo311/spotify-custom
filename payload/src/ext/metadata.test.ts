import { nameFromFile, parseExtensionMetadata } from './metadata'

describe('parseExtensionMetadata', () => {
  it('reads @name and @description from the leading comment block', () => {
    expect(parseExtensionMetadata('// @name Lyrics glow\n//  @description  Glows on the chorus \n\nSC.registerExtension({})')).toEqual({
      name: 'Lyrics glow',
      description: 'Glows on the chorus',
    })
  })

  it('ignores tags after code starts', () => {
    expect(parseExtensionMetadata('const a = 1\n// @name Late')).toEqual({})
  })
})

describe('nameFromFile', () => {
  it('turns a file name into a readable name', () => {
    expect(nameFromFile('mood-lights_v2.js')).toBe('Mood lights v2')
  })
})
