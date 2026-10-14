// Built-in pictures for the top and player bars, referenced from themes by id ({ builtin: 'planet' }). Vector, so they
// stay sharp at any window width and cost a few KB; self-contained (no href, no external url()) because they're
// compiled straight into the theme's CSS.

export interface BarArt {
  id: string
  svg: string
}

/** Deterministic star field: the same stars on every load (mulberry32). */
function stars(count: number, seed: number, width: number, height: number): string {
  let a = seed
  const random = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const dots: string[] = []
  for (let i = 0; i < count; i++) {
    const x = (random() * width).toFixed(1)
    const y = (random() * height).toFixed(1)
    const r = (0.4 + random() * 0.8).toFixed(2)
    const o = (0.25 + random() * 0.6).toFixed(2)
    dots.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${o}"/>`)
  }
  return dots.join('')
}

/**
 * Galaxy's background: nebula clouds, dust lanes and stars as a 30:1 panorama, so "Fill" covers the bar at any window
 * width. Clouds are fractal noise (feTurbulence), so they read as texture rather than flat shapes.
 */
const NEBULA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 80" width="2400" height="80">
<defs>
<linearGradient id="sky" x1="0" x2="1">
<stop offset="0" stop-color="#0a0719"/><stop offset=".45" stop-color="#140b33"/><stop offset=".76" stop-color="#1c1045"/><stop offset="1" stop-color="#0c0820"/>
</linearGradient>
<linearGradient id="neb" x1="0" x2="1">
<stop offset="0" stop-color="#4b35c4" stop-opacity=".35"/><stop offset=".3" stop-color="#7b5cff" stop-opacity=".7"/>
<stop offset=".55" stop-color="#b44fe6" stop-opacity=".8"/><stop offset=".7" stop-color="#e070ff" stop-opacity=".9"/>
<stop offset=".84" stop-color="#6fe3ff" stop-opacity=".7"/><stop offset="1" stop-color="#4b35c4" stop-opacity=".35"/>
</linearGradient>
<linearGradient id="neb2" x1="0" x2="1">
<stop offset="0" stop-color="#6fe3ff" stop-opacity=".25"/><stop offset=".4" stop-color="#e070ff" stop-opacity=".5"/>
<stop offset=".78" stop-color="#8fb4ff" stop-opacity=".7"/><stop offset="1" stop-color="#7b5cff" stop-opacity=".3"/>
</linearGradient>
<linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".35" stop-color="#fff"/><stop offset=".7" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
</linearGradient>
<mask id="bandMask"><rect width="2400" height="80" fill="url(#band)"/></mask>
<filter id="cloud" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency=".0032 .05" numOctaves="5" seed="4"/>
<feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 3 0 0 0 -1.25"/>
<feComposite in="SourceGraphic" operator="in"/>
<feGaussianBlur stdDeviation=".6"/>
</filter>
<filter id="wisp" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency=".006 .09" numOctaves="4" seed="11"/>
<feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 3.4 0 0 0 -1.7"/>
<feComposite in="SourceGraphic" operator="in"/>
</filter>
<filter id="dust" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency=".005 .07" numOctaves="4" seed="23"/>
<feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 3 0 0 0 -1.6"/>
<feComposite in="SourceGraphic" operator="in"/>
<feGaussianBlur stdDeviation="1"/>
</filter>
<radialGradient id="far" cx=".3" cy=".3" r=".9"><stop offset="0" stop-color="#ffd6f4"/><stop offset=".6" stop-color="#c05aa8"/><stop offset="1" stop-color="#3d1240"/></radialGradient>
</defs>
<rect width="2400" height="80" fill="url(#sky)"/>
<g mask="url(#bandMask)">
<rect width="2400" height="80" fill="url(#neb)" filter="url(#cloud)"/>
<rect width="2400" height="80" fill="url(#neb2)" filter="url(#wisp)" opacity=".75"/>
<rect width="2400" height="80" fill="#05030f" filter="url(#dust)" opacity=".55"/>
</g>
${stars(170, 7, 2400, 80)}
${sparkles([[310, 18], [905, 62], [1290, 14], [1560, 66], [2050, 20], [2230, 58]])}
<circle cx="640" cy="27" r="4.5" fill="url(#far)"/>
<g mask="url(#bandMask)" opacity=".8">
<rect x="1560" y="46" width="540" height="34" fill="#e8dcff" filter="url(#wisp)" opacity=".5"/>
</g>
</svg>`

/**
 * Galaxy's planet, a separate layer so it can be dragged: a banded, ringed gas giant with a small moon. Drawn in the
 * nebula's coordinates (viewBox x 1740–1920), so it lines up with the clouds when placed at ~76 %.
 */
const PLANET = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="1740 0 180 80" width="180" height="80">
<defs>
<filter id="soften"><feGaussianBlur stdDeviation=".8"/></filter>
<filter id="bands" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency=".006 .22" numOctaves="3" seed="7"/>
<feColorMatrix values="0 0 0 0 .96 0 0 0 0 .86 0 0 0 0 1 3.4 0 0 0 -1.45"/>
<feGaussianBlur stdDeviation=".3"/>
</filter>
<filter id="bands2" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency=".008 .14" numOctaves="3" seed="19"/>
<feColorMatrix values="0 0 0 0 .88 0 0 0 0 .3 0 0 0 0 .9 3.2 0 0 0 -1.4"/>
<feGaussianBlur stdDeviation=".4"/>
</filter>
<filter id="bands3" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency=".01 .3" numOctaves="2" seed="31"/>
<feColorMatrix values="0 0 0 0 .44 0 0 0 0 .89 0 0 0 0 1 3 0 0 0 -1.5"/>
<feGaussianBlur stdDeviation=".3"/>
</filter>
<radialGradient id="body" cx=".34" cy=".3" r=".85">
<stop offset="0" stop-color="#f3e6ff"/><stop offset=".22" stop-color="#c5a2ff"/><stop offset=".55" stop-color="#7d55ea"/><stop offset=".85" stop-color="#3a1f86"/><stop offset="1" stop-color="#1e0f4d"/>
</radialGradient>
<radialGradient id="night" cx=".78" cy=".8" r=".75">
<stop offset="0" stop-color="#07041a" stop-opacity=".92"/><stop offset=".55" stop-color="#07041a" stop-opacity=".35"/><stop offset="1" stop-color="#07041a" stop-opacity="0"/>
</radialGradient>
<linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#8fefff" stop-opacity=".9"/><stop offset=".4" stop-color="#8fefff" stop-opacity="0"/>
</linearGradient>
<linearGradient id="ring" x1="0" x2="1">
<stop offset="0" stop-color="#6fe3ff" stop-opacity="0"/><stop offset=".22" stop-color="#9fefff" stop-opacity=".9"/>
<stop offset=".5" stop-color="#f1dcff" stop-opacity=".95"/><stop offset=".78" stop-color="#e070ff" stop-opacity=".85"/>
<stop offset="1" stop-color="#e070ff" stop-opacity="0"/>
</linearGradient>
<radialGradient id="moon" cx=".3" cy=".3" r=".9"><stop offset="0" stop-color="#f4efff"/><stop offset=".6" stop-color="#9c8fd6"/><stop offset="1" stop-color="#3b3170"/></radialGradient>
<clipPath id="disc"><circle cx="1830" cy="41" r="29"/></clipPath>
<clipPath id="front"><rect x="1700" y="41" width="260" height="60"/></clipPath>
</defs>
<circle cx="1752" cy="19" r="4" fill="url(#moon)"/>
<g transform="rotate(-16 1830 41)">
<ellipse cx="1830" cy="41" rx="60" ry="10" fill="none" stroke="url(#ring)" stroke-width="3.2" opacity=".75"/>
<ellipse cx="1830" cy="41" rx="53" ry="8.6" fill="none" stroke="url(#ring)" stroke-width="1.6" opacity=".55"/>
</g>
<circle cx="1830" cy="41" r="29" fill="url(#body)"/>
<g clip-path="url(#disc)">
<g transform="rotate(-16 1830 41)">
<rect x="1780" y="0" width="100" height="82" filter="url(#bands2)" opacity=".8"/>
<rect x="1780" y="0" width="100" height="82" filter="url(#bands3)" opacity=".55"/>
<rect x="1780" y="0" width="100" height="82" filter="url(#bands)" opacity=".7"/>
<ellipse cx="1830" cy="47.5" rx="62" ry="11" fill="none" stroke="#07041a" stroke-width="3.4" opacity=".28" filter="url(#soften)"/>
</g>
<circle cx="1830" cy="41" r="29" fill="url(#night)"/>
<circle cx="1830" cy="41" r="28.4" fill="none" stroke="url(#rim)" stroke-width="1.4"/>
</g>
<g transform="rotate(-16 1830 41)" clip-path="url(#front)">
<ellipse cx="1830" cy="41" rx="60" ry="10" fill="none" stroke="url(#ring)" stroke-width="3.2"/>
<ellipse cx="1830" cy="41" rx="53" ry="8.6" fill="none" stroke="url(#ring)" stroke-width="1.6" opacity=".75"/>
</g>
<ellipse cx="1846" cy="66" rx="70" ry="6" fill="#e8dcff" opacity=".22" filter="url(#soften)"/>
</svg>`

/** Four-point glints on a few brighter stars: thin and short, so they read as sparkle rather than glow. */
function sparkles(points: [number, number][]): string {
  return points
    .map(([x, y]) => `<g opacity=".8" stroke="#fff" stroke-linecap="round"><path d="M${x - 4} ${y}h8" stroke-width=".5"/><path d="M${x} ${y - 4}v8" stroke-width=".5"/><circle cx="${x}" cy="${y}" r="1" fill="#fff" stroke="none"/></g>`)
    .join('')
}

export const BAR_ART: readonly BarArt[] = [
  { id: 'nebula', svg: NEBULA },
  { id: 'planet', svg: PLANET },
]

const urls = new Map(BAR_ART.map(art => [art.id, `data:image/svg+xml,${encodeURIComponent(art.svg)}`]))

/** The data URL for built-in art, or null for an unknown id (e.g. a theme from a newer version). */
export function barArtUrl(id: string): string | null {
  return urls.get(id) ?? null
}
