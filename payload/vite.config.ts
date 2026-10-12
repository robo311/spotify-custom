import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

// main.ts skips booting when the running payload has the same __BUILD_ID__, and `vite build --watch` loads this config
// once, so an id computed here would repeat on every rebuild and re-injects would keep the old code. The define
// leaves a placeholder that each build swaps for a fresh id.
const BUILD_ID_PLACEHOLDER = '__SC_BUILD_ID__'
const freshBuildId = (): Plugin => ({
  name: 'sc-fresh-build-id',
  generateBundle(_options, bundle) {
    const id = Date.now().toString(36)
    for (const file of Object.values(bundle)) {
      if (file.type === 'chunk') file.code = file.code.replaceAll(BUILD_ID_PLACEHOLDER, id)
    }
  },
})

// Builds one self-contained IIFE (dist/payload.js) that the Go helper injects into Spotify.
export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID_PLACEHOLDER) },
  plugins: [freshBuildId()],
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  build: {
    target: 'chrome120',
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    lib: { entry: 'src/main.ts', name: 'SpotifyCustom', formats: ['iife'], fileName: () => 'payload.js' },
    minify: true,
  },
  test: { environment: 'happy-dom', globals: true },
})
