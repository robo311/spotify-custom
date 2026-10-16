// Music-reactive: the master switch and sync (personal settings) and how each effect looks (part of the theme).
import { ChartColumn, HeartPulse, MicVocal, Radio, Wind } from 'lucide-static'
import { useEffect, useState } from 'preact/hooks'
import type { AudioStatus, ReactiveLook } from '../../types'
import { reactiveMonitor } from '../../audio'
import { REACTIVE_SENSITIVITY_MAX, REACTIVE_SENSITIVITY_MIN, REACTIVE_SYNC_MAX, REACTIVE_SYNC_MIN } from '../../theme/model'
import { useApp, useEnv } from '../context'
import { reactiveStatusLine } from '../lib/reactive-status'
import { NOW_PLAYING_BAR, REMOTE_DEVICE_STRIP } from '../selectors'
import { css, useStyles } from '../styles/sheet'
import { ColorField } from '../ui/ColorField'
import { Field } from '../ui/Field'
import { Section } from '../ui/Section'
import { Segmented } from '../ui/Segmented'
import { Slider } from '../ui/Slider'
import { Toggle } from '../ui/Toggle'
import { LevelMeter } from './reactive/LevelMeter'

const styles = css`
  .b-rx-status {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2px 8px;
    align-items: baseline;
  }
  .b-rx-status__lamp {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: var(--b-slot);
    box-shadow: var(--b-well-edge);
    align-self: center;
  }
  .b-rx-status[data-tone='live'] .b-rx-status__lamp {
    background: var(--b-accent);
    box-shadow: none;
  }
  .b-rx-status[data-tone='warn'] .b-rx-status__lamp {
    background: var(--b-warn);
    box-shadow: none;
  }
  .b-rx-status__title {
    font-weight: 600;
  }
  .b-rx-status .b-hint {
    grid-column: 2;
  }
`

function useAudioStatus(): AudioStatus {
  const [status, setStatus] = useState(reactiveMonitor.status)
  useEffect(() => reactiveMonitor.onStatus(setStatus), [])
  return status
}

