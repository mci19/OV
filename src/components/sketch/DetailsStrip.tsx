import type { ReactNode } from 'react'
import type { OrderData } from '../../lib/types'

interface Props {
  order: OrderData
}

/**
 * Strip met technische detail-aanzichten onder de hoofd-tekening.
 * Top view (bovenaanzicht), greep (klinker), scharnier, glaslijst-
 * doorsnede en profiel-doorsnede. Elke detail is een nested SVG met
 * eigen viewBox, dus elk component op zijn eigen schaal.
 */
export function DetailsStrip({ order }: Props) {
  return (
    <div className="border-t border-soft-2 bg-paper/40 backdrop-blur no-print">
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[--color-muted]">
          Detail-aanzichten
        </div>
        <div className="font-mono text-[10px] text-[--color-muted] hidden sm:block">
          schematisch · niet op-schaal
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 px-3 pb-3">
        <DetailCard title="Bovenaanzicht" subtitle={topSystemLabel(order)}>
          <TopView order={order} />
        </DetailCard>
        <DetailCard title="Klinker / Greep" subtitle={handleSubtitle(order)}>
          <HandleDetail order={order} />
        </DetailCard>
        <DetailCard title="Scharnier" subtitle={systemSubtitle(order)}>
          <HingeDetail order={order} />
        </DetailCard>
        <DetailCard title="Glaslijst" subtitle={finishingSubtitle(order)}>
          <GlassListSection order={order} />
        </DetailCard>
        <DetailCard title="Profiel" subtitle="40×20×2 staal">
          <FrameProfile order={order} />
        </DetailCard>
      </div>
    </div>
  )
}

function DetailCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-soft-2 rounded-md overflow-hidden flex flex-col">
      <div className="px-2.5 py-1.5 border-b border-soft-2 flex items-center justify-between gap-2 min-h-[34px]">
        <div className="font-mono text-[11px] font-bold text-[--color-brand] truncate">{title}</div>
        {subtitle ? <div className="font-mono text-[10px] text-[--color-muted] truncate">{subtitle}</div> : null}
      </div>
      <div className="flex-1 min-h-[120px] grid place-items-center p-1">
        {children}
      </div>
    </div>
  )
}

// ─── Labels ──────────────────────────────────────────────

function topSystemLabel(o: OrderData): string {
  if (o.system === 'pivotica') return 'Pivot'
  if (o.system === 'sliding') return 'Schuif'
  return o.hingeKind === 'double' ? 'Dubbel' : 'Enkel'
}
function handleSubtitle(o: OrderData): string {
  if (o.handleKind === 'l_grip') return 'L-grip'
  if (o.handleKind === 'l_vertical') return `L-vert ${o.handleVerticalMm} mm`
  return o.handleOther.trim() || 'Other'
}
function systemSubtitle(o: OrderData): string {
  if (o.system === 'hinges') return o.hingeKind === 'double' ? '6× scharnier' : '3× scharnier'
  if (o.system === 'pivotica') return 'Pivot-as'
  return 'Sliding-rail'
}
function finishingSubtitle(o: OrderData): string {
  if (o.finishing === 'soudal_mastiek') return 'Mastiek'
  return o.finishing === 'glasslist_15' ? '15×15' : '10×10'
}

// ─── Top View (vergroot) ─────────────────────────────────

