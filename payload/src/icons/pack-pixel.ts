// "Pixel" icon pack: chunky 8-bit glyphs on an 8×8 grid (a pixel is 2px on a 16px button, so edges stay crisp), kept
// as ASCII art so they can be edited by eye.
import type { IconName } from './names'

/** Turns ASCII art ('#' on, '.' off, one line per row) into an SVG path with one rectangle per horizontal run. */
export function pixelSvg(art: string): string {
  const rows = art.split('\n').map(r => r.trim()).filter(r => r !== '')
  const d = rows.flatMap((row, y) => [...row.matchAll(/#+/g)].map(m => `M${m.index} ${y}h${m[0].length}v1h-${m[0].length}z`))
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${rows.length} ${rows.length}" shape-rendering="crispEdges"><path d="${d.join('')}"/></svg>`
}

export const PIXEL_ICONS: Record<IconName, string> = {
  play: pixelSvg(`
    .##.....
    .###....
    .####...
    .#####..
    .#####..
    .####...
    .###....
    .##.....
  `),
  pause: pixelSvg(`
    ........
    .##..##.
    .##..##.
    .##..##.
    .##..##.
    .##..##.
    .##..##.
    ........
  `),
  next: pixelSvg(`
    ........
    #....##.
    ##...##.
    ###..##.
    ####.##.
    ###..##.
    ##...##.
    #....##.
  `),
  prev: pixelSvg(`
    ........
    .##....#
    .##...##
    .##..###
    .##.####
    .##..###
    .##...##
    .##....#
  `),
  shuffle: pixelSvg(`
    .....#..
    ##..###.
    ..##.#..
    ...##...
    ...##...
    ..##.#..
    ##..###.
    .....#..
  `),
  repeat: pixelSvg(`
    ....#...
    .#####..
    #...#...
    #......#
    #......#
    ...#...#
    ..#####.
    ...#....
  `),
  home: pixelSvg(`
    ...##...
    ..####..
    .######.
    ########
    .##..##.
    .##..##.
    .##..##.
    .##..##.
  `),
  search: pixelSvg(`
    .###....
    #...#...
    #...#...
    #...#...
    .###....
    ....##..
    .....##.
    ......##
  `),
  library: pixelSvg(`
    .#.#.#..
    .#.#.#..
    .#.#.#..
    .#.#..#.
    .#.#..#.
    .#.#..#.
    .#.#...#
    .#.#...#
  `),
  queue: pixelSvg(`
    #######.
    ........
    ####..##
    ......#.
    ####..#.
    ......#.
    ....###.
    ....###.
  `),
  lyrics: pixelSvg(`
    ...##...
    ..####..
    ..####..
    #.####.#
    #......#
    .######.
    ...##...
    ..####..
  `),
  volume: pixelSvg(`
    ..#.....
    .##..#..
    ###...#.
    ###.#..#
    ###.#..#
    ###...#.
    .##..#..
    ..#.....
  `),
  volumeMuted: pixelSvg(`
    ..#.....
    .##.....
    ###.#..#
    ###..##.
    ###..##.
    ###.#..#
    .##.....
    ..#.....
  `),
  browse: pixelSvg(`
    ###..###
    ###..###
    ###..###
    ........
    ........
    ###..###
    ###..###
    ###..###
  `),
  notifications: pixelSvg(`
    ...##...
    ..####..
    .######.
    .######.
    .######.
    ########
    ........
    ...##...
  `),
  friends: pixelSvg(`
    ...##...
    ..####..
    ..####..
    ...##...
    ........
    .######.
    ########
    ########
  `),
}
