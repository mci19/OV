import { Svg, Rect, Line, Text, G } from '@react-pdf/renderer'

/**
 * Horizontale doorsnede door het deurprofiel — toont hoe kozijn, blade,
 * glaslijst en glas elkaar grenzen, met dimensies (mm) bij elk segment.
 * Matcht de layout van de papieren MY DOORS productie-doorsnede.
 *
 * Lay-out (van links naar rechts):
 *   kozijn (40)  →  speling (4)  →  deurbladkader (20)  →  glaslijst (15)
 *   →  glas (3)  →  glaslijst (15)  →  blad (20)  →  speling (4)  →  kozijn (40)
 *
 * Wand-dikte van profielen = 2 mm (kokerprofielen).
 */
export function CrossSectionPdf({ width = 420, height = 110 }: { width?: number; height?: number }) {
  const W = 480
  const H = 110
  const stroke = '#1A1A1A'
  const fill = '#3A3A35'
  const lightFill = '#E8E5DC'
  const glassFill = '#D8E5EC'

  // x-segments (logical mm — visualization, not 1:1 with real mm)
  // Compress symmetrisch: kozijn iets verder uitsteken; midden meer ruimte
  // Pixel-positions
  const y = 36
  const profH = 22
  const wall = 2.5

  // Layout x-positions
  let x = 12
  const segs: { name: string; w: number; isProfile: boolean; isGlass?: boolean; isSpacing?: boolean }[] = [
    { name: '40', w: 60, isProfile: true },
    { name: '4',  w: 14, isProfile: false, isSpacing: true },
    { name: '20', w: 36, isProfile: true },
    { name: '15', w: 28, isProfile: true },
    { name: '3',  w: 8,  isProfile: false, isGlass: true },
    { name: '15', w: 28, isProfile: true },
    { name: '20', w: 36, isProfile: true },
    { name: '4',  w: 14, isProfile: false, isSpacing: true },
    { name: '40', w: 60, isProfile: true },
  ]

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} style={{ width, height }}>
      {/* Top dimension labels (kleine getallen op 15/35) */}
      <G>
        {/* "15" en "35" labels die in de echte tekening boven zitten */}
        <Text x={102} y={14} style={{ fontSize: 7, fill: '#555' }}>15</Text>
        <Text x={142} y={26} style={{ fontSize: 7, fill: '#555' }}>4</Text>
        <Text x={166} y={14} style={{ fontSize: 7, fill: '#555' }}>15</Text>
        <Text x={62}  y={26} style={{ fontSize: 7, fill: '#555' }}>35</Text>
        <Text x={362} y={14} style={{ fontSize: 7, fill: '#555' }}>20</Text>
        <Text x={336} y={26} style={{ fontSize: 7, fill: '#555' }}>3</Text>
        <Text x={368} y={26} style={{ fontSize: 7, fill: '#555' }}>35</Text>
      </G>

      {/* Segmenten van links naar rechts */}
      <G>
        {segs.map((s, i) => {
          const segX = x
          x += s.w
          if (s.isGlass) {
            // Glas-paneel — smal, lichter, blauwig
            return (
              <Rect
                key={i}
                x={segX} y={y}
                width={s.w} height={profH}
                fill={glassFill} stroke={stroke} strokeWidth={0.7}
              />
            )
          }
          if (s.isSpacing) {
            // Speling/gap — geen profiel, lege ruimte tussen kozijn en blade
            return null
          }
          // Stalen profiel-blok (rechthoek met holle binnenkant)
          return (
            <G key={i}>
              <Rect x={segX} y={y} width={s.w} height={profH} fill={fill} stroke={stroke} strokeWidth={0.6} />
              {/* holle binnenkant */}
              <Rect x={segX + wall} y={y + wall} width={s.w - wall * 2} height={profH - wall * 2} fill={lightFill} stroke={stroke} strokeWidth={0.3} />
            </G>
          )
        })}
      </G>

      {/* Vooruitstekende toppen op profielen (kleine plaatjes bovenop) */}
      <G>
        <Rect x={6}  y={y - 4} width={20} height={4} fill={fill} stroke={stroke} strokeWidth={0.5} />
        <Rect x={W - 26} y={y - 4} width={20} height={4} fill={fill} stroke={stroke} strokeWidth={0.5} />
      </G>

      {/* Onder-labels (de centrale getallen 20, 30, 20, 30) */}
      <G>
        <Text x={20}  y={y + profH + 14} style={{ fontSize: 7, fill: '#555' }}>20</Text>
        <Text x={66}  y={y + profH + 14} style={{ fontSize: 7, fill: '#555' }}>4</Text>
        <Text x={106} y={y + profH + 14} style={{ fontSize: 7, fill: '#555' }}>20</Text>
        <Text x={150} y={y + profH + 14} style={{ fontSize: 7, fill: '#555' }}>15</Text>
        <Text x={194} y={y + profH + 14} style={{ fontSize: 7, fill: '#555' }}>30</Text>
        <Text x={328} y={y + profH + 14} style={{ fontSize: 7, fill: '#555' }}>30</Text>
        <Text x={400} y={y + profH + 14} style={{ fontSize: 7, fill: '#555' }}>20</Text>
      </G>

      {/* Maatlijn-pijltjes onderaan */}
      <G>
        <Line x1={12} y1={H - 6} x2={W - 12} y2={H - 6} strokeWidth={0.4} stroke="#888" />
        <Line x1={12} y1={H - 9} x2={12} y2={H - 3} strokeWidth={0.4} stroke="#888" />
        <Line x1={W - 12} y1={H - 9} x2={W - 12} y2={H - 3} strokeWidth={0.4} stroke="#888" />
      </G>

      {/* Symbol-stickers (kleine plaatjes uiterste links/rechts boven het profiel) */}
      <G>
        <Rect x={6}  y={y - 12} width={4} height={8} fill={fill} stroke={stroke} strokeWidth={0.4} />
        <Rect x={W - 10} y={y - 12} width={4} height={8} fill={fill} stroke={stroke} strokeWidth={0.4} />
      </G>
    </Svg>
  )
}
