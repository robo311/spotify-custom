// Built-in, read-only themes. Editing one forks it into a user theme (see store).
// Palette semantics (see types.ts): background = content panels, surface = app frame around them,
// elevated = cards/menus/hover. Every preset must pass presets.test.ts (readability + distinctness rules).
import type { Effects, LayoutConfig, LyricsStyle, Palette, Theme } from '../types'
import { defaultEffects, defaultHomeStyle, defaultLayout, defaultLyrics, defaultPageStyle, defaultReactiveLook, THEME_SCHEMA } from './model'

export const DEFAULT_PRESET_ID = 'darcula'
export const SPOTIFY_ORIGINAL_ID = 'spotify-original'

/** Spotify's own dark-theme values (probed from 1.3.3). Used to detect "native" palettes. */
export const SPOTIFY_PALETTE: Palette = {
  background: '#121212',
  surface: '#000000',
  elevated: '#1f1f1f',
  text: '#ffffff',
  textSubdued: '#b3b3b3',
  accent: '#1ed760',
  onAccent: '#000000',
  border: '#292929',
}

type PresetSpec = Pick<Theme, 'id' | 'name' | 'palette'> &
  Partial<Pick<Theme, 'font' | 'radius' | 'icons' | 'parts'>> & {
    effects?: Partial<Effects>
    layout?: Partial<LayoutConfig>
    lyrics?: Partial<LyricsStyle>
  }

function presetReactiveLook() {
  const look = defaultReactiveLook()
  look.spectrum.on = true
  look.pulse.on = true
  return look
}

function preset(spec: PresetSpec): Theme {
  return {
    schema: THEME_SCHEMA,
    basedOn: null,
    font: 'inter',
    radius: 8,
    icons: 'line',
    iconOverrides: {},
    parts: {},
    css: '',
    ...spec,
    homeStyle: defaultHomeStyle(),
    pageStyle: defaultPageStyle(),
    layout: { ...defaultLayout(), ...spec.layout },
    // Presets default to the glowing progress bar; moods and Spotify Original override it below. They also come with
    // the spectrum and beat pulse picked, so switching music-reactive on shows something; capture itself stays off
    // until the user turns it on (Settings.reactive).
    effects: { ...defaultEffects(), progressBar: 'glow', reactive: presetReactiveLook(), ...spec.effects },
    // Presets default to themed lyrics; Spotify Original overrides back to Spotify's own look.
    lyrics: { ...defaultLyrics(), background: 'theme', ...spec.lyrics },
  }
}

