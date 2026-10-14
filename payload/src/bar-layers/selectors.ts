// Spotify's bars that can carry picture layers, keyed by part id (parts/registry.ts), and our own nodes inside them.

export const BAR_SELECTORS: Readonly<Record<string, string>> = {
  topBar: '[data-testid="global-nav-bar"]',
  playerBar: '[data-testid="now-playing-bar"]',
}

export const LAYERS_CLASS = 'sc-bar-layers'
export const LAYER_CLASS = 'sc-bar-layer'
/** On each layer element: its BarLayer id (the Arrange overlay finds layers by it). */
export const LAYER_ID_ATTR = 'data-sc-layer'
