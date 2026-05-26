import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { LineItem, OpportunityWithCustomer } from '../../lib/db'
import type { OrderData } from '../../lib/types'
import { SketchPdfBlock } from './SketchPdfBlock'

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 10, color: '#0A0A0A' },
  h1: { fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },
  hSub: { fontSize: 9, marginTop: 2, color: '#5b5b53' },
  header: { borderBottom: '2 solid #0A0A0A', paddingBottom: 8, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between' },
  rightHead: { textAlign: 'right' },
  block: { marginBottom: 14 },
  h2: { fontSize: 9, fontWeight: 'bold', letterSpacing: 1.5, textTransform: 'uppercase', borderBottom: '1 solid #0A0A0A', paddingBottom: 3, marginBottom: 6 },
  row: { flexDirection: 'row', marginBottom: 3 },
  label: { width: 100, color: '#5b5b53', fontSize: 9 },
  value: { flex: 1, fontSize: 10 },
  // table
  thead: { flexDirection: 'row', borderBottom: '1 solid #0A0A0A', paddingBottom: 4, marginBottom: 4 },
  tdesc: { flex: 1, fontSize: 9, fontWeight: 'bold' },
  tqty: { width: 40, fontSize: 9, fontWeight: 'bold', textAlign: 'right' },
  tunit: { width: 70, fontSize: 9, fontWeight: 'bold', textAlign: 'right' },
  ttotal: { width: 70, fontSize: 9, fontWeight: 'bold', textAlign: 'right' },
  trow: { flexDirection: 'row', paddingVertical: 3, borderBottom: '0.5 solid #DDD' },
  totalsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  totalsLabel: { width: 130, fontSize: 10, textAlign: 'right' },
  totalsVal: { width: 90, fontSize: 10, textAlign: 'right' },
  finalRow: { borderTop: '1 solid #0A0A0A', paddingTop: 4, marginTop: 2 },
  finalLabel: { fontSize: 11, fontWeight: 'bold' },
  finalVal: { fontSize: 11, fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 24, left: 36, right: 36, fontSize: 8, color: '#5b5b53', flexDirection: 'row', justifyContent: 'space-between', borderTop: '1 solid #ccc', paddingTop: 4 },
  sketchWrap: { alignItems: 'center', marginVertical: 8 },
  signRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40, paddingTop: 30 },
  signCol: { width: '45%', borderTop: '0.5 solid #0A0A0A', paddingTop: 4, fontSize: 9 },
})

function eur(cents: number) {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

interface Props {
  opportunity: OpportunityWithCustomer
  orderData?: OrderData
  reference: string
  validUntil?: string
  items: LineItem[]
  vatRate: number
}

export function QuotePDF({ opportunity, orderData, reference, validUntil, items, vatRate }: Props) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_cents, 0)
  const vat = Math.round((subtotal * vatRate) / 100)
  const total = subtotal + vat

  return (
    <Document title={`Offerte ${reference}`} author="MY DOORS">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.h1}>MY DOORS</Text>
            <Text style={styles.hSub}>Stalen binnendeuren · mydoors.be</Text>
          </View>
          <View style={styles.rightHead}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5 }}>OFFERTE</Text>
            <Text>{reference}</Text>
            <Text>Datum: {new Date().toISOString().slice(0, 10)}</Text>
            {validUntil ? <Text>Geldig tot: {validUntil}</Text> : null}
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.h2}>Klant</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Naam</Text>
            <Text style={styles.value}>{opportunity.customer_name ?? '—'}</Text>
          </View>
          {opportunity.customer_email ? (
            <View style={styles.row}>
              <Text style={styles.label}>E-mail</Text>
              <Text style={styles.value}>{opportunity.customer_email}</Text>
            </View>
          ) : null}
          {opportunity.customer_phone ? (
            <View style={styles.row}>
              <Text style={styles.label}>Telefoon</Text>
              <Text style={styles.value}>{opportunity.customer_phone}</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.label}>Project</Text>
            <Text style={styles.value}>{opportunity.title}</Text>
          </View>
        </View>

        {orderData ? (
          <View style={styles.block}>
            <Text style={styles.h2}>Schets ({orderData.breedte} × {orderData.hoogte} mm)</Text>
            <View style={styles.sketchWrap}>
              <SketchPdfBlock order={orderData} width={320} height={420} clientView showDimensions />
            </View>
          </View>
        ) : null}

        <View style={styles.block}>
          <Text style={styles.h2}>Prijs</Text>
          <View style={styles.thead}>
            <Text style={styles.tdesc}>Omschrijving</Text>
            <Text style={styles.tqty}>Aantal</Text>
            <Text style={styles.tunit}>Eenheid</Text>
            <Text style={styles.ttotal}>Totaal</Text>
          </View>
          {items.map((i) => (
            <View style={styles.trow} key={i.id}>
              <Text style={styles.tdesc}>{i.description || '—'}</Text>
              <Text style={styles.tqty}>{i.quantity}</Text>
              <Text style={styles.tunit}>{eur(i.unit_cents)}</Text>
              <Text style={styles.ttotal}>{eur(i.quantity * i.unit_cents)}</Text>
            </View>
          ))}

          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotaal</Text>
            <Text style={styles.totalsVal}>{eur(subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>BTW {vatRate}%</Text>
            <Text style={styles.totalsVal}>{eur(vat)}</Text>
          </View>
          <View style={[styles.totalsRow, styles.finalRow]}>
            <Text style={[styles.totalsLabel, styles.finalLabel]}>Totaal incl. BTW</Text>
            <Text style={[styles.totalsVal, styles.finalVal]}>{eur(total)}</Text>
          </View>
        </View>

        <View style={styles.signRow}>
          <Text style={styles.signCol}>Akkoord klant</Text>
          <Text style={styles.signCol}>MY DOORS</Text>
        </View>

        <Text style={styles.footer} fixed>
          <Text>MY DOORS · {reference}</Text>
          <Text>p. 1</Text>
        </Text>
      </Page>
    </Document>
  )
}
