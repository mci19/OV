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
  variantLabel,
} from '../../lib/calculations'
import { orderNumber } from '../../lib/orderNumber'
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
  label: { width: 130, color: '#5b5b53', fontSize: 9 },
  value: { flex: 1, fontSize: 10 },
  sketchWrap: { alignItems: 'center', marginVertical: 10 },
  note: { fontSize: 9, color: '#5b5b53', marginTop: 4, fontStyle: 'italic' },
  footer: { position: 'absolute', bottom: 24, left: 36, right: 36, fontSize: 8, color: '#5b5b53', flexDirection: 'row', justifyContent: 'space-between', borderTop: '1 solid #ccc', paddingTop: 4 },
})

interface Props {
  order: OrderData
}

export function FabricantOrderPDF({ order }: Props) {
  const nr = orderNumber(order)
  return (
    <Document title={`MY DOORS — ${nr}`} author="MY DOORS" subject="Fabrikant bestelling">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.h1}>MY DOORS</Text>
            <Text style={styles.hSub}>Stalen binnendeuren · mydoors.be</Text>
          </View>
          <View style={styles.rightHead}>
            <Text style={{ fontSize: 9, letterSpacing: 1.2 }}>BESTELLING FABRIKANT</Text>
            <Text>Nr.: {nr}</Text>
            <Text>Datum: {order.datum}</Text>
            <Text>Verkoper: {order.verkoper}</Text>
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.h2}>Klant</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Naam</Text>
            <Text style={styles.value}>{order.klantNaam || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Referentie</Text>
            <Text style={styles.value}>{order.referentie || '—'}</Text>
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.h2}>Specificaties</Text>
          <Specs label="Type meting" value={order.doorType === 'door_opening' ? 'Door opening' : 'Production'} />
          <Specs label="Afmetingen" value={`${order.breedte} × ${order.hoogte} mm`} />
          <Specs label="Aantal deuren" value={`${order.aantalDeuren}`} />
          <Specs label="Scharnier" value={hingeLabel(order)} />
          <Specs label="Glas" value={glassLabel(order)} />
          <Specs label="Systeem" value={systemLabel(order)} />
          <Specs label="Variant" value={variantLabel(order)} />
          <Specs label="Soft open / close" value={`${order.softOpen ? 'ja' : 'nee'} / ${order.softClose ? 'ja' : 'nee'}`} />
          <Specs label="Finishing" value={finishingLabel(order)} />
          <Specs
            label="Greep"
            value={`${handleLabel(order)} — ${order.handlePosition.side === 'left' ? 'links' : 'rechts'} op ${order.handlePosition.heightFromBottom} mm`}
          />
          <Specs label="Slot" value={lockLabel(order)} />
          <Specs label="Kleur" value={ralLabel(order)} />
          <Specs label="Plaatsing inbegrepen" value={order.plaatsingInbegrepen ? 'ja' : 'nee'} />
        </View>

        <Text style={styles.footer} fixed>
          <Text>MY DOORS · {nr}</Text>
          <Text>p. 1</Text>
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.h1}>Schets — exacte maten</Text>
            <Text style={styles.hSub}>{order.breedte} × {order.hoogte} mm</Text>
          </View>
          <View style={styles.rightHead}>
            <Text>Nr.: {nr}</Text>
          </View>
        </View>
        <View style={styles.sketchWrap}>
          <SketchPdfBlock order={order} width={480} height={640} />
        </View>
        <Text style={styles.note}>
          Maten in millimeter. Verticale lijnen zijn gemeten vanaf de linker rand,
          horizontale dwarslatten vanaf de onderkant.
        </Text>
        {order.opmerkingen ? (
          <View style={[styles.block, { marginTop: 18 }]}>
            <Text style={styles.h2}>Opmerkingen</Text>
            <Text style={{ fontSize: 10, lineHeight: 1.5 }}>{order.opmerkingen}</Text>
          </View>
        ) : null}
        <Text style={styles.footer} fixed>
          <Text>MY DOORS · {nr}</Text>
          <Text>p. 2</Text>
        </Text>
      </Page>

      {order.sketch.freehand.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View>
              <Text style={styles.h1}>Vrije schets — referentie</Text>
              <Text style={styles.hSub}>illustratief; gebruik p. 2 voor exacte maten</Text>
            </View>
            <View style={styles.rightHead}>
              <Text>Nr.: {nr}</Text>
            </View>
          </View>
          <View style={styles.sketchWrap}>
            <SketchPdfBlock order={order} width={480} height={640} showDimensions={false} />
          </View>
          <Text style={styles.footer} fixed>
            <Text>MY DOORS · {nr}</Text>
            <Text>p. 3</Text>
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
