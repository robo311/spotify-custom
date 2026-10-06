// Readability issues of the active palette, recomputed only when the palette changes.
import { useMemo } from 'preact/hooks'
import { CONTRAST_PAIRS, contrastRatio, fixContrast } from '../../theme/palette'
import { useApp } from '../context'
import { contrastIssues, type ContrastIssue, type ContrastTools } from './contrast'

export const contrastTools: ContrastTools = { pairs: CONTRAST_PAIRS, ratio: contrastRatio, fix: fixContrast }

export function useContrastIssues(): ContrastIssue[] {
  const palette = useApp(s => s.active.palette)
  return useMemo(() => contrastIssues(palette, contrastTools), [palette])
}