function TopView({ order }: { order: OrderData }) {
  const hingeOnLeft = order.handlePosition.side === 'right'
  const isDouble = order.hingeKind === 'double' || order.variants.includes('double_door')
  const W = 320
  const H = 140

  // Layout — Door-as op y=70
  const doorY = 70
  const doorH = 14
  const margin = 30
  const doorW = W - margin * 2
  const doorX = margin

  const stroke = '#3A3A35'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ maxHeight: 160 }}>
      {/* Sliding-rail boven */}
      {order.system === 'sliding' ? (
        <g>
          <rect x={doorX - 15} y={doorY - 22} width={doorW + 30} height={6} fill="#EFEDE5" stroke={stroke} strokeWidth={0.8} />
          <text x={doorX + doorW + 18} y={doorY - 17} fontSize={8} fill="#6B6B62">rail</text>
        </g>
      ) : null}

      {/* Deur(en) — schematisch als balk(en) van bovenaf */}
      {isDouble ? (
        <g>
          <DoorBar x={doorX} y={doorY} w={doorW / 2 - 4} h={doorH} />
          <DoorBar x={doorX + doorW / 2 + 4} y={doorY} w={doorW / 2 - 4} h={doorH} />
          <HingeMark cx={doorX + 4} cy={doorY + doorH / 2} />
          <HingeMark cx={doorX + doorW - 4} cy={doorY + doorH / 2} />
          <SwingArc cx={doorX + 4} cy={doorY + doorH / 2} r={doorW / 2 - 12} dir="right" />
          <SwingArc cx={doorX + doorW - 4} cy={doorY + doorH / 2} r={doorW / 2 - 12} dir="left" />
        </g>
      ) : (
        <g>
          <DoorBar x={doorX} y={doorY} w={doorW} h={doorH} />
          {order.system === 'hinges' ? (
            <g>
              {[0.15, 0.5, 0.85].map((t) => (
                <HingeMark
                  key={t}
                  cx={hingeOnLeft ? doorX + 4 : doorX + doorW - 4}
                  cy={doorY + doorH / 2 + (t - 0.5) * doorH * 0.3}
                />
              ))}
              <SwingArc
                cx={hingeOnLeft ? doorX + 4 : doorX + doorW - 4}
                cy={doorY + doorH / 2}
                r={doorW - 14}
                dir={hingeOnLeft ? 'right' : 'left'}
              />
            </g>
          ) : order.system === 'pivotica' ? (
            <g>
              <circle cx={doorX + doorW * (hingeOnLeft ? 0.22 : 0.78)} cy={doorY + doorH / 2} r={5} fill="#FFFFFF" stroke={stroke} strokeWidth={1.2} />
              <circle cx={doorX + doorW * (hingeOnLeft ? 0.22 : 0.78)} cy={doorY + doorH / 2} r={2} fill={stroke} />
              <SwingArc
                cx={doorX + doorW * (hingeOnLeft ? 0.22 : 0.78)}
                cy={doorY + doorH / 2}
                r={doorW * 0.5}
                dir={hingeOnLeft ? 'right' : 'left'}
              />
              <text x={doorX + doorW * (hingeOnLeft ? 0.22 : 0.78)} y={doorY + doorH + 12} fontSize={8} fill="#6B6B62" textAnchor="middle">pivot</text>
            </g>
          ) : (
            <g>
              <text x={doorX + doorW / 2} y={doorY + doorH + 18} fontSize={9} fill="#6B6B62" textAnchor="middle">→ schuift open</text>
              <line x1={doorX + doorW + 6} y1={doorY + doorH / 2} x2={doorX + doorW + 22} y2={doorY + doorH / 2} stroke={stroke} strokeWidth={1.5} markerEnd="url(#arr)" />
              <defs>
                <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill={stroke} />
                </marker>
              </defs>
            </g>
          )}
        </g>
      )}

      {/* Maat: breedte */}
      <line x1={doorX} y1={doorY + doorH + 28} x2={doorX + doorW} y2={doorY + doorH + 28} stroke="#888884" strokeWidth={0.5} />
      <line x1={doorX} y1={doorY + doorH + 23} x2={doorX} y2={doorY + doorH + 33} stroke="#888884" strokeWidth={0.5} />
      <line x1={doorX + doorW} y1={doorY + doorH + 23} x2={doorX + doorW} y2={doorY + doorH + 33} stroke="#888884" strokeWidth={0.5} />
      <text x={doorX + doorW / 2} y={doorY + doorH + 26} fontSize={9} fill="#4A4A45" textAnchor="middle" fontFamily="ui-monospace, monospace">
        {order.breedte} mm
      </text>

      {/* Label van scharnier-zijde */}
      <text x={W / 2} y={18} fontSize={10} fill="#1F4F4D" textAnchor="middle" fontFamily="ui-monospace, monospace" fontWeight={600}>
        {order.hingeKind === 'single'
          ? (order.hingeSide === 'belgisch_links' ? 'Belgisch Links · DIN R' : 'Belgisch Rechts · DIN L')
          : 'Dubbele deur'}
      </text>
    </svg>
  )
}

