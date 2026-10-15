// The shortcut actions as a data table: label, icon, when the button applies to a song, and what a click does.
// Icons and labels match the studio's picker (builder/tabs/menu/ShortcutsSection.tsx).
import { Disc3, Heart, Link, ListEnd, ListPlus, ListX, Radio, UserRound } from 'lucide-static'
import type { ShortcutAction } from '../types'
import type { Likes } from './likes'
import type { Song } from './song'
import type { ShortcutSource } from './source'

export interface ActionContext {
  source: ShortcutSource
  likes: Likes
  song: Song
  /** The clicked button, for popups placed beside it. */
  button: DOMRect
}

/** done = confirm with a check mark · quiet = the result speaks for itself (navigated, picker open, heart filled). */
export type Outcome = 'done' | 'quiet'

export interface ActionDef {
  label: string
  /** Label while the button is on (the song is liked). */
  onLabel?: string
  icon: string
  /** Said in the toast when the action fails. */
  failure: string
  /** Hidden on songs where it can't run (unknown album, rows that aren't queued, …). */
  applies(song: Song, queued: boolean, source: ShortcutSource): boolean
  run(ctx: ActionContext): Promise<Outcome>
}

function open(source: ShortcutSource, uri: string | null): Outcome {
  const path = uri ? source.uriToPath(uri) : null
  if (!path) throw new Error(`no page for ${String(uri)}`)
  source.navigate(path)
  return 'quiet'
}

const always = () => true

export const ACTIONS: Record<ShortcutAction, ActionDef> = {
  'add-to-queue': {
    label: 'Add to queue',
    icon: ListEnd,
    failure: "Couldn't add to queue",
    applies: always,
    run: async ({ source, song }) => {
      await source.addToQueue([song.uri])
      return 'done'
    },
  },
  'add-to-liked-songs': {
    label: 'Save to Liked Songs',
    onLabel: 'Remove from Liked Songs',
    icon: Heart,
    failure: "Couldn't update Liked Songs",
    applies: always,
    run: async ({ source, likes, song }) => {
      const liked = likes.get(song.uri) ?? (await source.isLiked([song.uri])).at(0) === true
      await source.setLiked([song.uri], !liked)
      likes.set(song.uri, !liked)
      return 'quiet'
    },
  },
  'add-to-playlist': {
    label: 'Add to playlist',
    icon: ListPlus,
    failure: "Couldn't open your playlists",
    applies: always,
    run: ({ source, song, button }) => {
      source.openPlaylistPicker({ x: button.left, y: button.bottom }, [song.uri])
      return Promise.resolve('quiet')
    },
  },
  'go-to-album': {
    label: 'Go to album',
    icon: Disc3,
    failure: "Couldn't open the album",
    applies: song => song.albumUri !== null,
    run: ({ source, song }) => Promise.resolve(open(source, song.albumUri)),
  },
  'go-to-artist': {
    label: 'Go to artist',
    icon: UserRound,
    failure: "Couldn't open the artist",
    applies: song => song.artistUri !== null,
    run: ({ source, song }) => Promise.resolve(open(source, song.artistUri)),
  },
  'go-to-radio': {
    label: 'Go to song radio',
    icon: Radio,
    failure: "Couldn't open the song radio",
    applies: (_song, _queued, source) => source.songRadio !== undefined,
    run: async ({ source, song }) => open(source, (await source.songRadio?.(song.uri)) ?? null),
  },
  share: {
    label: 'Copy song link',
    icon: Link,
    failure: "Couldn't copy the link",
    applies: always,
    run: async ({ source, song }) => {
      await source.copyLink(song.uri)
      return 'done'
    },
  },
  'remove-from-queue': {
    label: 'Remove from queue',
    icon: ListX,
    failure: "Couldn't remove from queue",
    applies: (song, queued) => queued && song.uid !== null,
    run: async ({ source, song }) => {
      if (song.uid === null) throw new Error('not a queue entry')
      await source.removeFromQueue([{ uri: song.uri, uid: song.uid }])
      return 'done'
    },
  },
}
