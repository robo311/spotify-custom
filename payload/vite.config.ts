import { defineConfig } from 'vitest/config'

// Builds one self-contained IIFE (dist/payload.js) that the Go helper injects into Spotify.
export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
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
