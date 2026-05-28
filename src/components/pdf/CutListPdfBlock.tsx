import { Text, View, StyleSheet } from '@react-pdf/renderer'
import type { CutListItem } from '../../lib/cutList'

const styles = StyleSheet.create({
  block: { fontFamily: 'Courier', fontSize: 10, lineHeight: 1.32 },
  centered: { alignItems: 'center' },
  header: { fontSize: 13, fontWeight: 'bold', marginBottom: 1 },
  ral: { fontSize: 13, fontWeight: 'bold', marginBottom: 6 },
  itemRow: { flexDirection: 'row' },
  nr: { width: 22, textAlign: 'right' },
  profiel: { width: 78, paddingLeft: 4 },
  lengte: { width: 70, textAlign: 'right' },
  aantal: { width: 38, textAlign: 'right' },
  extra: { marginTop: 4 },
})

interface Props {
  items: CutListItem[]
  headerLine: string  // "877-2446"
  ralLine: string     // "RAL 9005"
}

/**
 * Render de zaaglijst in het exacte format dat de MY DOORS productie
 * gewend is — gecentreerd, monospaced, met item-nr, profiel-spec,
 * lengte (mm) en aantal (vnt).
 */
export function CutListPdfBlock({ items, headerLine, ralLine }: Props) {
  const numbered = items.filter((i) => i.nr !== null)
  const kampas = items.filter((i) => i.nr === null && i.profiel.startsWith('Kampas'))
  const juosta = items.filter((i) => i.nr === null && i.profiel.startsWith('Juosta'))

  return (
    <View style={[styles.block, styles.centered]}>
      <Text style={styles.header}>{headerLine}</Text>
      <Text style={styles.ral}>{ralLine}</Text>

      {numbered.map((item) => (
        <View key={item.nr} style={styles.itemRow}>
          <Text style={styles.nr}>{item.nr}.</Text>
          <Text style={styles.profiel}>{item.profiel}</Text>
          <Text style={styles.lengte}>-{item.lengte}mm.</Text>
          <Text style={styles.aantal}>{item.aantal}vnt.</Text>
        </View>
      ))}

      {kampas.length > 0 ? (
        <View style={styles.extra}>
          {kampas.map((k, i) => (
            <Text key={i}>Kampas 30*30 L-{k.lengte}mm. {k.aantal}vnt.</Text>
          ))}
        </View>
      ) : null}

      {juosta.length > 0 ? (
        <View style={styles.extra}>
          {juosta.map((j, i) => (
            <Text key={i}>Juosta-35*4-{j.lengte}mm. {j.aantal}vnt.</Text>
          ))}
        </View>
      ) : null}
    </View>
  )
}
