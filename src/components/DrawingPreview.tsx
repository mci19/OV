import { useMemo } from 'react'
import { generateDrawing } from '../lib/drawingGenerator'
import type { DoorConfig } from '../lib/types'

interface Props {
  config: DoorConfig
  variant?: 'full' | 'glass-frame-only'
  className?: string
}

export function DrawingPreview({ config, variant = 'full', className }: Props) {
  const svg = useMemo(() => generateDrawing(config, { variant }), [config, variant])
  return (
    <div
      className={className ?? 'w-full h-full'}
      // SVG output is generated only from typed config — no user HTML; safe.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
