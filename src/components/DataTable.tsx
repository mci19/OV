import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

export interface DataTableColumn<T> {
  /** Identifier voor sortering + localStorage-key. Moet uniek per tabel. */
  key: string
  header: ReactNode
  /** Cel-render. */
  cell: (row: T) => ReactNode
  /** Pure waarde voor sortering. Default: `cell(row)` gestringificeerd. */
  sortValue?: (row: T) => string | number | null | undefined
  /** Zet uit als sortering geen zin heeft (bv. action-kolom). */
  sortable?: boolean
  /** Vaste breedte (bv. "80px") of CSS-class voor flexible width. */
  width?: string
  /** Visuele uitlijning van de cel. */
  align?: 'left' | 'right' | 'center'
  /** Verberg deze kolom onder een viewport-breedte (px). */
  hideBelow?: number
}

interface Props<T> {
  rows: T[]
  columns: DataTableColumn<T>[]
  /** Rij-klik → bv. navigeren naar detail-pagina. */
  onRowClick?: (row: T) => void
  /** Voor accessibility + voor stable React-keys. */
  rowKey: (row: T) => string
  /** Bewaar sort-keuze in localStorage onder deze key. */
  persistKey?: string
  /** Default sort (eerste render, voor persistKey). */
  defaultSort?: { key: string; dir: 'asc' | 'desc' }
  /** Tekst wanneer rows leeg is. */
  emptyText?: string
  /** Extra className op de table. */
  className?: string
}

type SortState = { key: string; dir: 'asc' | 'desc' } | null

/**
 * Lichte tabel-component met sorteerbare kolommen + click-row.
 * Bewust geen pagination/virtuele scroll — voor deze CRM zijn enkele
 * honderden rijen geen probleem; bij meer dan ~500 rows zou ik tanstack
 * table virtuele scrolling overwegen.
 */
export function DataTable<T>({
  rows,
  columns,
  onRowClick,
  rowKey,
  persistKey,
  defaultSort,
  emptyText,
  className,
}: Props<T>) {
  const [sort, setSort] = useState<SortState>(() => {
    if (persistKey) {
      try {
        const stored = localStorage.getItem(`mydoors:dt:${persistKey}`)
        if (stored) return JSON.parse(stored) as SortState
      } catch { /* */ }
    }
    return defaultSort ?? null
  })

  function toggleSort(key: string) {
    setSort((cur) => {
      const next: SortState =
        !cur || cur.key !== key
          ? { key, dir: 'asc' }
          : cur.dir === 'asc'
            ? { key, dir: 'desc' }
            : null
      if (persistKey) {
        try { localStorage.setItem(`mydoors:dt:${persistKey}`, JSON.stringify(next)) } catch { /* */ }
      }
      return next
    })
  }

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return rows
    const getter = col.sortValue ?? ((r: T) => String(col.cell(r) ?? ''))
    const sign = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = getter(a)
      const vb = getter(b)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sign
      return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' }) * sign
    })
  }, [rows, sort, columns])

  if (rows.length === 0 && emptyText) {
    return (
      <div className="border border-dashed border-soft-2 rounded-lg p-10 text-center text-[--color-muted] font-mono text-sm">
        {emptyText}
      </div>
    )
  }

  return (
    <div className="data-table-wrap">
      <table className={`data-table ${className ?? ''}`}>
        <thead>
          <tr>
            {columns.map((col) => {
              const sortable = col.sortable !== false
              const isSorted = sort?.key === col.key
              return (
                <th
                  key={col.key}
                  style={{
                    width: col.width,
                    textAlign: col.align ?? 'left',
                  }}
                  data-hide-below={col.hideBelow}
                >
                  {sortable ? (
                    <button
                      type="button"
                      className="data-table-sort"
                      onClick={() => toggleSort(col.key)}
                      style={{ justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start' }}
                    >
                      <span>{col.header}</span>
                      {isSorted ? (
                        sort!.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} className="opacity-30" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={rowKey(row)}
              data-interactive={onRowClick ? '' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{ textAlign: col.align ?? 'left' }}
                  data-hide-below={col.hideBelow}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
