import { useMemo, useState } from 'react'
import { cutListToCsv, generateCutList } from '../lib/cutListGenerator'
import type { DoorConfig } from '../lib/types'

interface Props {
  config: DoorConfig
}

export function CutListView({ config }: Props) {
  const result = useMemo(() => generateCutList(config), [config])
  const [copied, setCopied] = useState(false)

  function download(name: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  function copyText() {
    navigator.clipboard.writeText(result.text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const baseName = `${config.referentie.replace(/\s+/g, '_')}-${config.breedte}x${config.hoogte}`

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap gap-2">
        <button
          type="button"
          className="option-chip"
          onClick={() => download(`${baseName}.txt`, result.text, 'text/plain')}
        >
          Download .txt
        </button>
        <button
          type="button"
          className="option-chip"
          onClick={() => download(`${baseName}.csv`, cutListToCsv(result.items), 'text/csv')}
        >
          Download .csv
        </button>
        <button type="button" className="option-chip" onClick={copyText}>
          {copied ? 'Gekopieerd' : 'Kopieer naar klembord'}
        </button>
        <button
          type="button"
          className="option-chip"
          onClick={() => {
            document.body.classList.add('print-cutlist')
            setTimeout(() => {
              window.print()
              document.body.classList.remove('print-cutlist')
            }, 50)
          }}
        >
          Print zaaglijst
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white border border-black/20 p-6 print-target" id="cutlist-print">
          <h3 className="font-mono text-sm uppercase tracking-widest mb-3">Zaaglijst</h3>
          <pre className="cutlist-text font-mono text-[13px] leading-snug whitespace-pre">
{result.text}
          </pre>
        </div>

        <div>
          <h3 className="font-mono text-sm uppercase tracking-widest mb-3">Tabel</h3>
          <table className="w-full text-sm font-mono border-collapse">
            <thead>
              <tr className="border-b border-black">
                <th className="text-left py-1 pr-2">Nr</th>
                <th className="text-left py-1 pr-2">Profiel</th>
                <th className="text-right py-1 pr-2">Lengte</th>
                <th className="text-right py-1 pr-2">Aantal</th>
                <th className="text-left py-1">Bewerking</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((item, i) => (
                <tr key={i} className="border-b border-black/10">
                  <td className="py-1 pr-2">{item.nr ?? '·'}</td>
                  <td className="py-1 pr-2">{item.profiel}</td>
                  <td className="py-1 pr-2 text-right">{item.lengte} mm</td>
                  <td className="py-1 pr-2 text-right">{item.aantal}</td>
                  <td className="py-1">{item.bewerking ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
