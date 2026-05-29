import { useState } from 'react'
import type { OrderData } from '../lib/types'
import { orderNumber, slug } from '../lib/orderNumber'
import { saveConcept } from '../lib/storage'
import { useAppSettings } from '../lib/queries'
import { useT } from '../lib/i18n'

interface Props {
  order: OrderData
  hasErrors: boolean
  onSavedConcept?: () => void
}

export function ActionBar({ order, hasErrors, onSavedConcept }: Props) {
  const { t, lang } = useT()
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const { data: settings } = useAppSettings()
  const baseFilename = `MYDOORS-${slug(order)}-${orderNumber(order)}`

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }

  async function makeBlob(target: 'fabrikant' | 'klant'): Promise<Blob> {
    const [{ pdf }, { FabricantOrderPDF }, { ClientConfirmPDF }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('./pdf/FabricantOrderPDF'),
      import('./pdf/ClientConfirmPDF'),
    ])
    const doc = target === 'fabrikant'
      ? <FabricantOrderPDF order={order} cutFormulas={settings?.cut_formulas} lang={lang} />
      : <ClientConfirmPDF order={order} lang={lang} />
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
      flash(t('actionBar.pdfDownloaded', { target: target === 'fabrikant' ? t('actionBar.targetFabrikant') : t('actionBar.targetKlant') }))
    } catch (err) {
      flash(t('actionBar.pdfFailed', { error: err instanceof Error ? err.message : t('actionBar.unknownError') }))
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
          ? `MY DOORS · ${orderNumber(order)} · ${order.breedte}×${order.hoogte} mm`
          : `MY DOORS`,
        files: [file],
      }
      // Web Share API met file-support
      if (typeof navigator !== 'undefined' && 'canShare' in navigator && navigator.canShare?.(data)) {
        await navigator.share(data)
      } else {
        // fallback: download
        await downloadPdf(target)
        flash(t('actionBar.shareFallback'))
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        flash(t('actionBar.shareFailed', { error: err.message }))
      }
    } finally {
      setBusy(null)
    }
  }

  function snapConcept() {
    saveConcept(order)
    flash(t('actionBar.draftSaved'))
    onSavedConcept?.()
  }

  const offline = typeof navigator !== 'undefined' && !navigator.onLine

  return (
    <div className="no-print bg-paper/90 backdrop-blur border-t border-soft-2 px-4 py-3 flex flex-wrap items-center gap-2">
      <div className="flex-1 min-w-[180px]">
        {hasErrors ? (
          <span className="font-mono text-xs text-accent">
            {t('actionBar.formHasErrors')}
          </span>
        ) : (
          <span className="font-mono text-xs text-zinc-500">
            #{orderNumber(order)} {offline ? `· ${t('common.offline')}` : ''}
          </span>
        )}
      </div>
      <button type="button" className="chip" onClick={snapConcept} disabled={!!busy}>
        {t('actionBar.saveDraft')}
      </button>
      <button
        type="button"
        className="chip"
        onClick={() => downloadPdf('klant')}
        disabled={!!busy || hasErrors}
      >
        {busy === 'klant' ? '…' : t('actionBar.clientPdf')}
      </button>
      <button
        type="button"
        className="chip"
        onClick={() => downloadPdf('fabrikant')}
        disabled={!!busy || hasErrors}
      >
        {busy === 'fabrikant' ? '…' : t('actionBar.manufacturerPdf')}
      </button>
      <button
        type="button"
        className="btn btn-accent"
        onClick={() => sharePdf('fabrikant')}
        disabled={!!busy || hasErrors}
      >
        {busy === 'share-fabrikant' ? '…' : t('actionBar.sendToManufacturer')}
      </button>
      {toast ? (
        <div className="toast">{toast}</div>
      ) : null}
    </div>
  )
}
