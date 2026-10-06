// What the Reactive tab says about music capture right now, in plain words. Pure.
import type { AudioStatus } from '../../types'

export type StatusTone = 'live' | 'idle' | 'warn'

export interface StatusLine {
  tone: StatusTone
  title: string
  detail?: string
}

const MAC_ALLOW = 'Allow Spotify Custom in System Settings → Privacy & Security → Screen & System Audio Recording, then switch music-reactive off and on.'

export function reactiveStatusLine(status: AudioStatus, opts: { enabled: boolean; anyEffectOn: boolean }): StatusLine {
  if (!opts.enabled) return { tone: 'idle', title: 'Off', detail: 'Switch it on to let the theme move with the music.' }
  switch (status.state) {
    case 'listening':
      return { tone: 'live', title: 'Listening to Spotify' }
    case 'starting':
      return { tone: 'idle', title: 'Starting…' }
    case 'no-signal':
      return { tone: 'warn', title: 'No sound is reaching us', detail: `If you said no to the audio permission on a Mac: ${MAC_ALLOW}` }
    case 'needs-permission':
      return { tone: 'warn', title: 'Permission needed', detail: MAC_ALLOW }
    case 'unsupported':
      return { tone: 'warn', title: 'Not available here', detail: status.message ?? 'Needs macOS 14.2 or later, or Windows 11.' }
    case 'error':
      return { tone: 'warn', title: "Couldn't listen", detail: status.message ?? 'Something went wrong. Try switching it off and on.' }
    case 'off':
      return opts.anyEffectOn
        ? { tone: 'idle', title: 'Waiting for music', detail: 'Listens while a song plays and Spotify is on screen.' }
        : { tone: 'idle', title: 'Pick an effect below', detail: 'Nothing listens until at least one effect is on.' }
  }
}
