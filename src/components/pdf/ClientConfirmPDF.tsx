import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { OrderData } from '../../lib/types'
import {
  finishingLabel,
  glassLabel,
  handleLabel,
  hingeLabel,
  lockLabel,
  ralLabel,
  systemLabel,
} from '../../lib/calculations'
import { orderNumber } from '../../lib/orderNumber'
import { tFor, type Lang } from '../../lib/i18n'
import { truncate } from '../../lib/format'
import { SketchPdfBlock } from './SketchPdfBlock'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11, color: '#0A0A0A', backgroundColor: '#FAFAF7' },
  h1: { fontSize: 22, fontWeight: 'bold', letterSpacing: 3 },
  hSub: { fontSize: 10, marginTop: 4, color: '#5b5b53' },
  header: { paddingBottom: 14, marginBottom: 18, borderBottom: '1 solid #0A0A0A' },
  sketchWrap: { alignItems: 'center', marginVertical: 14, padding: 10, backgroundColor: '#FFF' },
  h2: { fontSize: 10, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', marginTop: 16, marginBottom: 8 },
  row: { flexDirection: 'row', marginBottom: 5 },
  label: { width: 130, color: '#5b5b53' },
  value: { flex: 1 },
  intro: { fontSize: 11, lineHeight: 1.5, marginBottom: 8 },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 9, color: '#5b5b53', textAlign: 'center' },
})

interface Props {
  order: OrderData
  lang?: Lang
}

export function ClientConfirmPDF({ order, lang = 'nl' }: Props) {
  const nr = orderNumber(order)
  const customerName = truncate(order.klantNaam, 80) || tFor(lang, 'pdf.clientFallbackName')
  return (
    <Document
      title={tFor(lang, 'pdf.docTitleCustomer', { name: truncate(order.klantNaam, 60) })}
      author={tFor(lang, 'pdf.author')}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.h1}>MY DOORS</Text>
          <Text style={styles.hSub}>{tFor(lang, 'pdf.clientSubtitle')}</Text>
        </View>

        <Text style={styles.intro}>
          {tFor(lang, 'pdf.clientIntro', { name: customerName })}
        </Text>

        <View style={styles.sketchWrap}>
          <SketchPdfBlock order={order} clientView showDimensions={false} width={420} height={580} />
        </View>

        <Text style={styles.h2}>{tFor(lang, 'pdf.clientHeading')}</Text>
        <Row label={tFor(lang, 'pdf.dimensions')} value={`${order.breedte} × ${order.hoogte} mm`} />
        <Row label={tFor(lang, 'pdf.glass')} value={glassLabel(order, lang)} />
        <Row label={tFor(lang, 'pdf.color')} value={ralLabel(order, lang)} />
        <Row label={tFor(lang, 'pdf.hinge')} value={hingeLabel(order, lang)} />
        <Row label={tFor(lang, 'pdf.system')} value={systemLabel(order, lang)} />
        <Row label={tFor(lang, 'pdf.finishingAlt')} value={finishingLabel(order, lang)} />
        <Row label={tFor(lang, 'pdf.handle')} value={handleLabel(order, lang)} />
        <Row label={tFor(lang, 'pdf.lock')} value={lockLabel(order, lang)} />
        <Row
          label={tFor(lang, 'pdf.installation')}
          value={order.plaatsingInbegrepen ? tFor(lang, 'pdf.installationIncludedShort') : tFor(lang, 'pdf.installationApart')}
        />
        <Row label={tFor(lang, 'pdf.numDoors')} value={`${order.aantalDeuren}`} />

        <Text style={styles.footer}>
          MY DOORS · {order.datum} · ref. {nr}
        </Text>
      </Page>
    </Document>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  )
}
