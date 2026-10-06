import type { Theme } from '../../types'
import { FIRST_DELAY_MS, GLIDE_DELAY_MS, createPreviewIntent } from './preview-intent'

const theme = (id: string) => ({ id, name: id }) as Theme

describe('preview intent', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const setup = () => {
    const apply = vi.fn<(t: Theme | null) => void>()
    return { apply, intent: createPreviewIntent({ apply }) }
  }
  const applied = (apply: ReturnType<typeof setup>['apply']) => apply.mock.calls.map(([t]) => t?.id ?? 'active')

  it('waits for a pause before the first preview', () => {
    const { apply, intent } = setup()
    intent.enter(theme('nord'))
    vi.advanceTimersByTime(FIRST_DELAY_MS - 1)
    expect(apply).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(applied(apply)).toEqual(['nord'])
  })

  it('ignores cards the pointer only passes over', () => {
    const { apply, intent } = setup()
    intent.enter(theme('nord'))
    vi.advanceTimersByTime(100)
    intent.leaveCard()
    vi.advanceTimersByTime(1000)
    expect(apply).not.toHaveBeenCalled()
  })

  it('glides between cards quickly, never reverting to the active theme in between', () => {
    const { apply, intent } = setup()
    intent.enter(theme('nord'))
    vi.advanceTimersByTime(FIRST_DELAY_MS)
    intent.leaveCard()
    intent.enter(theme('forest'))
    vi.advanceTimersByTime(GLIDE_DELAY_MS)
    expect(applied(apply)).toEqual(['nord', 'forest'])
  })

  it('reverts once when the pointer leaves the gallery', () => {
    const { apply, intent } = setup()
    intent.enter(theme('nord'))
    vi.advanceTimersByTime(FIRST_DELAY_MS)
    intent.leaveCard()
    intent.leaveGallery()
    intent.leaveGallery()
    expect(applied(apply)).toEqual(['nord', 'active'])
  })

  it('does not revert when leaving the gallery without having previewed', () => {
    const { apply, intent } = setup()
    intent.enter(theme('nord'))
    intent.leaveGallery()
    vi.advanceTimersByTime(1000)
    expect(apply).not.toHaveBeenCalled()
  })

  it('commits without reverting, then starts fresh', () => {
    const { apply, intent } = setup()
    intent.enter(theme('nord'))
    vi.advanceTimersByTime(FIRST_DELAY_MS)
    intent.commit()
    intent.leaveGallery()
    expect(applied(apply)).toEqual(['nord'])
    intent.enter(theme('forest'))
    vi.advanceTimersByTime(GLIDE_DELAY_MS)
    expect(applied(apply)).toEqual(['nord'])
    vi.advanceTimersByTime(FIRST_DELAY_MS)
    expect(applied(apply)).toEqual(['nord', 'forest'])
  })

  it('does not re-apply the card already shown', () => {
    const { apply, intent } = setup()
    intent.enter(theme('nord'))
    vi.advanceTimersByTime(FIRST_DELAY_MS)
    intent.leaveCard()
    intent.enter(theme('nord'))
    vi.advanceTimersByTime(1000)
    expect(applied(apply)).toEqual(['nord'])
  })
})
