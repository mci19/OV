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
}

export function ClientConfirmPDF({ order }: Props) {
  const nr = orderNumber(order)
  return (
    <Document title={`MY DOORS — ${order.klantNaam}`} author="MY DOORS">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.h1}>MY DOORS</Text>
          <Text style={styles.hSub}>Uw bestelling — ter bevestiging</Text>
        </View>

        <Text style={styles.intro}>
          Beste {order.klantNaam || 'klant'},{'\n'}
          Hieronder vindt u een visuele samenvatting van uw deur zoals besproken
          in onze showroom. Maten en kleuren zijn ter bevestiging.
        </Text>

        <View style={styles.sketchWrap}>
          <SketchPdfBlock order={order} clientView showDimensions={false} width={420} height={580} />
        </View>

        <Text style={styles.h2}>Uw keuzes</Text>
        <Row label="Afmetingen" value={`${order.breedte} × ${order.hoogte} mm`} />
        <Row label="Glas" value={glassLabel(order)} />
        <Row label="Kleur" value={ralLabel(order)} />
        <Row label="Scharnier" value={hingeLabel(order)} />
        <Row label="Systeem" value={systemLabel(order)} />
        <Row label="Afwerking" value={finishingLabel(order)} />
        <Row label="Greep" value={handleLabel(order)} />
        <Row label="Slot" value={lockLabel(order)} />
        <Row label="Plaatsing" value={order.plaatsingInbegrepen ? 'inbegrepen' : 'apart te bespreken'} />
        <Row label="Aantal deuren" value={`${order.aantalDeuren}`} />

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
