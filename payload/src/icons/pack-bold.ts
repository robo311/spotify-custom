// "Bold" icon pack: solid, square-cornered geometric glyphs with heavy 3px strokes where a shape can't be filled.
import type { IconName } from './names'

/** Filled shapes, plus optional strokes (square caps, mitred joins). */
function bold(fill: string, strokes = ''): string {
  const lines = strokes && `<g fill="none" stroke="#000" stroke-width="3" stroke-linecap="square">${strokes}</g>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${fill}${lines}</svg>`
}

const SPEAKER = '<path d="M1 8h5l8-6v20l-8-6H1z"/>'

export const BOLD_ICONS: Record<IconName, string> = {
  play: bold('<path d="M5 2v20l17-10z"/>'),
  pause: bold('<path d="M4 2h6v20H4zM14 2h6v20h-6z"/>'),
  next: bold('<path d="M2 2v20l13-10zM17 2h5v20h-5z"/>'),
  prev: bold('<path d="M22 2v20L9 12zM2 2h5v20H2z"/>'),
  shuffle: bold('<path d="M17 1l6 5-6 5zM17 13l6 5-6 5z"/>', '<path d="M2 6h4l9 12h3M2 18h4l9-12h3"/>'),
  repeat: bold('<path d="M16 1l6 5-6 5zM8 13l-6 5 6 5z"/>', '<path d="M3.5 12V6H17M20.5 12v6H7"/>'),
  home: bold('<path d="M12 1L0 11h3v12h7v-7h4v7h7V11h3z"/>'),
  search: bold('<path d="M15 15l6.5 6.5" stroke="#000" stroke-width="4" stroke-linecap="square"/>', '<circle cx="9.5" cy="9.5" r="6.5" stroke-width="3.5"/>'),
  library: bold('<path d="M2 2h5v20H2zM9 2h5v20H9zM15.2 3.3l4.8-1.3 4 18.7-4.8 1.3z"/>'),
  queue: bold('<path d="M1 3h15v3H1zM1 10h15v3H1zM1 17h9v3H1zM18 8h6v3.5h-2.5V20H18z"/><circle cx="16" cy="19.5" r="3.5"/>'),
  lyrics: bold('<rect x="7.5" y="0" width="9" height="14" rx="4.5"/><path d="M10.5 18h3v3h-3zM6 21h12v3H6z"/>', '<path d="M4.5 10.5a7.5 7.5 0 0 0 15 0"/>'),
  volume: bold(SPEAKER, '<path d="M17.5 9a4 4 0 0 1 0 6M20.5 5a12 12 0 0 1 0 14"/>'),
  volumeMuted: bold(SPEAKER, '<path d="M17 8.5l5 7M22 8.5l-5 7"/>'),
  browse: bold('<path d="M1 1h10v10H1zM13 1h10v10H13zM1 13h10v10H1z"/><circle cx="18" cy="18" r="5"/>'),
  notifications: bold('<path d="M12 0a2 2 0 0 0-2 2v.7A7.5 7.5 0 0 0 4.5 10v6L1 19.5V21h22v-1.5L19.5 16v-6A7.5 7.5 0 0 0 14 2.7V2a2 2 0 0 0-2-2zM8.5 22h7a3.5 3.5 0 0 1-7 0z"/>'),
  friends: bold('<circle cx="8" cy="6.5" r="4.5"/><path d="M0 23v-3.5A6.5 6.5 0 0 1 6.5 13h3a6.5 6.5 0 0 1 6.5 6.5V23z"/><circle cx="17.5" cy="5" r="3.5"/><path d="M15.5 11.5H19a5 5 0 0 1 5 5V20h-6v-.5a8.5 8.5 0 0 0-2.5-8z"/>'),
}
