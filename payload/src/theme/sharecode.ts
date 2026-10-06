// Share codes: a whole theme as one copy-pasteable string ("SC1:" + base64url(deflate(JSON))).
// Codes carry only theme data, never code; decoding validates like any other untrusted theme.
import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate'
import type { Theme } from '../types'
import { ThemeValidationError, validateTheme } from './model'

const PREFIX = 'SC1:'

export function encodeShareCode(t: Theme): string {
  return PREFIX + toBase64Url(deflateSync(strToU8(JSON.stringify(t)), { level: 9 }))
}

/** Throws an Error with a friendly message on invalid input. */
export function decodeShareCode(code: string): Theme {
  const trimmed = code.replace(/\s+/g, '')
  if (!trimmed.startsWith(PREFIX)) {
    throw new Error("This doesn't look like a theme code. Theme codes start with SC1:")
  }
  let json: unknown
  try {
    json = JSON.parse(strFromU8(inflateSync(fromBase64Url(trimmed.slice(PREFIX.length)))))
  } catch (e) {
    throw new Error('This theme code is damaged or incomplete. Ask for it to be copied again.', { cause: e })
  }
  try {
    return validateTheme(json)
  } catch (e) {
    const reason = e instanceof ThemeValidationError ? ` (${e.message})` : ''
    throw new Error(`This theme code doesn't contain a usable theme${reason}.`, { cause: e })
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return Uint8Array.from(binary, c => c.charCodeAt(0))
}
