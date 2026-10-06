// Test fixture: the shape of a real `userTopContent` response (Spotify 1.3.3), with all names/ids made up.

const image = (id: string, sizes: number[]) => ({
  sources: sizes.map(size => ({ url: `https://i.scdn.co/image/${id}-${size}`, width: size, height: size })),
})

export function artistItem(n: number) {
  return {
    data: {
      __typename: 'Artist',
      uri: `spotify:artist:artist${n}`,
      profile: { name: `Artist ${n}` },
      visuals: { avatarImage: image(`a${n}`, [640, 160]) },
    },
  }
}

export function trackItem(n: number) {
  return {
    data: {
      __typename: 'Track',
      uri: `spotify:track:track${n}`,
      name: `Track ${n}`,
      albumOfTrack: { name: `Album ${n}`, uri: `spotify:album:album${n}`, coverArt: image(`t${n}`, [300, 64]) },
      artists: { items: [{ profile: { name: `Artist ${n}` }, uri: `spotify:artist:artist${n}` }, { profile: { name: 'Guest' }, uri: 'spotify:artist:guest' }] },
      duration: { totalMilliseconds: 180000 },
      contentRating: { label: 'NONE' },
      saved: true,
    },
  }
}

export function topContentResponse(count = 5) {
  const range = Array.from({ length: count }, (_, i) => i + 1)
  return {
    me: {
      profile: {
        topArtists: { __typename: 'ArtistPageV2', totalCount: count, items: range.map(artistItem) },
        topTracks: { __typename: 'TrackPageV2', totalCount: count, items: range.map(trackItem) },
      },
    },
  }
}
