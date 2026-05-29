import { TEMPLATES } from '../../lib/templates'
import type { OrderData } from '../../lib/types'
import { DoorOutline } from './DoorOutline'
import { useT } from '../../lib/i18n'

interface Props {
  order: OrderData
  onPick: (templateId: string) => void
}

export function TemplateGallery({ order, onPick }: Props) {
  const { t } = useT()
  return (
    <div className="p-4">
      <p className="text-xs text-zinc-500 font-mono mb-3 uppercase tracking-wider">
        {t('templateGallery.hint')}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {TEMPLATES.map((t) => {
          const built = t.build(order)
          const previewOrder: OrderData = {
            ...order,
            sketch: {
              templateId: t.id,
              verticalLines: built.verticalLines,
              horizontalLines: built.horizontalLines,
              freehand: [],
            },
          }
          return (
            <button
              key={t.id}
              type="button"
              className="bg-white border border-black/15 hover:border-black active:bg-soft p-3 text-left transition"
              onClick={() => onPick(t.id)}
              data-active={order.sketch.templateId === t.id}
            >
              <div className="aspect-[3/5] mb-2 bg-paper border border-black/10 overflow-hidden">
                <TemplateThumb order={previewOrder} />
              </div>
              <div className="font-mono text-xs font-bold">{t.name}</div>
              <div className="font-mono text-[11px] text-zinc-500 leading-snug mt-1">
                {t.description}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TemplateThumb({ order }: { order: OrderData }) {
  const { breedte, hoogte, sketch } = order
  const margin = 40
  return (
    <svg
      viewBox={`${-margin} ${-margin} ${breedte + margin * 2} ${hoogte + margin * 2}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
    >
      <DoorOutline order={order} showGlassFill />
      {sketch.verticalLines.map((v) => (
        <line
          key={v.id}
          x1={v.x}
          y1={0}
          x2={v.x}
          y2={hoogte}
          stroke="#0A0A0A"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {sketch.horizontalLines.map((h) => (
        <line
          key={h.id}
          x1={0}
          y1={hoogte - h.y}
          x2={breedte}
          y2={hoogte - h.y}
          stroke="#0A0A0A"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}
