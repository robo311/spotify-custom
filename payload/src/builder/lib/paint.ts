// A part background is a "paint": a solid colour or a two-stop linear gradient the builder can edit.
// Anything else (hand-written CSS) is kept as-is and shown as custom.
import type { Paint } from '../../types'
import { normalizeHex } from './color-math'

export type PaintModel =
  | { kind: 'solid'; color: string }
  | { kind: 'gradient'; from: string; to: string; angle: number }
  | { kind: 'custom'; css: string }

const GRADIENT_RE = /^linear-gradient\(\s*(-?\d+(?:\.\d+)?)deg\s*,\s*(#[0-9a-f]{3,8})\s*,\s*(#[0-9a-f]{3,8})\s*\)$/i

export function parsePaint(paint: Paint): PaintModel {
  const solid = normalizeHex(paint)
  if (solid) return { kind: 'solid', color: solid }
  const m = GRADIENT_RE.exec(paint.trim())
  const from = m ? normalizeHex(m[2]) : null
  const to = m ? normalizeHex(m[3]) : null
  if (m && from && to) return { kind: 'gradient', from, to, angle: Number(m[1]) }
  return { kind: 'custom', css: paint }
}

export function formatPaint(model: PaintModel): Paint {
  switch (model.kind) {
    case 'solid':
      return model.color
    case 'gradient':
      return `linear-gradient(${Math.round(model.angle)}deg, ${model.from}, ${model.to})`
    case 'custom':
      return model.css
  }
}

/** Switching kind keeps the colours people already chose. */
export function convertPaint(model: PaintModel, kind: 'solid' | 'gradient', fallback: string): PaintModel {
  const first = model.kind === 'solid' ? model.color : model.kind === 'gradient' ? model.from : fallback
  if (kind === 'solid') return { kind: 'solid', color: first }
  return model.kind === 'gradient' ? model : { kind: 'gradient', from: first, to: fallback, angle: 180 }
}
