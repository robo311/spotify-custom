// A static picture of the menu panel for the studio: the same rows and styles as the live menu, in its own shadow
// root so the studio's styles and ours stay apart.
import { render } from 'preact'
import { useLayoutEffect, useRef } from 'preact/hooks'
import type { Row } from './layout'
import type { PanelRow } from './model'
import { Panel } from './Panel'
import { PANEL_CSS } from './styles'

export interface MenuPreviewProps {
  rows: Row<{ key: string; label: string; submenu?: boolean }>[]
}

const toPanelRows = (rows: MenuPreviewProps['rows']): PanelRow[] =>
  rows.map(row =>
    row.kind === 'item' ? { kind: 'item', entry: { id: row.item.key, label: row.item.label, submenu: row.item.submenu } } : row,
  )

export function MenuPreview({ rows }: MenuPreviewProps) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const host = ref.current
    if (!host) return
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
    render(
      <>
        <style>{PANEL_CSS}</style>
        <Panel rows={toPanelRows(rows)} label="Menu preview" />
      </>,
      shadow,
    )
  }, [rows])

  useLayoutEffect(() => {
    const host = ref.current
    return () => {
      if (host?.shadowRoot) render(null, host.shadowRoot)
    }
  }, [])

  return <div ref={ref} style={{ display: 'inline-block' }} />
}
