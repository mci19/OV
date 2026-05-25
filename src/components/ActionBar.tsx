import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import type { OrderData } from '../lib/types'
import { FabricantOrderPDF } from './pdf/FabricantOrderPDF'
import { ClientConfirmPDF } from './pdf/ClientConfirmPDF'
import { orderNumber, slug } from '../lib/orderNumber'
import { saveConcept } from '../lib/storage'

interface Props {
  order: OrderData
  hasErrors: boolean
  onSavedConcept?: () => void
}

export function ActionBar({ order, hasErrors, onSavedConcept }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const baseFilename = `MYDOORS-${slug(order)}-${orderNumber(order)}`

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }

  async function makeBlob(target: 'fabrikant' | 'klant'): Promise<Blob> {
    const doc = target === 'fabrikant' ? <FabricantOrderPDF order={order} /> : <ClientConfirmPDF order={order} />
    return pdf(doc).toBlob()
  }

  async function downloadPdf(target: 'fabrikant' | 'klant') {
    setBusy(target)
    try {
      const blob = await makeBlob(target)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${baseFilename}-${target}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(null)
    }
  }

  async function sharePdf(target: 'fabrikant' | 'klant') {
    setBusy(`share-${target}`)
    try {
      const blob = await makeBlob(target)
      const file = new File([blob], `${baseFilename}-${target}.pdf`, { type: 'application/pdf' })
      const data: ShareData = {
        title: `MY DOORS — ${order.klantNaam || orderNumber(order)}`,
        text: target === 'fabrikant'
          ? `Bestelling MY DOORS · ${orderNumber(order)} · ${order.breedte}×${order.hoogte} mm`
          : `Uw deur — bevestiging — MY DOORS`,
        files: [file],
      }
      // Web Share API met file-support
      if (typeof navigator !== 'undefined' && 'canShare' in navigator && navigator.canShare?.(data)) {
        await navigator.share(data)
      } else {
        // fallback: download
        await downloadPdf(target)
        flash('Share niet beschikbaar; bestand gedownload')
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        flash(`Versturen mislukt: ${err.message}`)
      }
    } finally {
      setBusy(null)
    }
  }

  function snapConcept() {
    saveConcept(order)
    flash('Concept opgeslagen')
    onSavedConcept?.()
  }

  const offline = typeof navigator !== 'undefined' && !navigator.onLine

  return (
    <div className="no-print bg-paper border-t border-black/15 px-4 py-3 flex flex-wrap items-center gap-2">
      <div className="flex-1 min-w-[180px]">
        {hasErrors ? (
          <span className="font-mono text-xs text-accent">
            Formulier bevat fouten — controleer rode velden
          </span>
        ) : (
          <span className="font-mono text-xs text-zinc-500">
            #{orderNumber(order)} {offline ? '· offline' : ''}
          </span>
        )}
      </div>
      <button type="button" className="option-chip" onClick={snapConcept} disabled={!!busy}>
        Bewaar concept
      </button>
      <button
        type="button"
        className="option-chip"
        onClick={() => downloadPdf('klant')}
        disabled={!!busy || hasErrors}
      >
        {busy === 'klant' ? '…' : 'Klant-PDF'}
      </button>
      <button
        type="button"
        className="option-chip"
        onClick={() => downloadPdf('fabrikant')}
        disabled={!!busy || hasErrors}
      >
        {busy === 'fabrikant' ? '…' : 'Fabrikant-PDF'}
      </button>
      <button
        type="button"
        className="option-chip"
        data-active
        onClick={() => sharePdf('fabrikant')}
        disabled={!!busy || hasErrors}
      >
        {busy === 'share-fabrikant' ? '…' : 'Verstuur naar fabrikant'}
      </button>
      {toast ? (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-ink text-paper px-4 py-2 font-mono text-xs z-50">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
