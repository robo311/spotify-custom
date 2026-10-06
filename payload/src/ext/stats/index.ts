// Built-in "Listening stats" extension. Uses only the public ExtensionContext API, so it doubles as the reference
// example for docs/extensions.md.
import { h, render } from 'preact'
import type { ExtensionDef } from '../../types'
import { createTopContentSource } from './data'
import { StatsShelf } from './StatsShelf'

export const statsExtension: ExtensionDef = {
  id: 'stats',
  name: 'Listening stats',
  description: 'Your top artists and tracks for the last 4 weeks, 6 months or 12 months, right on Home.',
  start(ctx) {
    const source = createTopContentSource((operation, variables) => ctx.spotify.query(operation, variables))
    ctx.addHomeShelf({
      id: 'stats',
      title: 'Your listening',
      render(el) {
        render(h(StatsShelf, { ctx, source }), el)
        return () => render(null, el)
      },
    })
  },
}
