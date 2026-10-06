import { createTopContentSource, mapTopContent, pickImage, StatsShapeError, topContentVariables, uriToPath } from './data'
import { topContentResponse } from './fixtures'

describe('mapTopContent', () => {
  it('maps artists and tracks into view models', () => {
    const content = mapTopContent(topContentResponse(2))
    expect(content.artists[0]).toEqual({
      uri: 'spotify:artist:artist1',
      path: '/artist/artist1',
      name: 'Artist 1',
      subtitle: 'Artist',
      images: [
        { url: 'https://i.scdn.co/image/a1-160', width: 160 },
        { url: 'https://i.scdn.co/image/a1-640', width: 640 },
      ],
    })
    expect(content.tracks[1]).toMatchObject({ path: '/track/track2', name: 'Track 2', subtitle: 'Artist 2, Guest' })
  })

  it('skips items of unexpected types or without a name', () => {
    const response = topContentResponse(2)
    response.me.profile.topArtists.items[0].data.__typename = 'Podcast'
    expect(mapTopContent(response).artists.map(a => a.name)).toEqual(['Artist 2'])
  })

  it('returns empty lists for a user without listening history', () => {
    expect(mapTopContent(topContentResponse(0))).toEqual({ artists: [], tracks: [] })
  })

  it('throws StatsShapeError when the structure is gone', () => {
    expect(() => mapTopContent({ me: null })).toThrow(StatsShapeError)
    expect(() => mapTopContent({ me: { profile: { topArtists: [] } } })).toThrow(StatsShapeError)
  })
})

describe('helpers', () => {
  it('builds variables Spotify accepts', () => {
    expect(topContentVariables('MID_TERM', 5)).toEqual({
      includeTopArtists: true,
      topArtistsInput: { offset: 0, limit: 5, sortBy: 'AFFINITY', timeRange: 'MID_TERM' },
      includeTopTracks: true,
      topTracksInput: { offset: 0, limit: 5, sortBy: 'AFFINITY', timeRange: 'MID_TERM' },
    })
  })

  it('picks the smallest image that is big enough', () => {
    const sources = [
      { url: 's', width: 64 },
      { url: 'm', width: 300 },
      { url: 'l', width: 640 },
    ]
    expect(pickImage(sources, 160)).toBe('m')
    expect(pickImage(sources, 1000)).toBe('l')
    expect(pickImage([], 10)).toBeNull()
  })

  it('converts URIs to in-app paths', () => {
    expect(uriToPath('spotify:track:abc')).toBe('/track/abc')
    expect(uriToPath('nonsense')).toBeNull()
  })
})

describe('createTopContentSource', () => {
  it('caches per range and drops failed loads', async () => {
    const query = vi.fn<(op: string, vars: object) => Promise<unknown>>()
    query.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(topContentResponse(1))
    const source = createTopContentSource(query)

    await expect(source.load('SHORT_TERM')).rejects.toThrow('offline')
    const loaded = await source.load('SHORT_TERM')
    await source.load('SHORT_TERM')
    expect(loaded.artists).toHaveLength(1)
    expect(query).toHaveBeenCalledTimes(2)
    expect(query).toHaveBeenLastCalledWith('userTopContent', topContentVariables('SHORT_TERM'))
  })
})
