import type { OrderData } from '../../lib/types'
import { visualGeometry } from '../../lib/calculations'

interface Props {
  order: OrderData
  showGlassFill?: boolean
  clientView?: boolean
}

export function DoorOutline({ order, showGlassFill = true, clientView = false }: Props) {
  const { breedte, hoogte } = order
  const geo = visualGeometry(order)
  const bladeX = (breedte - geo.bladeWidth) / 2
  const bladeY = (hoogte - geo.bladeHeight) / 2

  const glassX = bladeX + (geo.bladeWidth - geo.glassWidth) / 2
  const glassY = bladeY + 24 // small top offset

  const strokeOuter = clientView ? 2.5 : 2
  const glassFill = clientView ? '#E5EEF5' : showGlassFill ? '#F2F4F7' : 'none'

  return (
    <g>
      {/* outer kozijn */}
      <rect
        x={0}
        y={0}
        width={breedte}
        height={hoogte}
        fill={clientView ? '#F8F6F1' : '#FFFFFF'}
        stroke="#0A0A0A"
        strokeWidth={strokeOuter}
        vectorEffect="non-scaling-stroke"
      />
      {/* deurblad */}
      <rect
        x={bladeX}
        y={bladeY}
        width={geo.bladeWidth}
        height={geo.bladeHeight}
        fill={clientView ? '#F4F1EA' : '#FFFFFF'}
        stroke="#0A0A0A"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      {/* glas-uitsparing (visueel) */}
      <rect
        x={glassX}
        y={glassY}
        width={geo.glassWidth}
        height={geo.glassHeight}
        fill={glassFill}
        stroke={clientView ? '#9BB3C8' : '#0A0A0A'}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      {clientView ? (
        // simpele glas-glanslijn voor 'wow'-factor in klant-zicht
        <line
          x1={glassX + geo.glassWidth * 0.15}
          y1={glassY + geo.glassHeight * 0.05}
          x2={glassX + geo.glassWidth * 0.4}
          y2={glassY + geo.glassHeight * 0.35}
          stroke="#FFFFFF"
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0.6}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </g>
  )
}
