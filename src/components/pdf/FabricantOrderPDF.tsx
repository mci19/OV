import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { OrderData } from '../../lib/types'
import type { CutFormulas } from '../../lib/db'
import {
  finishingLabel,
  glassLabel,
  handleLabel,
  hingeLabel,
  lockLabel,
  ralLabel,
  systemLabel,
  variantLabel,
} from '../../lib/calculations'
import { orderNumber } from '../../lib/orderNumber'
import { generateCutList } from '../../lib/cutList'
import { tFor, type Lang } from '../../lib/i18n'
import { truncate } from '../../lib/format'
import { SketchPdfBlock } from './SketchPdfBlock'
import { CutListPdfBlock } from './CutListPdfBlock'
import { CrossSectionPdf } from './CrossSectionPdf'

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 10, color: '#0A0A0A' },
  h1: { fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },
  hSub: { fontSize: 9, marginTop: 2, color: '#5b5b53' },
  header: { borderBottom: '2 solid #0A0A0A', paddingBottom: 8, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between' },
  rightHead: { textAlign: 'right' },
  block: { marginBottom: 14 },
  h2: { fontSize: 9, fontWeight: 'bold', letterSpacing: 1.5, textTransform: 'uppercase', borderBottom: '1 solid #0A0A0A', paddingBottom: 3, marginBottom: 6 },
  row: { flexDirection: 'row', marginBottom: 3 },
  label: { width: 130, color: '#5b5b53', fontSize: 9 },
  value: { flex: 1, fontSize: 10 },
  sketchWrap: { alignItems: 'center', marginVertical: 10 },
  note: { fontSize: 9, color: '#5b5b53', marginTop: 4, fontStyle: 'italic' },
  footer: { position: 'absolute', bottom: 24, left: 36, right: 36, fontSize: 8, color: '#5b5b53', flexDirection: 'row', justifyContent: 'space-between', borderTop: '1 solid #ccc', paddingTop: 4 },
})

interface Props {
  order: OrderData
  cutFormulas?: CutFormulas
  lang?: Lang
}

