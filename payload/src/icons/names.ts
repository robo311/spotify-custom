// The icons a pack can replace. File names in user packs (icons/<pack>/<name>.svg) use these names.
export const ICON_NAMES = ['play', 'pause', 'next', 'prev', 'shuffle', 'repeat', 'home', 'search', 'library', 'queue', 'lyrics', 'volume', 'volumeMuted', 'browse', 'notifications', 'friends'] as const
export type IconName = (typeof ICON_NAMES)[number]
