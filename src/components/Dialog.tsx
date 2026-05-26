import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Dialog({ open, onClose, title, children, footer, size = 'md' }: Props) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const maxW = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-3xl' : 'max-w-lg'

  return (
    <div className="fixed inset-0 z-50 no-print flex items-end sm:items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className={`bg-paper border border-ink w-full ${maxW} max-h-[90dvh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <div className="flex items-center justify-between border-b border-ink px-5 py-3">
            <h2 className="font-mono text-sm font-bold uppercase tracking-widest">{title}</h2>
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Sluit">
              <X size={18} />
            </button>
          </div>
        ) : null}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer ? <div className="border-t border-ink px-5 py-3 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}
