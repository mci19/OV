import type { OrderData, ValidationIssue } from '../lib/types'
import { Chips, Field, FieldRow, MultiChips } from './Field'

interface Props {
  order: OrderData
  set: <K extends keyof OrderData>(k: K, v: OrderData[K]) => void
  issues: ValidationIssue[]
}

function errorFor(issues: ValidationIssue[], field: string): string | null {
  const it = issues.find((i) => i.field === field)
  return it ? it.message : null
}

export function OrderForm({ order, set, issues }: Props) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="section-h">Dimensies</h2>
        <Chips
          label="Type meting"
          value={order.doorType}
          options={[
            { value: 'door_opening', label: 'Door opening' },
            { value: 'production', label: 'Production' },
          ]}
          onChange={(v) => set('doorType', v)}
        />
        <div className="mt-3">
          <FieldRow>
            <Field
              label="Hoogte"
              unit="mm"
              type="number"
              value={order.hoogte}
              min={1800}
              max={3500}
              onChange={(e) => set('hoogte', Number(e.target.value))}
              error={errorFor(issues, 'hoogte')}
            />
            <Field
              label="Breedte"
              unit="mm"
              type="number"
              value={order.breedte}
              min={600}
              max={1500}
              onChange={(e) => set('breedte', Number(e.target.value))}
              error={errorFor(issues, 'breedte')}
            />
          </FieldRow>
        </div>
        <div className="mt-3">
          <Field
            label="Aantal deuren"
            type="number"
            value={order.aantalDeuren}
            min={1}
            max={20}
            onChange={(e) => set('aantalDeuren', Number(e.target.value))}
            error={errorFor(issues, 'aantalDeuren')}
          />
        </div>
      </section>

      <section>
        <h2 className="section-h">Top view — scharnier</h2>
        <Chips
          label="Type"
          value={order.hingeKind}
          options={[
            { value: 'single', label: 'Single' },
            { value: 'double', label: 'Double' },
          ]}
          onChange={(v) => set('hingeKind', v)}
        />
        <div className="mt-3">
          {order.hingeKind === 'single' ? (
            <Chips
              label="Zijde"
              value={order.hingeSide}
              options={[
                { value: 'belgisch_links', label: 'Belgisch Links (DIN R)' },
                { value: 'belgisch_rechts', label: 'Belgisch Rechts (DIN L)' },
              ]}
              onChange={(v) => set('hingeSide', v)}
            />
          ) : (
            <Chips
              label="Optie"
              value={order.hingeSide}
              options={[
                { value: 'double_1', label: 'Optie 1' },
                { value: 'double_2', label: 'Optie 2' },
                { value: 'double_3', label: 'Optie 3' },
                { value: 'double_4', label: 'Optie 4' },
              ]}
              onChange={(v) => set('hingeSide', v)}
            />
          )}
        </div>
      </section>

      <section>
        <h2 className="section-h">Glas</h2>
        <Chips
          label="Type glas"
          value={order.glassType}
          options={[
            { value: 'clear', label: 'Helder' },
            { value: 'matt', label: 'Mat' },
            { value: 'cathedraal_flute', label: 'Cathedraal-Flute' },
            { value: 'other', label: 'Other' },
          ]}
          onChange={(v) => set('glassType', v)}
        />
        {order.glassType === 'other' ? (
          <div className="mt-3">
            <Field
              label="Andere glassoort"
              value={order.glassOther}
              onChange={(e) => set('glassOther', e.target.value)}
            />
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="section-h">Systeem</h2>
        <Chips
          label="Systeem"
          value={order.system}
          options={[
            { value: 'hinges', label: 'Hinges' },
            { value: 'pivotica', label: 'Pivotica' },
            { value: 'sliding', label: 'Sliding' },
          ]}
          onChange={(v) => set('system', v)}
        />
        <div className="mt-3">
          <MultiChips
            label="Variant"
            values={order.variants}
            options={[
              { value: 'panel_door', label: 'Panel + Door' },
              { value: 'double_door', label: 'Double Door' },
              { value: 'fritsjurgens_3', label: 'Fritsjurgens 3' },
            ]}
            onChange={(v) => set('variants', v)}
          />
        </div>
        <div className="mt-3 flex gap-6 font-mono text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={order.softOpen}
              onChange={(e) => set('softOpen', e.target.checked)}
            />
            Soft open
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={order.softClose}
              onChange={(e) => set('softClose', e.target.checked)}
            />
            Soft close
          </label>
        </div>
      </section>

      <section>
        <h2 className="section-h">Finishing</h2>
        <Chips
          label="Afwerking"
          value={order.finishing}
          options={[
            { value: 'glasslist_10', label: 'Glasslist 10×10' },
            { value: 'glasslist_15', label: 'Glasslist 15×15' },
            { value: 'soudal_mastiek', label: 'Soudal Mastiek' },
          ]}
          onChange={(v) => set('finishing', v)}
        />
      </section>

      <section>
        <h2 className="section-h">Greep</h2>
        <Chips
          label="Type"
          value={order.handleKind}
          options={[
            { value: 'l_grip', label: 'L-grip' },
            { value: 'l_vertical', label: 'L-vertical' },
            { value: 'other', label: 'Other' },
          ]}
          onChange={(v) => set('handleKind', v)}
        />
        {order.handleKind === 'l_vertical' ? (
          <div className="mt-3">
            <Field
              label="Lengte L-vertical"
              unit="mm"
              type="number"
              value={order.handleVerticalMm}
              onChange={(e) => set('handleVerticalMm', Number(e.target.value))}
            />
          </div>
        ) : null}
        {order.handleKind === 'other' ? (
          <div className="mt-3">
            <Field
              label="Andere greep"
              value={order.handleOther}
              onChange={(e) => set('handleOther', e.target.value)}
              hint="bv. long handle 700mm"
            />
          </div>
        ) : null}
        <div className="mt-3">
          <FieldRow>
            <Chips
              label="Greep zijde"
              value={order.handlePosition.side}
              options={[
                { value: 'left', label: 'Links' },
                { value: 'right', label: 'Rechts' },
              ]}
              onChange={(side) =>
                set('handlePosition', { ...order.handlePosition, side })
              }
            />
            <Field
              label="Greep-hoogte vanaf onder"
              unit="mm"
              type="number"
              value={order.handlePosition.heightFromBottom}
              onChange={(e) =>
                set('handlePosition', {
                  ...order.handlePosition,
                  heightFromBottom: Number(e.target.value),
                })
              }
              hint="ergonomisch 1050"
            />
          </FieldRow>
        </div>
      </section>

      <section>
        <h2 className="section-h">Slot</h2>
        <Chips
          label="Lock case"
          value={order.lockKind}
          options={[
            { value: 'cilinder_litto', label: 'Cilinder (Litto 30/30)' },
            { value: 'no_cilinder', label: 'No cilinder' },
            { value: 'other', label: 'Other' },
          ]}
          onChange={(v) => set('lockKind', v)}
        />
        {order.lockKind === 'other' ? (
          <div className="mt-3">
            <Field
              label="Slot — vrij veld"
              value={order.lockOther}
              onChange={(e) => set('lockOther', e.target.value)}
            />
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="section-h">Kleur</h2>
        <Chips
          label="RAL"
          value={order.colorKind}
          options={[
            { value: 'ral_9005', label: 'Zwart RAL 9005' },
            { value: 'ral_9010', label: 'Wit RAL 9010' },
            { value: 'other', label: 'Other' },
          ]}
          onChange={(v) => set('colorKind', v)}
        />
        {order.colorKind === 'other' ? (
          <div className="mt-3">
            <Field
              label="RAL-code"
              value={order.colorOther}
              onChange={(e) => set('colorOther', e.target.value)}
              hint="bv. RAL 7016"
            />
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="section-h">Extra</h2>
        <label className="flex items-center gap-2 font-mono text-sm mb-3">
          <input
            type="checkbox"
            checked={order.plaatsingInbegrepen}
            onChange={(e) => set('plaatsingInbegrepen', e.target.checked)}
          />
          Plaatsing inbegrepen
        </label>
        <label className="block">
          <span className="field-label">Opmerkingen voor fabrikant</span>
          <textarea
            className="field-input min-h-[80px]"
            rows={3}
            value={order.opmerkingen}
            onChange={(e) => set('opmerkingen', e.target.value)}
            placeholder="bv. levering vóór 15/06, extra montagestrip nodig"
          />
        </label>
      </section>
    </div>
  )
}
