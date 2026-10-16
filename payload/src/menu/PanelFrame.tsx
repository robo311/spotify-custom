// The menu panel's look for the studio: `children` render in their own shadow root with the live menu's styles (plus
// `css` for the studio's additions), so the studio's styles and the menu's stay apart.
import { render, type ComponentChildren } from 'preact'
import { useLayoutEffect, useRef } from 'preact/hooks'
import { PANEL_CSS } from './styles'

export function PanelFrame({ css = '', children }: { css?: string; children: ComponentChildren }) {
  const ref = useRef<HTMLDivElement>(null)

  // Every render: the children are a separate tree, so they follow the studio's state only when drawn again.
  useLayoutEffect(() => {
    const host = ref.current
    if (!host) return
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
    render(
      <>
        <style>{PANEL_CSS + css}</style>
        {children}
      </>,
      shadow,
    )
  })

  useLayoutEffect(() => {
    const host = ref.current
    return () => {
      if (host?.shadowRoot) render(null, host.shadowRoot)
    }
  }, [])

  return <div ref={ref} />
}
