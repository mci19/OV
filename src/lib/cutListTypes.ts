import type { CutListItem } from './cutList'

/** Handmatige override van de zaaglijst — vervangt de automatisch
 *  gegenereerde versie als hij gezet is. Bewaard met de OrderData
 *  in Supabase zodat hij persistent is. */
export interface CutListOverride {
  /** De volledige items-lijst zoals de fabrikant hem moet krijgen */
  items: CutListItem[]
  /** Eventueel een notitie voor wat er aangepast werd */
  note?: string
  /** Datum + door wie laatst aangepast (info-only) */
  updatedAt: string
}
