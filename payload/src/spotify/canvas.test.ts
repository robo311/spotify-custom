import { describe, expect, it } from 'vitest'
import { canvasIdOf, canvasUrls, pickProfile } from './canvas'

const FILE_ID = '780e3d4553633463b21ee4cea8eff783'

// Trimmed from a live manifest (Spotify 1.3.4.258): the profile list keeps one of each kind, tokens shortened.
const MANIFEST = {
  contents: [
    {
      segment_length: 4,
      end_time_millis: 7039,
      profiles: [
        { id: 6, file_type: 'mp4', mime_type: 'video/mp4', video_codec: 'avc1.4d401f', video_width: 480 },
        { id: 12, file_type: 'ts', mime_type: 'video/mp2t', video_codec: 'avc1.4d401f', video_width: 480 },
        { id: 3, file_type: 'webm', mime_type: 'video/webm', video_codec: 'vp9', video_width: 320 },
        { id: 2, file_type: 'webm', mime_type: 'video/webm', video_codec: 'vp9', video_width: 480 },
        { id: 1, file_type: 'webm', mime_type: 'video/webm', video_codec: 'vp9', video_width: 720 },
        { id: 0, file_type: 'webm', mime_type: 'video/webm', video_codec: 'vp9', video_width: 1080 },
      ],
    },
  ],
  initialization_template: `v1/sources/${FILE_ID}/profiles/{{profile_id}}/inits/{{file_type}}?fauth=t`,
  segment_template: `v1/sources/${FILE_ID}/profiles/{{profile_id}}/{{segment_timestamp}}.{{file_type}}?fauth=t`,
  base_urls: ['https://video-cf.spotifycdn.com/segments/', 'https://video-fa.scdn.co/segments/'],
}

const vp9Only = (mime: string) => mime === 'video/webm; codecs="vp9"'

describe('canvasIdOf', () => {
  it("reads a looping video's file id from the track's metadata", () => {
    expect(canvasIdOf({ 'canvas.type': 'VIDEO_LOOPING_RANDOM', 'canvas.fileId': FILE_ID })).toBe(FILE_ID)
    expect(canvasIdOf({ 'canvas.type': 'VIDEO_LOOPING', 'canvas.fileId': FILE_ID })).toBe(FILE_ID)
  })

  it('ignores still images, missing or malformed ids, and anything that is not metadata', () => {
    expect(canvasIdOf({ 'canvas.type': 'IMAGE', 'canvas.fileId': FILE_ID })).toBeNull()
    expect(canvasIdOf({ 'canvas.type': 'VIDEO_LOOPING' })).toBeNull()
    expect(canvasIdOf({ 'canvas.type': 'VIDEO_LOOPING', 'canvas.fileId': '../../x' })).toBeNull()
    expect(canvasIdOf(null)).toBeNull()
  })
})

describe('pickProfile', () => {
  it('takes the smallest playable profile at least as wide as asked', () => {
    expect(pickProfile(MANIFEST, 400, vp9Only)).toEqual({ id: 2, fileType: 'webm', mime: 'video/webm; codecs="vp9"' })
    expect(pickProfile(MANIFEST, 720, vp9Only)?.id).toBe(1)
  })

  it('falls back to the widest playable one, and to nothing when this client plays none', () => {
    expect(pickProfile(MANIFEST, 4000, vp9Only)?.id).toBe(0)
    expect(pickProfile(MANIFEST, 400, () => false)).toBeNull()
    expect(pickProfile({}, 400, vp9Only)).toBeNull()
  })
})

describe('canvasUrls', () => {
  it('lists the init segment, then one media segment per segment length up to the end', () => {
    expect(canvasUrls(MANIFEST, { id: 2, fileType: 'webm', mime: 'video/webm; codecs="vp9"' })).toEqual([
      `https://video-cf.spotifycdn.com/segments/v1/sources/${FILE_ID}/profiles/2/inits/webm?fauth=t`,
      `https://video-cf.spotifycdn.com/segments/v1/sources/${FILE_ID}/profiles/2/0.webm?fauth=t`,
      `https://video-cf.spotifycdn.com/segments/v1/sources/${FILE_ID}/profiles/2/4.webm?fauth=t`,
    ])
  })

  it('refuses a manifest pointing anywhere but https', () => {
    expect(canvasUrls({ ...MANIFEST, base_urls: ['http://evil.example/'] }, { id: 2, fileType: 'webm', mime: '' })).toEqual([])
  })
})