export function FabricantOrderPDF({ order, cutFormulas, lang = 'nl' }: Props) {
  const nr = orderNumber(order)
  const computed = generateCutList(order, cutFormulas)
  // Manuele override geldt boven de berekende lijst (header/RAL blijven gelijk)
  const cutList = order.cutListOverride
    ? { ...computed, items: order.cutListOverride.items }
    : computed
  const overrideNote = order.cutListOverride?.note
  const yes = tFor(lang, 'common.yes')
  const no = tFor(lang, 'common.no')
  const sideLabel = order.handlePosition.side === 'left' ? tFor(lang, 'pdf.left') : tFor(lang, 'pdf.right')
  return (
    <Document
      title={tFor(lang, 'pdf.docTitleManufacturer', { nr })}
      author={tFor(lang, 'pdf.author')}
      subject={tFor(lang, 'pdf.subjectManufacturer')}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.h1}>MY DOORS</Text>
            <Text style={styles.hSub}>{tFor(lang, 'pdf.steelDoors')}</Text>
          </View>
          <View style={styles.rightHead}>
            <Text style={{ fontSize: 9, letterSpacing: 1.2 }}>{tFor(lang, 'pdf.manufacturerOrder')}</Text>
            <Text>{tFor(lang, 'pdf.no')}: {nr}</Text>
            <Text>{tFor(lang, 'pdf.date')}: {order.datum}</Text>
            <Text>{tFor(lang, 'pdf.salesperson')}: {order.verkoper}</Text>
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.h2}>{tFor(lang, 'pdf.customer')}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{tFor(lang, 'pdf.name')}</Text>
            <Text style={styles.value}>{truncate(order.klantNaam, 60) || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{tFor(lang, 'pdf.reference')}</Text>
            <Text style={styles.value}>{truncate(order.referentie, 60) || '—'}</Text>
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.h2}>{tFor(lang, 'pdf.specs')}</Text>
          <Specs label={tFor(lang, 'pdf.dimensions')} value={`${order.breedte} × ${order.hoogte} mm`} />
          <Specs label={tFor(lang, 'pdf.hinge')} value={hingeLabel(order, lang)} />
          <Specs label={tFor(lang, 'pdf.glass')} value={glassLabel(order, lang)} />
          <Specs label={tFor(lang, 'pdf.system')} value={systemLabel(order, lang)} />
          <Specs label={tFor(lang, 'pdf.variant')} value={variantLabel(order, lang)} />
          <Specs label={tFor(lang, 'pdf.softOpenClose')} value={`${order.softOpen ? yes : no} / ${order.softClose ? yes : no}`} />
          <Specs label={tFor(lang, 'pdf.finishing')} value={finishingLabel(order, lang)} />
          <Specs
            label={tFor(lang, 'pdf.handle')}
            value={`${handleLabel(order, lang)} — ${sideLabel} ${order.handlePosition.heightFromBottom} mm`}
          />
          <Specs label={tFor(lang, 'pdf.lock')} value={lockLabel(order, lang)} />
          <Specs label={tFor(lang, 'pdf.color')} value={ralLabel(order, lang)} />
          <Specs label={tFor(lang, 'pdf.installationIncluded')} value={order.plaatsingInbegrepen ? yes : no} />
        </View>

        <Text style={styles.footer} fixed>
          <Text>MY DOORS · {nr}</Text>
          <Text>{tFor(lang, 'pdf.page')} 1</Text>
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.h1}>{tFor(lang, 'pdf.sketchTitle')}</Text>
            <Text style={styles.hSub}>{order.breedte} × {order.hoogte} mm</Text>
          </View>
          <View style={styles.rightHead}>
            <Text>{tFor(lang, 'pdf.no')}: {nr}</Text>
          </View>
        </View>
        <View style={styles.sketchWrap}>
          <SketchPdfBlock order={order} width={480} height={640} />
        </View>
        <Text style={styles.note}>{tFor(lang, 'pdf.sketchNote')}</Text>
        {order.opmerkingen ? (
          <View style={[styles.block, { marginTop: 18 }]}>
            <Text style={styles.h2}>{tFor(lang, 'pdf.notes')}</Text>
            <Text style={{ fontSize: 10, lineHeight: 1.5 }}>{order.opmerkingen}</Text>
          </View>
        ) : null}
        <Text style={styles.footer} fixed>
          <Text>MY DOORS · {nr}</Text>
          <Text>{tFor(lang, 'pdf.page')} 2</Text>
        </Text>
      </Page>

      {/* Zaaglijst — exact in MY DOORS productie-format */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.h1}>{tFor(lang, 'pdf.cutListTitle')}</Text>
            <Text style={styles.hSub}>{order.datum} · MY DOORS-{truncate(order.klantNaam || order.referentie || tFor(lang, 'pdf.fallbackCustomer'), 50)}</Text>
          </View>
          <View style={styles.rightHead}>
            <Text>{tFor(lang, 'pdf.no')}: {nr}</Text>
          </View>
        </View>

        {/* Profiel-doorsnede bovenaan */}
        <View style={{ alignItems: 'center', marginVertical: 10 }}>
          <CrossSectionPdf width={420} height={100} />
        </View>

        {/* De zaaglijst zelf */}
        <View style={{ marginTop: 6 }}>
          <CutListPdfBlock items={cutList.items} headerLine={cutList.headerLine} ralLine={cutList.ralLine} />
        </View>

        {order.cutListOverride ? (
          <View style={{ marginTop: 12, padding: 6, borderTop: '0.5 solid #999' }}>
            <Text style={{ fontSize: 8, fontStyle: 'italic', color: '#666' }}>
              {tFor(lang, 'pdf.cutListOverrideNote')}{overrideNote ? ` — ${overrideNote}` : ''}
            </Text>
          </View>
        ) : null}

        <Text style={styles.footer} fixed>
          <Text>MY DOORS · {nr}</Text>
          <Text>{tFor(lang, 'pdf.zaaglijstLabel')}</Text>
        </Text>
      </Page>

      {order.sketch.freehand.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View>
              <Text style={styles.h1}>{tFor(lang, 'pdf.freehandTitle')}</Text>
              <Text style={styles.hSub}>{tFor(lang, 'pdf.freehandSub')}</Text>
            </View>
            <View style={styles.rightHead}>
              <Text>{tFor(lang, 'pdf.no')}: {nr}</Text>
            </View>
          </View>
          <View style={styles.sketchWrap}>
            <SketchPdfBlock order={order} width={480} height={640} showDimensions={false} />
          </View>
          <Text style={styles.footer} fixed>
            <Text>MY DOORS · {nr}</Text>
            <Text>{tFor(lang, 'pdf.page')} 4</Text>
          </Text>
        </Page>
      ) : null}
    </Document>
  )
}

function Specs({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  )
}
