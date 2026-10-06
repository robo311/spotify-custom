// The one Reset control everywhere: small, icon-only, with a tooltip saying what it resets to.
import type { ButtonHTMLAttributes } from 'preact'
import { RotateCcw } from 'lucide-static'
import { IconButton } from './Button'

type ResetButtonProps = Omit<ButtonHTMLAttributes, 'icon' | 'label'> & { label?: string }

export function ResetButton({ label = 'Reset to theme default', ...rest }: ResetButtonProps) {
  return <IconButton icon={RotateCcw} size={15} label={label} {...rest} />
}
