// Presets and your themes, as one hover-preview area: gliding anywhere inside keeps previewing, leaving reverts.
import { CopyPlus } from 'lucide-static'
import { useApp, useEnv } from '../../context'
import { css, useStyles } from '../../styles/sheet'
import { Button } from '../../ui/Button'
import { ResetButton } from '../../ui/ResetButton'
import { Section } from '../../ui/Section'
import { ThemeGallery } from './ThemeGallery'
import { GalleryPreviewContext, useGalleryPreview } from './gallery-preview'

const styles = css`
  .b-start__actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
  }
  .b-start__empty {
    padding: 14px;
    border-radius: var(--b-r-md);
    box-shadow: inset 0 0 0 1px var(--b-line);
    color: var(--b-sub);
    font-size: 12px;
  }
`

export function GallerySections() {
  useStyles(styles)
  const { store } = useEnv()
  const presets = useApp(s => s.presets)
  const userThemes = useApp(s => s.userThemes)
  const active = useApp(s => s.active)
  const isPreset = useApp(s => s.activeIsPreset)
  const preview = useGalleryPreview()

  return (
    <GalleryPreviewContext.Provider value={preview}>
      <div onPointerLeave={() => preview.leaveGallery()}>
        <Section title="Presets">
          <ThemeGallery themes={presets} />
        </Section>
        <Section
          title="Your themes"
          aside={
            <div class="b-start__actions">
              {!isPreset && active.basedOn && <ResetButton label="Reset to the original preset" onClick={() => store.resetToPreset()} />}
              <Button icon={CopyPlus} onClick={() => store.saveAs(`${active.name} copy`)}>
                Save a copy
              </Button>
            </div>
          }
        >
          {userThemes.length ? (
            <ThemeGallery themes={userThemes} editable />
          ) : (
            <div class="b-start__empty">Change anything in a preset and your version shows up here, saved automatically.</div>
          )}
        </Section>
      </div>
    </GalleryPreviewContext.Provider>
  )
}
