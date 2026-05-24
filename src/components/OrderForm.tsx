import type { DoorConfig, ValidationIssue } from '../lib/types'
import { Chips, Field, FieldRow, MultiChips } from './Field'

interface Props {
  config: DoorConfig
  set: <K extends keyof DoorConfig>(k: K, v: DoorConfig[K]) => void
  issues: ValidationIssue[]
}

function errorFor(issues: ValidationIssue[], field: string): string | null {
  return issues.find((i) => i.field === field)?.message ?? null
}

export function OrderForm({ config, set, issues }: Props) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="section-h">Referentie</h2>
        <FieldRow>
          <Field
            label="Klant / referentie"
            value={config.referentie}
            onChange={(e) => set('referentie', e.target.value)}
          />
          <Field
            label="Datum"
            type="date"
            value={config.datum}
            onChange={(e) => set('datum', e.target.value)}
          />
        </FieldRow>
        <div className="mt-4">
          <Chips
            label="Type"
            value={config.doorType}
            options={[
              { value: 'door_opening', label: 'Door opening' },
              { value: 'production', label: 'Production' },
            ]}
            onChange={(v) => set('doorType', v)}
          />
        </div>
      </section>

      <section>
        <h2 className="section-h">Dimensies</h2>
        <FieldRow>
          <Field
            label="Hoogte"
            unit="mm"
            type="number"
            value={config.hoogte}
            min={1800}
            max={3500}
            onChange={(e) => set('hoogte', Number(e.target.value))}
            error={errorFor(issues, 'hoogte')}
          />
          <Field
            label="Breedte"
            unit="mm"
            type="number"
            value={config.breedte}
            min={600}
            max={1500}
            onChange={(e) => set('breedte', Number(e.target.value))}
            error={errorFor(issues, 'breedte')}
          />
        </FieldRow>
      </section>

      <section>
        <h2 className="section-h">Top view — scharnier</h2>
        <Chips
          label="Type"
          value={config.hingeKind}
          options={[
            { value: 'single', label: 'Single' },
            { value: 'double', label: 'Double' },
          ]}
          onChange={(v) => set('hingeKind', v)}
        />
        <div className="mt-4">
          {config.hingeKind === 'single' ? (
            <Chips
              label="Scharnierzijde"
              value={config.hingeSide}
              options={[
                { value: 'belgisch_links', label: 'Belgisch Links (DIN R)' },
                { value: 'belgisch_rechts', label: 'Belgisch Rechts (DIN L)' },
              ]}
              onChange={(v) => set('hingeSide', v)}
            />
          ) : (
            <Chips
              label="Double — optie"
              value={config.hingeSide}
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
          label="Glass type"
          value={config.glassType}
          options={[
            { value: 'clear', label: 'Clear' },
            { value: 'matt', label: 'Matt' },
            { value: 'cathedraal_flute', label: 'Cathedraal-Flute' },
            { value: 'other', label: 'Other' },
          ]}
          onChange={(v) => set('glassType', v)}
        />
        {config.glassType === 'other' ? (
          <div className="mt-3">
            <Field
              label="Andere glassoort"
              value={config.glassOther}
              onChange={(e) => set('glassOther', e.target.value)}
            />
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="section-h">Systeem</h2>
        <Chips
          label="Systeem"
          value={config.system}
          options={[
            { value: 'hinges', label: 'Hinges' },
            { value: 'pivotica', label: 'Pivotica' },
            { value: 'sliding', label: 'Sliding' },
          ]}
          onChange={(v) => set('system', v)}
        />
        <div className="mt-4">
          <MultiChips
            label="Variant"
            values={config.variants}
            options={[
              { value: 'panel_door', label: 'Panel + Door' },
              { value: 'double_door', label: 'Double Door' },
              { value: 'fritsjurgens_3', label: 'Fritsjurgens 3' },
            ]}
            onChange={(v) => set('variants', v)}
          />
        </div>
        <div className="mt-4 flex gap-6 font-mono text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.softOpen}
              onChange={(e) => set('softOpen', e.target.checked)}
            />
            Soft open
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.softClose}
              onChange={(e) => set('softClose', e.target.checked)}
            />
            Soft close
          </label>
        </div>
      </section>

      <section>
        <h2 className="section-h">Afwerking</h2>
        <Chips
          label="Finishing"
          value={config.finishing}
          options={[
            { value: 'glasslist_10', label: 'Glasslist 10×10' },
            { value: 'glasslist_15', label: 'Glasslist 15×15' },
            { value: 'soudal_mastiek', label: 'Soudal Mastiek' },
          ]}
          onChange={(v) => set('finishing', v)}
        />
      </section>

      <section>
        <h2 className="section-h">Greep / Handle</h2>
        <Chips
          label="Type"
          value={config.handleKind}
          options={[
            { value: 'l_grip', label: 'L-grip' },
            { value: 'l_vertical', label: 'L-vertical' },
            { value: 'other', label: 'Other' },
          ]}
          onChange={(v) => set('handleKind', v)}
        />
        {config.handleKind === 'l_vertical' ? (
          <div className="mt-3">
            <Field
              label="Lengte L-vertical"
              unit="mm"
              type="number"
              value={config.handleVerticalMm}
              onChange={(e) => set('handleVerticalMm', Number(e.target.value))}
            />
          </div>
        ) : null}
        {config.handleKind === 'other' ? (
          <div className="mt-3">
            <Field
              label="Andere greep"
              value={config.handleOther}
              onChange={(e) => set('handleOther', e.target.value)}
              hint="bv. long handle"
            />
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="section-h">Slot</h2>
        <Chips
          label="Lock case"
          value={config.lockKind}
          options={[
            { value: 'cilinder_litto', label: 'Cilinder (Litto 30/30)' },
            { value: 'no_cilinder', label: 'No cilinder' },
            { value: 'other', label: 'Other' },
          ]}
          onChange={(v) => set('lockKind', v)}
        />
        {config.lockKind === 'other' ? (
          <div className="mt-3">
            <Field
              label="Slot — vrij veld"
              value={config.lockOther}
              onChange={(e) => set('lockOther', e.target.value)}
            />
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="section-h">Kleur</h2>
        <Chips
          label="RAL"
          value={config.colorKind}
          options={[
            { value: 'ral_9005', label: 'Black RAL 9005' },
            { value: 'ral_9010', label: 'White RAL 9010' },
            { value: 'other', label: 'Other' },
          ]}
          onChange={(v) => set('colorKind', v)}
        />
        {config.colorKind === 'other' ? (
          <div className="mt-3">
            <Field
              label="RAL nummer"
              value={config.colorOther}
              onChange={(e) => set('colorOther', e.target.value)}
              hint="bv. RAL 7016"
            />
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="section-h">Design-verdeling</h2>
        <label className="flex items-center gap-2 font-mono text-sm mb-3">
          <input
            type="checkbox"
            checked={!config.designEnabled}
            onChange={(e) => set('designEnabled', !e.target.checked)}
          />
          Geen design-verdeling (eenvoudige deur)
        </label>
        {config.designEnabled ? (
          <FieldRow>
            <Field
              label="Verticale lijn vanaf links"
              unit="mm"
              type="number"
              value={config.verticaleLijnVanafLinks}
              onChange={(e) => set('verticaleLijnVanafLinks', Number(e.target.value))}
              error={errorFor(issues, 'verticaleLijnVanafLinks')}
            />
            <Field
              label="Horizontale dwarslat vanaf onder"
              unit="mm"
              type="number"
              value={config.horizontaleDwarslatVanafOnder}
              onChange={(e) => set('horizontaleDwarslatVanafOnder', Number(e.target.value))}
              error={errorFor(issues, 'horizontaleDwarslatVanafOnder')}
            />
          </FieldRow>
        ) : null}
      </section>
    </div>
  )
}
