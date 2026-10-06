// "Offset" icon pack: the Line icons with a hard, misregistered print shadow at 40% (the mask keeps alpha, so it
// shows as a lighter shade of the button colour).
const OFFSET = 1.75

/** Re-draws a 'line' pack icon with its offset shadow; both copies shift up-left so the pair stays centred. */
export function toOffsetIcon(lineSvg: string): string {
  const inner = lineSvg.slice(lineSvg.indexOf('>') + 1, lineSvg.lastIndexOf('</svg>'))
  const half = -OFFSET / 2
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    `<g transform="translate(${half} ${half})"><g opacity=".4" transform="translate(${OFFSET} ${OFFSET})">${inner}</g>${inner}</g></svg>`
  )
}
