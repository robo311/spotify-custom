// Spotify's own 16px icons (copied from its 1.3.4 menu) for the shortcuts that do what Spotify's own items do, so
// the button reads the same as the menu item it replaces.

const icon = (d: string) => `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`

export const ADD_TO_QUEUE_ICON = icon(
  'M16 15H2v-1.5h14zm0-4.5H2V9h14zm-8.034-6A5.5 5.5 0 0 1 7.187 6H13.5a2.5 2.5 0 0 0 0-5H7.966c.159.474.255.978.278 1.5H13.5a1 1 0 1 1 0 2zM2 2V0h1.5v2h2v1.5h-2v2H2v-2H0V2z',
)

export const ADD_TO_PLAYLIST_ICON = icon(
  'M15.25 8a.75.75 0 0 1-.75.75H8.75v5.75a.75.75 0 0 1-1.5 0V8.75H1.5a.75.75 0 0 1 0-1.5h5.75V1.5a.75.75 0 0 1 1.5 0v5.75h5.75a.75.75 0 0 1 .75.75',
)
