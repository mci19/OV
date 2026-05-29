import type { OrderData, ValidationIssue } from '../lib/types'
import { Chips, Field, FieldRow } from './Field'
import { useT } from '../lib/i18n'
import { useAppSettings } from '../lib/queries'
import { DEFAULT_CUT_FORMULAS } from '../lib/db'

interface Props {
  order: OrderData
  set: <K extends keyof OrderData>(k: K, v: OrderData[K]) => void
  issues: ValidationIssue[]
}

function errorFor(issues: ValidationIssue[], field: string): string | null {
  const it = issues.find((i) => i.field === field)
  return it ? it.message : null
}

// Types waarvoor de gebruiker een aangepaste lengte kan invoeren.
const ADJUSTABLE_HANDLE_KINDS = new Set(['l_grip', 'horizontal_bar', 't_grip', 'custom'])

export function OrderForm({ order, set, issues }: Props) {
  const { t } = useT()
  const { data: settings } = useAppSettings()
  const formulas = settings?.cut_formulas ?? DEFAULT_CUT_FORMULAS
  const handleDefault = (() => {
    switch (order.handleKind) {
      case 'l_grip':         return formulas.greep_l_grip_lengte
      case 'horizontal_bar': return formulas.greep_horizontal_bar_lengte
      case 't_grip':         return formulas.greep_t_grip_lengte
      case 'custom':         return formulas.greep_custom_default_lengte
      default:               return 0
    }
  })()
  return (
    <div className="space-y-8">
      <section>
        <h2 className="section-h">{t('order.section.dimensions')}</h2>
        <Chips
          label={t('order.measureType')}
          value={order.doorType}
          options={[
            { value: 'door_opening', label: t('order.measureDoorOpening') },
            { value: 'production', label: t('order.measureProduction') },
          ]}
          onChange={(v) => set('doorType', v)}
        />
        <div className="mt-3">
          <FieldRow>
            <Field
              label={t('order.height')}
              unit="mm"
              type="number"
              value={order.hoogte}
              min={1800}
              max={3500}
              onChange={(e) => set('hoogte', Number(e.target.value))}
              error={errorFor(issues, 'hoogte')}
            />
            <Field
              label={t('order.width')}
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
            label={t('order.numDoors')}
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
        <h2 className="section-h">{t('order.section.topviewHinge')}</h2>
        <Chips
          label={t('order.hingeType')}
          value={order.hingeKind}
          options={[
            { value: 'single', label: t('order.hingeSingle') },
            { value: 'double', label: t('order.hingeDouble') },
          ]}
          onChange={(v) => set('hingeKind', v)}
        />
        <div className="mt-3">
          {order.hingeKind === 'single' ? (
            <Chips
              label={t('order.hingeSide')}
              value={order.hingeSide}
              options={[
                { value: 'belgisch_links', label: t('order.hingeBelgianLeft') },
                { value: 'belgisch_rechts', label: t('order.hingeBelgianRight') },
              ]}
              onChange={(v) => set('hingeSide', v)}
            />
          ) : (
            <Chips
              label={t('order.hingeOption')}
              value={order.hingeSide}
              options={[
                { value: 'double_1', label: t('order.hingeDouble1') },
                { value: 'double_2', label: t('order.hingeDouble2') },
                { value: 'double_3', label: t('order.hingeDouble3') },
                { value: 'double_4', label: t('order.hingeDouble4') },
              ]}
              onChange={(v) => set('hingeSide', v)}
            />
          )}
        </div>
      </section>

      <section>
        <h2 className="section-h">{t('order.section.glass')}</h2>
        <Chips
          label={t('order.glassType')}
          value={order.glassType === 'cathedraal_flute' ? 'cathedraal' : order.glassType}
          options={[
            { value: 'clear', label: t('order.glassClear') },
            { value: 'matt', label: t('order.glassMatt') },
            { value: 'flute', label: t('order.glassFlute') },
            { value: 'cathedraal', label: t('order.glassCathedraal') },
            { value: 'smoke', label: t('order.glassSmoke') },
            { value: 'absolut_black', label: t('order.glassAbsolutBlack') },
            { value: 'chinchilla', label: t('order.glassChinchilla') },
            { value: 'crepi', label: t('order.glassCrepi') },
            { value: 'other', label: t('order.glassOther') },
          ]}
          onChange={(v) => set('glassType', v)}
        />
        {order.glassType === 'other' ? (
          <div className="mt-3">
            <Field
              label={t('order.glassOtherLabel')}
              value={order.glassOther}
              onChange={(e) => set('glassOther', e.target.value)}
            />
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="section-h">{t('order.section.system')}</h2>
        <Chips
          label={t('order.doorConfig')}
          value={order.doorConfig}
          options={[
            { value: 'single', label: t('order.doorConfigSingle') },
            { value: 'double', label: t('order.doorConfigDouble') },
            { value: 'side_panel', label: t('order.doorConfigSidePanel') },
            { value: 'pivot', label: t('order.doorConfigPivot') },
          ]}
          onChange={(v) => {
            // Sync legacy fields zodat ze niet uit elkaar lopen
            set('doorConfig', v)
            if (v === 'double') set('hingeKind', 'double')
            else if (v === 'pivot') set('system', 'pivotica')
            else { set('hingeKind', 'single'); set('system', 'hinges') }
          }}
        />
        <div className="mt-3 flex gap-6 font-mono text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={order.softOpen}
              onChange={(e) => set('softOpen', e.target.checked)}
            />
            {t('order.softOpen')}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={order.softClose}
              onChange={(e) => set('softClose', e.target.checked)}
            />
            {t('order.softClose')}
          </label>
        </div>
      </section>

      <section>
        <h2 className="section-h">{t('order.section.handle')}</h2>
        <Chips
          label={t('order.handleKind')}
          value={order.handleKind}
          options={[
            { value: 'none', label: t('order.handleNone') },
            { value: 'l_grip', label: t('order.handleLGrip') },
            { value: 'l_vertical', label: t('order.handleLVertical') },
            { value: 'horizontal_bar', label: t('order.handleHorizontalBar') },
            { value: 't_grip', label: t('order.handleTGrip') },
            { value: 'custom', label: t('order.handleCustom') },
            { value: 'veerklink', label: t('order.handleVeerklink') },
            { value: 'other', label: t('order.handleOtherLabel') },
          ]}
          onChange={(v) => set('handleKind', v)}
        />
        {ADJUSTABLE_HANDLE_KINDS.has(order.handleKind) ? (
          <div className="mt-3">
            <Field
              label={t('order.handleLengthLabel')}
              unit="mm"
              type="number"
              value={order.handleVerticalMm || ''}
              placeholder={String(handleDefault)}
              onChange={(e) => set('handleVerticalMm', e.target.value === '' ? 0 : Number(e.target.value))}
              hint={t('order.handleLengthHint', { default: handleDefault })}
            />
          </div>
        ) : null}
        {order.handleKind === 'l_vertical' ? (
          <div className="mt-3 p-3 rounded border border-soft-2 bg-paper/40 font-mono text-xs text-[--color-muted]">
            {t('order.handleLVerticalDescription')}
          </div>
        ) : null}
        {order.handleKind === 'veerklink' ? (
          <div className="mt-3 p-3 rounded border border-soft-2 bg-paper/40 font-mono text-xs text-[--color-muted]">
            {t('order.handleVeerklinkDescription')}
          </div>
        ) : null}
        {order.handleKind === 'other' ? (
          <div className="mt-3">
            <Field
              label={t('order.handleOtherDescription')}
              value={order.handleOther}
              onChange={(e) => set('handleOther', e.target.value)}
              hint={t('order.handleOtherDescHint')}
            />
          </div>
        ) : null}
        <div className="mt-3">
          <FieldRow>
            <Chips
              label={t('order.handleSide')}
              value={order.handlePosition.side}
              options={[
                { value: 'left', label: t('order.handleSideLeft') },
                { value: 'right', label: t('order.handleSideRight') },
              ]}
              onChange={(side) =>
                set('handlePosition', { ...order.handlePosition, side })
              }
            />
            <Field
              label={t('order.handleHeight')}
              unit="mm"
              type="number"
              value={order.handlePosition.heightFromBottom}
              onChange={(e) =>
                set('handlePosition', {
                  ...order.handlePosition,
                  heightFromBottom: Number(e.target.value),
                })
              }
              hint={t('order.handleHeightHint')}
            />
          </FieldRow>
        </div>
      </section>

      <section>
        <h2 className="section-h">{t('order.section.lock')}</h2>
        <Chips
          label={t('order.lockKind')}
          value={order.lockKind}
          options={[
            { value: 'cilinder_litto', label: t('order.lockCilinderLitto') },
            { value: 'magnetic',       label: t('order.lockMagnetic') },
            { value: 'electronic',     label: t('order.lockElectronic') },
            { value: 'keyhole_only',   label: t('order.lockKeyholeOnly') },
            { value: 'no_cilinder',    label: t('order.lockNoCilinder') },
            { value: 'other',          label: t('order.handleOtherLabel') },
          ]}
          onChange={(v) => set('lockKind', v)}
        />
        {order.lockKind === 'other' ? (
          <div className="mt-3">
            <Field
              label={t('order.lockOther')}
              value={order.lockOther}
              onChange={(e) => set('lockOther', e.target.value)}
              hint={t('order.lockOtherHint')}
            />
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="section-h">{t('order.section.color')}</h2>
        <Chips
          label={t('order.colorRal')}
          value={order.colorKind}
          options={[
            { value: 'ral_9005', label: t('order.colorBlack') },
            { value: 'ral_9010', label: t('order.colorWhite') },
            { value: 'other', label: t('order.colorOther') },
          ]}
          onChange={(v) => set('colorKind', v)}
        />
        {order.colorKind === 'other' ? (
          <div className="mt-3">
            <Field
              label={t('order.colorRalCode')}
              value={order.colorOther}
              onChange={(e) => set('colorOther', e.target.value)}
              hint={t('order.colorRalHint')}
            />
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="section-h">{t('order.section.extra')}</h2>
        <label className="flex items-center gap-2 font-mono text-sm mb-3">
          <input
            type="checkbox"
            checked={order.plaatsingInbegrepen}
            onChange={(e) => set('plaatsingInbegrepen', e.target.checked)}
          />
          {t('order.installationIncluded')}
        </label>
        <label className="block">
          <span className="field-label">{t('order.notesLabel')}</span>
          <textarea
            className="field-input min-h-[80px]"
            rows={3}
            value={order.opmerkingen}
            onChange={(e) => set('opmerkingen', e.target.value)}
            placeholder={t('order.notesPlaceholder')}
          />
        </label>
      </section>
    </div>
  )
}
