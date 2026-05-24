import { useEffect, useMemo, useState } from 'react'
import { OrderForm } from './components/OrderForm'
import { DrawingPreview } from './components/DrawingPreview'
import { CutListView } from './components/CutListView'
import { QuoteSheet } from './components/QuoteSheet'
import { validateConfig } from './lib/calculations'
import { generateDrawing } from './lib/drawingGenerator'
import { DEFAULT_CONFIG } from './lib/types'
import type { DoorConfig } from './lib/types'

type Tab = 'tekening' | 'zaaglijst' | 'orderbon'

const STORAGE_KEY = 'mydoors:concept:v1'

function loadConfig(): DoorConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CONFIG
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch {
    return DEFAULT_CONFIG
  }
}

export default function App() {
  const [config, setConfig] = useState<DoorConfig>(loadConfig)
  const [tab, setTab] = useState<Tab>('tekening')
  const [previewVariant, setPreviewVariant] = useState<'full' | 'glass-frame-only'>('full')

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)) } catch { /* */ }
  }, [config])

  const issues = useMemo(() => validateConfig(config), [config])
  const hasErrors = issues.some((i) => i.severity === 'error')

  function set<K extends keyof DoorConfig>(k: K, v: DoorConfig[K]) {
    setConfig((c) => ({ ...c, [k]: v }))
  }

  function downloadDrawing(variant: 'full' | 'glass-frame-only') {
    const svg = generateDrawing(config, { variant })
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `MYDOORS-${config.referentie.replace(/\s+/g, '_')}-${config.breedte}x${config.hoogte}-${variant}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `MYDOORS-${config.referentie.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importJson(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file) return
    file.text().then((txt) => {
      try {
        const parsed = JSON.parse(txt)
        setConfig({ ...DEFAULT_CONFIG, ...parsed })
      } catch { alert('Ongeldig JSON-bestand') }
    })
  }

  function resetConfig() {
    if (confirm('Configuratie resetten naar standaardwaarden?')) {
      setConfig(DEFAULT_CONFIG)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="no-print border-b border-black/15 px-6 py-4 flex items-center justify-between bg-paper sticky top-0 z-10">
        <div className="flex items-baseline gap-4">
          <h1 className="font-mono text-lg font-bold tracking-widest">MY DOORS</h1>
          <span className="font-mono text-xs uppercase tracking-wider text-zinc-500">
            Deur Configurator
          </span>
        </div>
        <nav className="flex gap-1 font-mono text-xs">
          {(['tekening', 'zaaglijst', 'orderbon'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className="option-chip"
              data-active={tab === t}
              onClick={() => setTab(t)}
            >
              {t === 'tekening' ? 'Tekening' : t === 'zaaglijst' ? 'Zaaglijst' : 'Orderbon'}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2 font-mono text-xs">
          <label className="option-chip cursor-pointer">
            Import JSON
            <input type="file" accept="application/json" hidden onChange={importJson} />
          </label>
          <button type="button" className="option-chip" onClick={exportJson}>
            Export JSON
          </button>
          <button type="button" className="option-chip" onClick={resetConfig}>
            Reset
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(440px,520px)_1fr]">
        <aside className="no-print border-r border-black/15 p-6 overflow-y-auto max-h-[calc(100vh-65px)]">
          <OrderForm config={config} set={set} issues={issues} />
        </aside>

        <main className="p-6 overflow-y-auto max-h-[calc(100vh-65px)] bg-soft/30">
          {tab === 'tekening' && (
            <div className="space-y-4">
              <div className="no-print flex items-center justify-between flex-wrap gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="option-chip"
                    data-active={previewVariant === 'full'}
                    onClick={() => setPreviewVariant('full')}
                  >
                    Volledig
                  </button>
                  <button
                    type="button"
                    className="option-chip"
                    data-active={previewVariant === 'glass-frame-only'}
                    onClick={() => setPreviewVariant('glass-frame-only')}
                  >
                    Glass frame only
                  </button>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="option-chip" onClick={() => downloadDrawing('full')}>
                    Download volledig SVG
                  </button>
                  <button type="button" className="option-chip" onClick={() => downloadDrawing('glass-frame-only')}>
                    Download glass frame SVG
                  </button>
                  <button type="button" className="option-chip" onClick={() => window.print()}>
                    Print tekening
                  </button>
                </div>
              </div>

              {hasErrors ? (
                <div className="no-print border border-accent p-3 font-mono text-xs text-accent">
                  Configuratie bevat fouten — tekening kan onjuist zijn.
                  <ul className="mt-1 list-disc list-inside">
                    {issues.filter((i) => i.severity === 'error').map((i, k) => (
                      <li key={k}>{i.message}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="bg-white border border-black/20 p-6 print-target" id="drawing-print">
                <div className="mx-auto" style={{ aspectRatio: '210/297', maxWidth: '720px' }}>
                  <DrawingPreview config={config} variant={previewVariant} />
                </div>
              </div>
            </div>
          )}

          {tab === 'zaaglijst' && <CutListView config={config} />}
          {tab === 'orderbon' && <QuoteSheet config={config} />}
        </main>
      </div>
    </div>
  )
}
