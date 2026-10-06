// "Soft" icon pack: bubbly, toy-like solid glyphs. Every shape is filled and also stroked 3.5 wide with round joins in
// the same colour, which rounds all corners; shapes are drawn inset by half that stroke.
import type { IconName } from './names'

function soft(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000" stroke="#000" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
}

const SPEAKER = '<path d="M4 9.5h3l5-4.5v14l-5-4.5H4z"/>'

export const SOFT_ICONS: Record<IconName, string> = {
  play: soft('<path d="M7 4.5v15l12.5-7.5z"/>'),
  pause: soft('<path d="M5.5 4.5h3.5v15H5.5zM15 4.5h3.5v15H15z"/>'),
  next: soft('<path d="M4 5v14l10-7zM19 5v14"/>'),
  prev: soft('<path d="M20 5v14l-10-7zM5 5v14"/>'),
  shuffle: soft('<path fill="none" stroke-width="3" d="M3 7h3l9 10h3M3 17h3l9-10h3"/><path d="M18.5 4.5l3 2.5-3 2.5zM18.5 14.5l3 2.5-3 2.5z"/>'),
  repeat: soft('<path fill="none" stroke-width="3" d="M4 12V9.5A2.5 2.5 0 0 1 6.5 7H17M20 12v2.5a2.5 2.5 0 0 1-2.5 2.5H7"/><path d="M17.5 4.5l3 2.5-3 2.5zM6.5 14.5l-3 2.5 3 2.5z"/>'),
  home: soft('<path d="M3.5 10.5L12 3.5l8.5 7v10h-5v-5h-7v5h-5z"/>'),
  search: soft('<circle fill="none" cx="10.5" cy="10.5" r="5.5"/><path stroke-width="4" d="M15.5 15.5l4.5 4.5"/>'),
  library: soft('<path stroke-width="4" d="M4.5 4v16M10 4v16M15.5 4.5L20 20"/>'),
  queue: soft('<path stroke-width="3" d="M3.5 5.5h13M3.5 11.5h10M3.5 17.5h6"/><circle cx="16.5" cy="18" r="1.5"/><path fill="none" stroke-width="3" d="M18.5 18V6.5h2.5"/>'),
  lyrics: soft('<rect x="9.5" y="3.5" width="5" height="8" rx="2.5"/><path fill="none" stroke-width="3" d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7"/>'),
  volume: soft(`${SPEAKER}<path fill="none" stroke-width="3" d="M16 9.5a3.5 3.5 0 0 1 0 5M19 6.5a8 8 0 0 1 0 11"/>`),
  volumeMuted: soft(`${SPEAKER}<path stroke-width="3" d="M16 9.5l5 5M21 9.5l-5 5"/>`),
  browse: soft('<path d="M4.5 4.5h4.5v4.5H4.5zM15 4.5h4.5v4.5H15zM4.5 15h4.5v4.5H4.5zM15 15h4.5v4.5H15z"/>'),
  notifications: soft('<path d="M12 3a5 5 0 0 0-5 5v5l-2 3h14l-2-3V8a5 5 0 0 0-5-5z"/><path stroke-width="3" d="M11 20.5h2"/>'),
  friends: soft('<circle cx="8" cy="8" r="2.25"/><path d="M3.5 20v-1a4.5 4.5 0 0 1 9 0v1z"/><circle cx="16.5" cy="6" r="1.75"/><path d="M17 13.5a4 4 0 0 1 4 4V20h-3z"/>'),
}