export const PRESETS: Theme[] = [
  preset({
    id: 'darcula',
    name: 'Darcula',
    // JetBrains New UI dark: editor-dark panels inside lighter tool-window chrome, JetBrains blue.
    palette: {
      background: '#1e1f22',
      surface: '#2b2d30',
      elevated: '#393b40',
      text: '#dfe1e5',
      textSubdued: '#a8adb5',
      accent: '#548af7',
      onAccent: '#0b1220',
      border: '#43454a',
    },
    radius: 6,
  }),
  preset({
    id: SPOTIFY_ORIGINAL_ID,
    name: 'Spotify Original',
    palette: SPOTIFY_PALETTE,
    font: 'spotify',
    icons: 'spotify',
    lyrics: defaultLyrics(),
    effects: { progressBar: 'spotify', reactive: defaultReactiveLook() },
  }),
  preset({
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    palette: {
      background: '#1e1e2e', // base
      surface: '#181825', // mantle
      elevated: '#313244', // surface0
      text: '#cdd6f4', // text
      textSubdued: '#a6adc8', // subtext0
      accent: '#cba6f7', // mauve
      onAccent: '#11111b', // crust
      border: '#45475a', // surface1
    },
    radius: 12,
  }),
  preset({
    id: 'tokyo-night',
    name: 'Tokyo Night',
    palette: {
      background: '#1a1b26', // bg
      surface: '#16161e', // bg_dark
      elevated: '#292e42', // bg_highlight
      text: '#c0caf5', // fg
      textSubdued: '#a9b1d6', // fg_dark
      accent: '#7aa2f7', // blue
      onAccent: '#16161e', // bg_dark
      border: '#3b4261', // fg_gutter
    },
    radius: 10,
  }),
  preset({
    id: 'gruvbox-dark',
    name: 'Gruvbox Dark',
    palette: {
      background: '#282828', // bg0
      surface: '#1d2021', // bg0_h
      elevated: '#3c3836', // bg1
      text: '#ebdbb2', // fg
      textSubdued: '#bdae93', // fg3
      accent: '#fabd2f', // yellow
      onAccent: '#282828', // bg0
      border: '#504945', // bg2
    },
    radius: 4,
  }),
  preset({
    id: 'nord',
    name: 'Nord',
    palette: {
      background: '#2e3440', // nord0
      surface: '#242933', // nord0, darkened (Nord has no darker polar-night shade for the app frame)
      elevated: '#3b4252', // nord1
      text: '#eceff4', // nord6
      textSubdued: '#bcc4d2', // between nord3 and nord4: nord3 fails contrast, nord4 is too close to text
      accent: '#88c0d0', // nord8
      onAccent: '#242933',
      border: '#4c566a', // nord3
    },
    radius: 8,
  }),
  preset({
    id: 'midnight-blue',
    name: 'Midnight Blue',
    palette: {
      background: '#0d1b3a',
      surface: '#07112a',
      elevated: '#1a2e5c',
      text: '#ecf2ff',
      textSubdued: '#a8bce6',
      accent: '#5cc8ff',
      onAccent: '#04122b',
      border: '#26407a',
    },
    radius: 14,
    lyrics: { background: 'cover-blur', align: 'center', fontScale: 1.1 },
    // Lyrics page gets our Now playing column: the blurred cover backdrop is the star there.
    layout: { lyricsNowPlaying: true },
    effects: { ambientGlow: true, progressBar: 'flow' },
  }),
  preset({
    id: 'sunset',
    name: 'Sunset',
    palette: {
      background: '#2b1024',
      surface: '#1b0817',
      elevated: '#451a38',
      text: '#fff0e8',
      textSubdued: '#e7b9bf',
      accent: '#ff7b5c',
      onAccent: '#2a0a10',
      border: '#5e2a4a',
    },
    radius: 16,
    lyrics: { background: 'cover-blur', align: 'center', fontScale: 1.1 },
    // Lyrics page gets our Now playing column: the blurred cover backdrop is the star there.
    layout: { lyricsNowPlaying: true },
    // The signature coral-to-amber sweep on the big play button.
    parts: { playButton: { background: 'linear-gradient(135deg, #ff6b6b 0%, #ff8f5a 45%, #ffc24b 100%)' } },
    effects: { ambientGlow: true, progressBar: 'flow' },
  }),
  preset({
    id: 'forest',
    name: 'Forest',
    palette: {
      background: '#10261b',
      surface: '#081a10',
      elevated: '#1d3d2b',
      text: '#e8f5ea',
      textSubdued: '#aacdb5',
      accent: '#b8e986',
      onAccent: '#0c2412',
      border: '#2c5640',
    },
    radius: 12,
    lyrics: { background: 'theme', align: 'center' },
    effects: { ambientGlow: true, progressBar: 'wave' },
  }),
  preset({
    id: 'mono',
    name: 'Mono',
    palette: {
      background: '#0b0b0b',
      surface: '#000000',
      elevated: '#1c1c1c',
      text: '#ffffff',
      textSubdued: '#a6a6a6',
      accent: '#ffffff',
      onAccent: '#000000',
      border: '#333333',
    },
    font: 'jetbrains-mono',
    radius: 0,
    lyrics: { background: 'theme', font: 'theme', activeLine: '#ffffff', inactiveLine: '#6b6b6b', pastLine: '#a6a6a6' },
  }),
]

export function findPreset(id: string): Theme | undefined {
  return PRESETS.find(p => p.id === id)
}