/** Whether Spotify plays on another device (Connect), from the strip it adds to the player bar. */
function useRemotePlayback(): boolean {
  const [remote, setRemote] = useState(() => document.querySelector(REMOTE_DEVICE_STRIP) !== null)
  useEffect(() => {
    const bar = document.querySelector(NOW_PLAYING_BAR)
    if (!bar) return
    const check = () => setRemote(document.querySelector(REMOTE_DEVICE_STRIP) !== null)
    const observer = new MutationObserver(check)
    observer.observe(bar, { childList: true })
    check()
    return () => observer.disconnect()
  }, [])
  return remote
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export function ReactiveTab() {
  useStyles(styles)
  const { store } = useEnv()
  const settings = useApp(s => s.settings.reactive)
  const look = useApp(s => s.active.effects.reactive)
  const accent = useApp(s => s.active.palette.accent)
  const [colourOpen, setColourOpen] = useState(false)
  const status = useAudioStatus()
  const platform = useApp(s => s.helper.platform)
  const remote = useRemotePlayback()
  const reducedMotion = useReducedMotion()
  const anyOn = look.spectrum.on || look.pulse.on || look.background.on || look.lyrics.on
  const line = reactiveStatusLine(status, { enabled: settings.enabled, anyEffectOn: anyOn, platform, remote })

  const editLook = (mutate: (l: ReactiveLook) => void, coalesceKey?: string) =>
    store.edit(t => mutate(t.effects.reactive), coalesceKey ? { coalesceKey } : undefined)
  const intensity = (key: 'spectrum' | 'pulse' | 'background' | 'lyrics') => (
    <Slider
      label="Intensity"
      min={0}
      max={100}
      step={5}
      unit="%"
      value={look[key].intensity}
      onInput={v =>
        editLook(l => {
          l[key].intensity = v
        }, `reactive.${key}.intensity`)
      }
    />
  )
  const onOff = (key: 'spectrum' | 'pulse' | 'background' | 'lyrics', label: string, description: string) => (
    <Toggle
      label={label}
      description={description}
      checked={look[key].on}
      onChange={v =>
        editLook(l => {
          l[key].on = v
        })
      }
    />
  )

  return (
    <>
      <Section title="Music-reactive" icon={Radio}>
        <Toggle
          label="React to the music"
          description="Listens only to Spotify's own sound. Nothing is recorded or saved."
          checked={settings.enabled}
          onChange={v =>
            store.editSettings(s => {
              s.reactive.enabled = v
            })
          }
        />
        <span class="b-hint">
          While music plays, these effects keep redrawing part of the window, so Spotify uses more CPU and GPU (and
          battery on a laptop). Each effect you turn on adds a little.
        </span>
        <div class="b-rx-status" data-tone={line.tone} role="status">
          <span class="b-rx-status__lamp" aria-hidden="true" />
          <span class="b-rx-status__title">{line.title}</span>
          {line.detail && <span class="b-hint">{line.detail}</span>}
        </div>
        {settings.enabled && <LevelMeter />}
        <Slider
          label="Sync"
          min={REACTIVE_SYNC_MIN}
          max={REACTIVE_SYNC_MAX}
          step={10}
          unit=" ms"
          value={settings.syncMs}
          onInput={v =>
            store.editSettings(s => {
              s.reactive.syncMs = v
            })
          }
        />
        <span class="b-hint">
          Move it if the motion runs ahead of or behind what you hear. Wireless headphones add delay
          {status.latencyMs > 0 ? `; your speakers add about ${status.latencyMs} ms, already included.` : '.'}
        </span>
        <Slider
          label="Sensitivity"
          min={REACTIVE_SENSITIVITY_MIN * 100}
          max={REACTIVE_SENSITIVITY_MAX * 100}
          step={5}
          unit="%"
          value={Math.round(look.sensitivity * 100)}
          onInput={v =>
            editLook(l => {
              l.sensitivity = v / 100
            }, 'reactive.sensitivity')
          }
        />
      </Section>

      <Section title="Spectrum" icon={ChartColumn}>
        {onOff('spectrum', 'Spectrum', "The song's sound as bars rising from the progress bar")}
        {look.spectrum.on && (
          <>
            {intensity('spectrum')}
            <Field label="Shape">
              <Segmented<ReactiveLook['spectrum']['shape']>
                label="Spectrum shape"
                value={look.spectrum.shape}
                options={[
                  { value: 'bars', label: 'Bars' },
                  { value: 'mirror', label: 'Mirror', title: 'Bars reaching both ways from the line' },
                  { value: 'line', label: 'Line' },
                  { value: 'blocks', label: 'Blocks', title: 'Segments that light up like an LED meter' },
                  { value: 'peaks', label: 'Peaks', title: 'Bars with caps that hang at the peak, then fall' },
                ]}
                onChange={v =>
                  editLook(l => {
                    l.spectrum.shape = v
                  })
                }
              />
            </Field>
            <Field label="Colour">
              <Segmented<ReactiveLook['spectrum']['color']>
                label="Spectrum colour"
                value={look.spectrum.color}
                options={[
                  { value: 'accent', label: 'Accent' },
                  { value: 'cover', label: 'Cover', title: 'The colour of the playing cover' },
                ]}
                onChange={v =>
                  editLook(l => {
                    l.spectrum.color = v
                  })
                }
              />
            </Field>
          </>
        )}
      </Section>

      <Section title="Beat pulse" icon={HeartPulse}>
        {onOff('pulse', 'Beat pulse', reducedMotion ? 'Paused: your system asks for reduced motion' : 'Kicks on every beat')}
        {look.pulse.on && (
          <>
            {intensity('pulse')}
            {(
              [
                ['cover', 'Cover art'],
                ['play', 'Play button'],
              ] as const
            ).map(([key, label]) => (
              <Toggle
                key={key}
                label={label}
                checked={look.pulse[key]}
                onChange={v =>
                  editLook(l => {
                    l.pulse[key] = v
                  })
                }
              />
            ))}
          </>
        )}
      </Section>

      <Section title="Breathing background" icon={Wind}>
        {onOff('background', 'Breathing background', 'A light that swells with the bass')}
        {look.background.on && (
          <>
            {intensity('background')}
            <Field label="Colour">
              <Segmented<ReactiveLook['background']['color']>
                label="Breathing background colour"
                value={look.background.color}
                options={[
                  { value: 'cover', label: 'Cover', title: 'The colour of the playing cover' },
                  { value: 'accent', label: 'Accent' },
                  { value: 'custom', label: 'Custom' },
                ]}
                onChange={v =>
                  editLook(l => {
                    l.background.color = v
                  })
                }
              />
            </Field>
            {look.background.color === 'custom' && (
              <div style={{ margin: '0 -8px' }}>
                <ColorField
                  label="Light colour"
                  value={look.background.customColor ?? accent}
                  open={colourOpen}
                  onToggle={() => setColourOpen(!colourOpen)}
                  onChange={hex =>
                    hex &&
                    editLook(l => {
                      l.background.customColor = hex
                    }, 'reactive.background.customColor')
                  }
                />
              </div>
            )}
          </>
        )}
      </Section>

      <Section title="Lyrics" icon={MicVocal}>
        {onOff('lyrics', 'Lyrics react', 'The sung line grows and brightens with the voice')}
        {look.lyrics.on && intensity('lyrics')}
      </Section>
    </>
  )
}
