import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { AppSettings, LineItem, OpportunityWithCustomer } from '../../lib/db'
import type { OrderData } from '../../lib/types'
import { tFor, type Lang } from '../../lib/i18n'
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

function eur(cents: number, lang: Lang) {
  const locale = lang === 'en' ? 'en-IE' : 'nl-BE'
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

interface Props {
  opportunity: OpportunityWithCustomer
  orderData?: OrderData
  reference: string
  validUntil?: string
  items: LineItem[]
  vatRate: number
  settings?: Partial<AppSettings>
  lang?: Lang
}

export function QuotePDF({ opportunity, orderData, reference, validUntil, items, vatRate, settings, lang = 'nl' }: Props) {
  const companyName = settings?.company_name?.trim() || tFor(lang, 'pdf.companyDefault')
  const addrLine = [settings?.company_address_line1, settings?.company_address_postal, settings?.company_address_city].filter(Boolean).join(', ')
  const contactLine = [settings?.company_phone, settings?.company_email].filter(Boolean).join(' · ')
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_cents, 0)
  const vat = Math.round((subtotal * vatRate) / 100)
  const total = subtotal + vat

  return (
    <Document
      title={tFor(lang, 'pdf.docTitleQuote', { ref: reference })}
      author={tFor(lang, 'pdf.author')}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.h1}>{companyName}</Text>
            {addrLine ? <Text style={styles.hSub}>{addrLine}</Text> : null}
            {contactLine ? <Text style={styles.hSub}>{contactLine}</Text> : null}
            {settings?.company_btw ? <Text style={styles.hSub}>{tFor(lang, 'pdf.companyVatLabel')}: {settings.company_btw}</Text> : null}
          </View>
          <View style={styles.rightHead}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5 }}>{tFor(lang, 'pdf.quote')}</Text>
            <Text>{reference}</Text>
            <Text>{tFor(lang, 'pdf.date')}: {new Date().toISOString().slice(0, 10)}</Text>
            {validUntil ? <Text>{tFor(lang, 'pdf.validUntil')}: {validUntil}</Text> : null}
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.h2}>{tFor(lang, 'pdf.customer')}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{tFor(lang, 'pdf.name')}</Text>
            <Text style={styles.value}>{opportunity.customer_name ?? '—'}</Text>
          </View>
          {opportunity.customer_email ? (
            <View style={styles.row}>
              <Text style={styles.label}>{tFor(lang, 'pdf.email')}</Text>
              <Text style={styles.value}>{opportunity.customer_email}</Text>
            </View>
          ) : null}
          {opportunity.customer_phone ? (
            <View style={styles.row}>
              <Text style={styles.label}>{tFor(lang, 'pdf.phone')}</Text>
              <Text style={styles.value}>{opportunity.customer_phone}</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.label}>{tFor(lang, 'pdf.project')}</Text>
            <Text style={styles.value}>{opportunity.title}</Text>
          </View>
        </View>

        {orderData ? (
          <View style={styles.block}>
            <Text style={styles.h2}>{tFor(lang, 'pdf.sketchHeading', { w: orderData.breedte, h: orderData.hoogte })}</Text>
            <View style={styles.sketchWrap}>
              <SketchPdfBlock order={orderData} width={320} height={420} clientView showDimensions />
            </View>
          </View>
        ) : null}

        <View style={styles.block}>
          <Text style={styles.h2}>{tFor(lang, 'pdf.priceHeading')}</Text>
          <View style={styles.thead}>
            <Text style={styles.tdesc}>{tFor(lang, 'pdf.quoteDescription')}</Text>
            <Text style={styles.tqty}>{tFor(lang, 'pdf.colQuantity')}</Text>
            <Text style={styles.tunit}>{tFor(lang, 'pdf.colUnit')}</Text>
            <Text style={styles.ttotal}>{tFor(lang, 'pdf.colTotal')}</Text>
          </View>
          {items.map((i) => (
            <View style={styles.trow} key={i.id}>
              <Text style={styles.tdesc}>{i.description || '—'}</Text>
              <Text style={styles.tqty}>{i.quantity}</Text>
              <Text style={styles.tunit}>{eur(i.unit_cents, lang)}</Text>
              <Text style={styles.ttotal}>{eur(i.quantity * i.unit_cents, lang)}</Text>
            </View>
          ))}

          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>{tFor(lang, 'pdf.totalsSubtotal')}</Text>
            <Text style={styles.totalsVal}>{eur(subtotal, lang)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>{tFor(lang, 'pdf.totalsVat', { rate: vatRate })}</Text>
            <Text style={styles.totalsVal}>{eur(vat, lang)}</Text>
          </View>
          <View style={[styles.totalsRow, styles.finalRow]}>
            <Text style={[styles.totalsLabel, styles.finalLabel]}>{tFor(lang, 'pdf.totalsTotal')}</Text>
            <Text style={[styles.totalsVal, styles.finalVal]}>{eur(total, lang)}</Text>
          </View>
        </View>

        {settings?.quote_footer_note ? (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 8, color: '#5b5b53', lineHeight: 1.4 }}>
              {settings.quote_footer_note}
            </Text>
          </View>
        ) : null}

        <View style={styles.signRow}>
          <Text style={styles.signCol}>{tFor(lang, 'pdf.signClient')}</Text>
          <Text style={styles.signCol}>{companyName}</Text>
        </View>

        <Text style={styles.footer} fixed>
          <Text>{companyName} · {reference}</Text>
          <Text>{tFor(lang, 'pdf.page')} 1</Text>
        </Text>
      </Page>
    </Document>
  )
}