function DoorBar({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <rect x={x} y={y} width={w} height={h} fill="#5A5A55" stroke="#3A3A35" strokeWidth={0.8} />
}

function HingeMark({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={3} fill="#FFFFFF" stroke="#3A3A35" strokeWidth={0.8} />
      <circle cx={cx} cy={cy} r={1.2} fill="#3A3A35" />
    </g>
  )
}

function SwingArc({ cx, cy, r, dir }: { cx: number; cy: number; r: number; dir: 'left' | 'right' }) {
  const start = dir === 'right' ? { x: cx + r, y: cy } : { x: cx - r, y: cy }
  const end   = { x: cx, y: cy - r }
  const sweep = dir === 'right' ? 0 : 1
  return (
    <g>
      <path
        d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 ${sweep} ${end.x} ${end.y}`}
        fill="none"
        stroke="#3A3A35"
        strokeWidth={0.7}
        strokeDasharray="3 2"
        opacity={0.6}
      />
      <line x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#3A3A35" strokeWidth={0.6} strokeDasharray="2 2" opacity={0.5} />
    </g>
  )
}

// ─── Handle detail (klinker close-up) ────────────────────

function HandleDetail({ order }: { order: OrderData }) {
  const W = 200
  const H = 160
  const side: 'left' | 'right' = order.handlePosition.side
  // Schematische zij-aanzicht: deurblad als verticale strook, greep steekt uit
  const doorX = W / 2 - 8
  const doorW = 16
  const doorY = 8
  const doorH = H - 16
  const stroke = '#3A3A35'
  // Greep-positie: gespiegeld zodat lager getal = lager op de deur
  // Gebruik 1000mm als referentie voor de detail: alleen voor visualisatie
  const handleYRel = 0.45 // visueel iets onder midden — exact mm staat ernaast
  const handleY = doorY + doorH * handleYRel

  const handleSide: 'left' | 'right' = side
  const handleX = handleSide === 'left' ? doorX : doorX + doorW

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ maxHeight: 180 }}>
      {/* Deurblad zij-aanzicht */}
      <rect x={doorX} y={doorY} width={doorW} height={doorH} fill="#5A5A55" stroke={stroke} strokeWidth={0.8} />
      <text x={doorX + doorW / 2} y={doorY - 2} fontSize={7} fill="#6B6B62" textAnchor="middle">deur</text>

      {/* Slot-cilinder boven greep */}
      {order.lockKind !== 'no_cilinder' ? (
        <g>
          <line
            x1={handleSide === 'left' ? handleX - 10 : handleX + 10}
            y1={handleY - 24}
            x2={handleSide === 'left' ? handleX : handleX}
            y2={handleY - 24}
            stroke={stroke}
            strokeWidth={1}
          />
          <circle cx={handleSide === 'left' ? handleX - 14 : handleX + 14} cy={handleY - 24} r={5} fill="#FFFFFF" stroke={stroke} strokeWidth={1} />
          <circle cx={handleSide === 'left' ? handleX - 14 : handleX + 14} cy={handleY - 25} r={1.3} fill={stroke} />
          <rect x={(handleSide === 'left' ? handleX - 14 : handleX + 14) - 0.5} y={handleY - 24.5} width={1} height={3} fill={stroke} />
          <text x={handleSide === 'left' ? handleX - 14 : handleX + 14} y={handleY - 32} fontSize={7} fill="#6B6B62" textAnchor="middle">
            {order.lockKind === 'cilinder_litto' ? 'Litto 30/30' : 'cilinder'}
          </text>
        </g>
      ) : null}

      {/* Greep — verschillende vormen */}
      {order.handleKind === 'l_vertical' && order.handleVerticalMm > 100 ? (
        <g>
          <rect
            x={handleSide === 'left' ? handleX - 22 : handleX + 4}
            y={handleY - 35}
            width={18}
            height={70}
            fill="#FFFFFF"
            stroke={stroke}
            strokeWidth={1}
            rx={3}
          />
          <text x={handleSide === 'left' ? handleX - 13 : handleX + 13} y={handleY + 50} fontSize={7} fill="#6B6B62" textAnchor="middle">
            L-vertical {order.handleVerticalMm}mm
          </text>
        </g>
      ) : (
        <g>
          {/* horizontaal uitstekende klinker */}
          <line
            x1={handleX}
            y1={handleY}
            x2={handleSide === 'left' ? handleX - 38 : handleX + 38}
            y2={handleY}
            stroke={stroke}
            strokeWidth={3}
            strokeLinecap="round"
          />
          {/* Rozet (rosette) op de deur */}
          <circle cx={handleX} cy={handleY} r={6} fill="#FFFFFF" stroke={stroke} strokeWidth={1} />
          {/* L-grip extra haak naar onder */}
          {order.handleKind === 'l_grip' ? (
            <line
              x1={handleSide === 'left' ? handleX - 38 : handleX + 38}
              y1={handleY}
              x2={handleSide === 'left' ? handleX - 38 : handleX + 38}
              y2={handleY + 14}
              stroke={stroke}
              strokeWidth={3}
              strokeLinecap="round"
            />
          ) : null}
          <text x={handleSide === 'left' ? handleX - 22 : handleX + 22} y={handleY + 28} fontSize={7} fill="#6B6B62" textAnchor="middle">
            {order.handleKind === 'l_grip' ? 'L-grip' : (order.handleOther.trim() || 'klinker')}
          </text>
        </g>
      )}

      {/* Maat-callout voor greep-hoogte */}
      <g>
        <line x1={6} y1={doorY + doorH} x2={6} y2={handleY} stroke="#888884" strokeWidth={0.5} markerEnd="url(#tickU)" markerStart="url(#tickD)" />
        <text
          x={10} y={(doorY + doorH + handleY) / 2 + 3}
          fontSize={8} fill="#4A4A45" fontFamily="ui-monospace, monospace"
        >
          {order.handlePosition.heightFromBottom} mm
        </text>
        <defs>
          <marker id="tickU" markerWidth="4" markerHeight="4" refX="2" refY="3"><line x1="0" y1="3" x2="4" y2="3" stroke="#888884" strokeWidth="0.5" /></marker>
          <marker id="tickD" markerWidth="4" markerHeight="4" refX="2" refY="1"><line x1="0" y1="1" x2="4" y2="1" stroke="#888884" strokeWidth="0.5" /></marker>
        </defs>
      </g>
    </svg>
  )
}

// ─── Hinge / pivot / sliding detail ──────────────────────

function HingeDetail({ order }: { order: OrderData }) {
  const W = 200
  const H = 160
  const stroke = '#3A3A35'

  if (order.system === 'pivotica') {
    // Pivot-as: cross-section met as die door deur loopt
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ maxHeight: 180 }}>
        <text x={W / 2} y={14} fontSize={9} fill="#1F4F4D" textAnchor="middle" fontFamily="ui-monospace, monospace" fontWeight={600}>Pivot-as (top)</text>
        {/* Plafond + vloer */}
        <line x1={20} y1={30} x2={W - 20} y2={30} stroke="#888884" strokeWidth={0.6} />
        <line x1={20} y1={H - 20} x2={W - 20} y2={H - 20} stroke="#888884" strokeWidth={0.6} />
        <text x={W - 16} y={34} fontSize={7} fill="#888884">plafond</text>
        <text x={W - 16} y={H - 24} fontSize={7} fill="#888884">vloer</text>
        {/* Deur (vooraanzicht) */}
        <rect x={W / 2 - 22} y={32} width={44} height={H - 54} fill="#E5E2D8" stroke={stroke} strokeWidth={0.8} />
        {/* Pivot-as door midden */}
        <line x1={W / 2} y1={28} x2={W / 2} y2={H - 18} stroke="#E85D04" strokeWidth={1.5} strokeDasharray="3 2" />
        {/* Pivot-elementen boven + onder */}
        <circle cx={W / 2} cy={32} r={5} fill="#FFFFFF" stroke={stroke} strokeWidth={1} />
        <circle cx={W / 2} cy={32} r={1.6} fill="#E85D04" />
        <circle cx={W / 2} cy={H - 22} r={5} fill="#FFFFFF" stroke={stroke} strokeWidth={1} />
        <circle cx={W / 2} cy={H - 22} r={1.6} fill="#E85D04" />
        <text x={W / 2 + 12} y={36} fontSize={7} fill="#6B6B62">pivot top</text>
        <text x={W / 2 + 12} y={H - 18} fontSize={7} fill="#6B6B62">pivot bottom</text>
      </svg>
    )
  }

  if (order.system === 'sliding') {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ maxHeight: 180 }}>
        <text x={W / 2} y={14} fontSize={9} fill="#1F4F4D" textAnchor="middle" fontFamily="ui-monospace, monospace" fontWeight={600}>Sliding-rail</text>
        {/* Rail */}
        <rect x={16} y={42} width={W - 32} height={10} fill="#EFEDE5" stroke={stroke} strokeWidth={0.8} />
        <text x={W - 18} y={40} fontSize={7} fill="#888884" textAnchor="end">aluminium rail</text>
        {/* Hangers */}
        {[40, W - 60].map((x, i) => (
          <g key={i}>
            <line x1={x + 10} y1={52} x2={x + 10} y2={70} stroke={stroke} strokeWidth={1.5} />
            <circle cx={x + 10} cy={45} r={4} fill="#FFFFFF" stroke={stroke} strokeWidth={1} />
            <circle cx={x + 10} cy={45} r={1.4} fill={stroke} />
          </g>
        ))}
        {/* Deur */}
        <rect x={40} y={70} width={W - 80} height={H - 90} fill="#5A5A55" stroke={stroke} strokeWidth={0.8} />
        {/* Pijl van beweging */}
        <line x1={W / 2 - 30} y1={H - 12} x2={W / 2 + 30} y2={H - 12} stroke="#E85D04" strokeWidth={1.2} markerEnd="url(#slArrEnd)" markerStart="url(#slArrStart)" />
        <defs>
          <marker id="slArrEnd" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#E85D04" /></marker>
          <marker id="slArrStart" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto-start-reverse"><path d="M0,0 L6,3 L0,6 Z" fill="#E85D04" /></marker>
        </defs>
      </svg>
    )
  }

  // Hinges (default)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ maxHeight: 180 }}>
      <text x={W / 2} y={14} fontSize={9} fill="#1F4F4D" textAnchor="middle" fontFamily="ui-monospace, monospace" fontWeight={600}>Scharnier (vooraanzicht)</text>
      {/* Frame plaat */}
      <rect x={36} y={32} width={28} height={94} fill="#E5E2D8" stroke="#3A3A35" strokeWidth={0.8} />
      <text x={50} y={H - 4} fontSize={7} fill="#6B6B62" textAnchor="middle">kozijn</text>
      {/* Door plaat */}
      <rect x={W - 64} y={32} width={28} height={94} fill="#E5E2D8" stroke="#3A3A35" strokeWidth={0.8} />
      <text x={W - 50} y={H - 4} fontSize={7} fill="#6B6B62" textAnchor="middle">deur</text>
      {/* Scharnier-segmenten (3 cilinders rond een verticale pin) */}
      <line x1={W / 2} y1={26} x2={W / 2} y2={132} stroke="#E85D04" strokeWidth={1.4} strokeDasharray="3 2" />
      {[36, 70, 104].map((y) => (
        <g key={y}>
          <ellipse cx={W / 2} cy={y} rx={11} ry={4} fill="#FFFFFF" stroke="#3A3A35" strokeWidth={0.9} />
          <rect x={W / 2 - 11} y={y} width={22} height={22} fill="#FFFFFF" stroke="#3A3A35" strokeWidth={0.9} />
          <ellipse cx={W / 2} cy={y + 22} rx={11} ry={4} fill="#FFFFFF" stroke="#3A3A35" strokeWidth={0.9} />
        </g>
      ))}
      <text x={W - 10} y={20} fontSize={7} fill="#888884" textAnchor="end">{order.hingeKind === 'double' ? '6× per deur' : '3× per deur'}</text>
    </svg>
  )
}

// ─── Glaslijst doorsnede ─────────────────────────────────

function GlassListSection({ order }: { order: OrderData }) {
  const W = 200
  const H = 160
  const stroke = '#3A3A35'
  // Cross-section van de glas-edge: deurblad-rand + glaslijst aan beide kanten
  const cx = W / 2
  const glassW = 6 // glasdikte
  const listSize = order.finishing === 'glasslist_15' ? 24 : 16
  const listColor = '#5A5A55'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ maxHeight: 180 }}>
      <text x={W / 2} y={14} fontSize={9} fill="#1F4F4D" textAnchor="middle" fontFamily="ui-monospace, monospace" fontWeight={600}>Glaslijst doorsnede</text>
      <text x={W / 2} y={26} fontSize={7} fill="#6B6B62" textAnchor="middle">horizontale snede door glaspaneel</text>

      {/* Glas in midden */}
      <rect x={cx - glassW / 2} y={40} width={glassW} height={H - 60} fill="#DCE7EE" stroke={stroke} strokeWidth={0.7} />
      <line x1={cx} y1={40} x2={cx} y2={H - 20} stroke="#9BB3C8" strokeWidth={0.3} strokeDasharray="2 2" />

      {/* Glaslijst links + rechts */}
      {order.finishing !== 'soudal_mastiek' ? (
        <g>
          <rect x={cx - glassW / 2 - listSize} y={40} width={listSize} height={H - 60} fill={listColor} stroke={stroke} strokeWidth={0.7} />
          <rect x={cx + glassW / 2} y={40} width={listSize} height={H - 60} fill={listColor} stroke={stroke} strokeWidth={0.7} />
        </g>
      ) : (
        <g>
          {/* Mastiek aan beide kanten */}
          <rect x={cx - glassW / 2 - 6} y={40} width={6} height={H - 60} fill="#C8C2B0" stroke={stroke} strokeWidth={0.7} />
          <rect x={cx + glassW / 2} y={40} width={6} height={H - 60} fill="#C8C2B0" stroke={stroke} strokeWidth={0.7} />
          <text x={cx - 18} y={H - 8} fontSize={7} fill="#6B6B62" textAnchor="end">mastiek</text>
        </g>
      )}

      {/* Frame-rand links + rechts (deurblad-profielen) */}
      {order.finishing !== 'soudal_mastiek' ? (
        <g>
          <rect x={6} y={40} width={cx - glassW / 2 - listSize - 6} height={H - 60} fill="#1A1A1A" opacity={0.7} stroke={stroke} strokeWidth={0.5} />
          <rect x={cx + glassW / 2 + listSize} y={40} width={W - (cx + glassW / 2 + listSize) - 6} height={H - 60} fill="#1A1A1A" opacity={0.7} stroke={stroke} strokeWidth={0.5} />
        </g>
      ) : null}

      {/* Maatlabel */}
      <text x={cx - glassW / 2 - listSize / 2} y={H - 8} fontSize={7} fill="#4A4A45" textAnchor="middle" fontFamily="ui-monospace, monospace">
        {order.finishing === 'glasslist_15' ? '15×15' : order.finishing === 'soudal_mastiek' ? '–' : '10×10'}
      </text>
      <text x={cx} y={H - 8} fontSize={7} fill="#4A4A45" textAnchor="middle" fontFamily="ui-monospace, monospace">glas</text>
      <text x={cx + glassW / 2 + listSize / 2} y={H - 8} fontSize={7} fill="#4A4A45" textAnchor="middle" fontFamily="ui-monospace, monospace">
        {order.finishing === 'glasslist_15' ? '15×15' : order.finishing === 'soudal_mastiek' ? '–' : '10×10'}
      </text>
    </svg>
  )
}

// ─── Frame profile cross-section ─────────────────────────

function FrameProfile({ order }: { order: OrderData }) {
  const W = 200
  const H = 160
  const cx = W / 2
  const cy = 80
  const profW = 80   // schaal: ~2 px per mm (40 mm → 80 px)
  const profH = 40   // 20 mm hoog → 40 px
  const wall = 4     // 2 mm wand → 4 px
  // Frame-kleur uit kolomvoorkeur
  const fill = order.colorKind === 'ral_9005' ? '#1A1A1A'
    : order.colorKind === 'ral_9010' ? '#F8F7F2' : '#6B6B62'
  const stroke = '#3A3A35'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ maxHeight: 180 }}>
      <text x={W / 2} y={14} fontSize={9} fill="#1F4F4D" textAnchor="middle" fontFamily="ui-monospace, monospace" fontWeight={600}>Profiel 40×20×2</text>
      <text x={W / 2} y={26} fontSize={7} fill="#6B6B62" textAnchor="middle">staal kokerprofiel</text>

      {/* Buitenrand */}
      <rect x={cx - profW / 2} y={cy - profH / 2} width={profW} height={profH} fill={fill} stroke={stroke} strokeWidth={1} />
      {/* Holle binnenkant */}
      <rect x={cx - profW / 2 + wall} y={cy - profH / 2 + wall} width={profW - wall * 2} height={profH - wall * 2} fill="#FAF8F3" stroke={stroke} strokeWidth={0.6} />

      {/* Maatlijnen */}
      <g stroke="#888884" strokeWidth={0.5} fill="none">
        {/* breedte */}
        <line x1={cx - profW / 2} y1={cy + profH / 2 + 10} x2={cx + profW / 2} y2={cy + profH / 2 + 10} />
        <line x1={cx - profW / 2} y1={cy + profH / 2 + 7} x2={cx - profW / 2} y2={cy + profH / 2 + 13} />
        <line x1={cx + profW / 2} y1={cy + profH / 2 + 7} x2={cx + profW / 2} y2={cy + profH / 2 + 13} />
        {/* hoogte */}
        <line x1={cx + profW / 2 + 10} y1={cy - profH / 2} x2={cx + profW / 2 + 10} y2={cy + profH / 2} />
        <line x1={cx + profW / 2 + 7} y1={cy - profH / 2} x2={cx + profW / 2 + 13} y2={cy - profH / 2} />
        <line x1={cx + profW / 2 + 7} y1={cy + profH / 2} x2={cx + profW / 2 + 13} y2={cy + profH / 2} />
      </g>
      <text x={cx} y={cy + profH / 2 + 24} fontSize={8} fill="#4A4A45" textAnchor="middle" fontFamily="ui-monospace, monospace">40 mm</text>
      <text x={cx + profW / 2 + 22} y={cy + 3} fontSize={8} fill="#4A4A45" fontFamily="ui-monospace, monospace">20</text>
      <text x={cx - profW / 2 - 18} y={cy + 3} fontSize={7} fill="#888884" fontFamily="ui-monospace, monospace">2 mm</text>
      <line x1={cx - profW / 2 + 1} y1={cy - profH / 2 + 1} x2={cx - profW / 2 - 12} y2={cy} stroke="#888884" strokeWidth={0.5} />
    </svg>
  )
}
