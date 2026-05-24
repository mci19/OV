import { useMemo } from 'react'
import { generateDrawing } from '../lib/drawingGenerator'
import { computeGeometry, glassLabel, ralLabel } from '../lib/calculations'
import type { DoorConfig } from '../lib/types'

interface Props {
  config: DoorConfig
}

function orderNumber(config: DoorConfig): string {
  const d = config.datum.replace(/-/g, '')
  // deterministic-ish from referentie
  let h = 0
  for (let i = 0; i < config.referentie.length; i++) h = (h * 31 + config.referentie.charCodeAt(i)) | 0
  const suffix = String(Math.abs(h) % 1000).padStart(3, '0')
  return `${d}-${suffix}`
}

const COMPANY = {
  name: 'MY DOORS',
  address: 'Lindemstraat 200 unit C4', // TODO: postcode + plaats verifiëren bij klant
  city: '8870 Zwijnaarde',
  btw: 'BE0000.000.000', // TODO: BTW nummer aanvullen
}

const ITEMS_TEMPLATE = [
  'Staal frame 40×20×2',
  'Glaslijsten 15×15×1.5',
  'Glas',
  'Greep / long handle',
  'Slot / cilinder',
  'Afwerking poederlak',
  'Montage',
]

export function QuoteSheet({ config }: Props) {
  const geo = useMemo(() => computeGeometry(config), [config])
  const thumbSvg = useMemo(
    () => generateDrawing(config, { showDimensions: false, showHandle: false, showTitleBlock: false }),
    [config],
  )

  return (
    <div className="bg-white text-black border border-black/20 p-10 print-target quote-page">
      <header className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        <div>
          <div className="font-mono text-2xl tracking-widest font-bold">{COMPANY.name}</div>
          <div className="font-mono text-xs mt-1">{COMPANY.address}</div>
          <div className="font-mono text-xs">{COMPANY.city}</div>
        </div>
        <div className="text-right font-mono text-xs">
          <div className="uppercase tracking-wider mb-1">Orderbon / Offerte</div>
          <div>Nr.: {orderNumber(config)}</div>
          <div>Datum: {config.datum}</div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-6 mb-6 font-mono text-xs">
        <div>
          <div className="uppercase tracking-wider text-zinc-500 mb-1">Klant</div>
          <div className="text-sm">{config.referentie}</div>
        </div>
        <div>
          <div className="uppercase tracking-wider text-zinc-500 mb-1">Type</div>
          <div className="text-sm">{config.doorType === 'door_opening' ? 'Door opening' : 'Production'}</div>
        </div>
      </section>

      <section className="grid grid-cols-[2fr_1fr] gap-6 mb-6">
        <div>
          <h3 className="font-mono text-xs uppercase tracking-wider border-b border-black pb-1 mb-2">
            Configuratie
          </h3>
          <dl className="grid grid-cols-2 gap-y-1 gap-x-4 font-mono text-xs">
            <Dt label="Afmetingen" v={`${config.breedte} × ${config.hoogte} mm`} />
            <Dt label="Glas" v={`${glassLabel(config)} (${geo.glassWidth}×${geo.glassHeight})`} />
            <Dt label="Kleur" v={ralLabel(config)} />
            <Dt label="Scharnier" v={hingeLabel(config)} />
            <Dt label="Systeem" v={systemLabel(config)} />
            <Dt label="Variant" v={config.variants.join(', ') || '—'} />
            <Dt label="Soft open" v={config.softOpen ? 'ja' : 'nee'} />
            <Dt label="Soft close" v={config.softClose ? 'ja' : 'nee'} />
            <Dt label="Finishing" v={finishingLabel(config)} />
            <Dt label="Greep" v={handleLabel(config)} />
            <Dt label="Slot" v={lockLabel(config)} />
            {config.designEnabled ? (
              <>
                <Dt label="Vert. lijn vanaf links" v={`${config.verticaleLijnVanafLinks} mm`} />
                <Dt label="Dwarslat vanaf onder" v={`${config.horizontaleDwarslatVanafOnder} mm`} />
              </>
            ) : (
              <Dt label="Design-verdeling" v="geen" />
            )}
          </dl>
        </div>
        <div className="border border-black/20 p-2 self-start">
          <div
            className="aspect-[3/5] w-full"
            dangerouslySetInnerHTML={{ __html: thumbSvg }}
          />
        </div>
      </section>

      <section className="mb-6">
        <h3 className="font-mono text-xs uppercase tracking-wider border-b border-black pb-1 mb-2">
          Prijsraming
        </h3>
        <table className="w-full font-mono text-xs border-collapse">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left py-2">Omschrijving</th>
              <th className="text-right py-2 w-16">Aantal</th>
              <th className="text-right py-2 w-28">Eenheidsprijs</th>
              <th className="text-right py-2 w-24">Totaal</th>
            </tr>
          </thead>
          <tbody>
            {ITEMS_TEMPLATE.map((descr) => (
              <tr key={descr} className="border-b border-black/10">
                <td className="py-2">{descr}</td>
                <td className="text-right py-2">1</td>
                <td className="text-right py-2">€&nbsp;____,__</td>
                <td className="text-right py-2">€&nbsp;____,__</td>
              </tr>
            ))}
            <tr className="border-b border-black/10">
              <td className="py-2 italic text-zinc-500">—</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td className="py-2 text-right" colSpan={3}>Subtotaal</td>
              <td className="text-right py-2">€&nbsp;____,__</td>
            </tr>
            <tr>
              <td className="py-2 text-right" colSpan={3}>BTW 21%</td>
              <td className="text-right py-2">€&nbsp;____,__</td>
            </tr>
            <tr className="border-t border-black font-bold">
              <td className="py-2 text-right" colSpan={3}>Totaal</td>
              <td className="text-right py-2">€&nbsp;____,__</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="grid grid-cols-2 gap-12 mt-12 font-mono text-xs">
        <div>
          <div className="border-t border-black pt-2">Handtekening klant</div>
        </div>
        <div>
          <div className="border-t border-black pt-2">Handtekening {COMPANY.name}</div>
        </div>
      </section>
    </div>
  )
}

function Dt({ label, v }: { label: string; v: string }) {
  return (
    <>
      <dt className="text-zinc-500 uppercase tracking-wider text-[10px]">{label}</dt>
      <dd>{v}</dd>
    </>
  )
}

function hingeLabel(c: DoorConfig): string {
  if (c.hingeKind === 'single') {
    return c.hingeSide === 'belgisch_links' ? 'Single — Belgisch Links' : 'Single — Belgisch Rechts'
  }
  return `Double — ${c.hingeSide.replace('double_', 'optie ')}`
}

function systemLabel(c: DoorConfig): string {
  return { hinges: 'Hinges', pivotica: 'Pivotica', sliding: 'Sliding' }[c.system]
}

function finishingLabel(c: DoorConfig): string {
  return {
    glasslist_10: 'Glasslist 10×10',
    glasslist_15: 'Glasslist 15×15',
    soudal_mastiek: 'Soudal Mastiek',
  }[c.finishing]
}

function handleLabel(c: DoorConfig): string {
  if (c.handleKind === 'l_grip') return 'L-grip'
  if (c.handleKind === 'l_vertical') return `L-vertical ${c.handleVerticalMm}mm`
  return c.handleOther.trim() || 'Other'
}

function lockLabel(c: DoorConfig): string {
  if (c.lockKind === 'cilinder_litto') return 'Cilinder Litto 30/30'
  if (c.lockKind === 'no_cilinder') return 'Geen cilinder'
  return c.lockOther.trim() || 'Other'
}
