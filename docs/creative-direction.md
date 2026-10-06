# Creative direction: "Studio"

The goal is that people say "wow" the first time they open it. It should feel like a **pro instrument**, like a high-end synth plugin or a
design tool: calm, precise, tactile. Not a generic glassmorphism dashboard.

## Foundations

- **The builder wears the theme.** Every injected UI uses the active palette (`--sc-*` vars set by the theme engine), so it
  always matches and morphs along with Spotify.
- **Surfaces ("Console", 2026-10-05):** the drawer and editors are an opaque faceplate in the theme surface (no blur:
  translucency let Spotify's text ghost through), hairline border, 1px inner top highlight. Settings groups are recessed
  *modules* (`--b-well`: background darkened, inset shadow), not raised cards; whatever is selected is a raised *key*
  (`--b-key`); switch and fader tracks are *slots* cut into the module (`--b-slot`). Controls are hardware, not iOS:
  slide switches with a square cap, fader caps with a grip line. Radii step down by depth: faceplate 14, modules 12,
  keys 8. The header's palette ribbon (the theme's 8 colours as a strip of equal chips) is the studio's signature;
  part editors show a specimen plate of the part (its own fill and text) with a fill / text / accent readout instead.
- **Type:** "SC Inter" for UI (13px base; headings 600 with -0.01em tracking). "SC Mono" for *values*: hex codes,
  numbers, slider readouts, keyboard hints. Module titles and labels are sentence case (13px/600 titles, 12px/600 labels);
  no tracked all-caps.
- **Motion:** fast and physical. UI transitions run 160–220ms with `cubic-bezier(.2,.8,.2,1)`. Springy overshoot is reserved for
  signature moments. Respect `prefers-reduced-motion`: reveals and morphs become instant.
- **Accessibility:** fully keyboard-operable (arrow keys in tabs, Esc closes pick mode, then the drawer), visible 2px accent
  focus rings, aria labels on icon buttons, hit targets ≥ 28px, contrast ≥ 4.5:1 for text.

## Signature moments (must-have)

1. **Circular reveal theme switch.** View Transitions API (`document.startViewTransition`). The new theme expands as a circle
   from the clicked swatch, 550ms.
2. **Colour morph.** Palette vars are registered via `@property … syntax: '<color>'`, so editing tweens (300ms) and Album
   Mode tweens (1200ms).
3. **Hover-to-preview.** Hovering a preset card for 400ms temporarily applies it to the real Spotify; moving away reverts it.
4. **Live preset cards.** Each preset card is a miniature Spotify window drawn in CSS with that palette (sidebar, card grid,
   player bar with an accent play button), not an image.
5. **Pick mode spotlight.** The app dims, the hovered part stays lit with a 2px accent outline and a soft glow, and a floating label
   chip ("Player bar · click to edit") follows the cursor.
6. **Album Mode.** The accent and background tint follow the current cover and morph over 1.2s on track change. While it's on,
   the 🎨 entry button shows a slowly breathing ring in the cover colour.
7. **Eyedropper.** The colour picker can sample any pixel on screen, e.g. from album art (`EyeDropper` API if CEF supports it,
   otherwise sample the current cover image).

## Components

- **Entry button:** a custom palette glyph (SVG, not an emoji) in Spotify's top bar. On hover it reveals a tiny arc of the
  current palette's key colours.
- **Colour picker:** custom, OKLCH-based. A hue strip plus a lightness/chroma field, the eyedropper, a hex input in mono, a recent-colours row,
  palette swatches, and a live contrast badge (`AA ✓` or `⚠ 3.1:1 · Fix`).
- **Stats shelf:** editorial. Big mono rank numerals (01–05) in the accent at ~40% opacity, sitting behind the images. #1 is a hero
  card with a large circular image and a cover-colour glow. A segmented control switches Artists/Tracks, and items enter with a 40ms stagger.
- **"line" icon pack:** Lucide, stroke 1.75, round caps and joins, 24 viewBox.
- **Presets:** each one has to look intentional and polished. Text pairs ≥ 4.5:1, the accent clearly visible on the surface, and
  elevated vs surface distinguishable (ΔL ≥ 0.03 in OKLCH).

## Never

Emoji as UI icons; purple-gradient clichés; heavy shadows everywhere; rainbow gradients; two signature animations at once;
anything that blocks music playback or Spotify's own controls. Glows on the studio's own chrome (zero-offset coloured
halos, accent-lit backdrops, glowing indicator dots): the user called them out as "AI looking" (2026-10-05). Selection is
shown by a raised key or a crisp 2px ring.
