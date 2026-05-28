import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type ToastKind = 'info' | 'error' | 'success'
interface ToastMsg { id: number; text: string; kind: ToastKind }

interface ToastApi {
  show: (text: string, kind?: ToastKind, ms?: number) => void
  error: (text: string) => void
  success: (text: string) => void
}

const ToastCtx = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const idRef = useRef(1)

  const show = useCallback((text: string, kind: ToastKind = 'info', ms = 3000) => {
    const id = idRef.current++
    setToasts((arr) => [...arr, { id, text, kind }])
    window.setTimeout(() => {
      setToasts((arr) => arr.filter((t) => t.id !== id))
    }, ms)
  }, [])

  const error = useCallback((t: string) => show(t, 'error', 5000), [show])
  const success = useCallback((t: string) => show(t, 'success', 2500), [show])

  return (
    <ToastCtx.Provider value={{ show, error, success }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center pointer-events-none no-print">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast"
            style={{
              position: 'static',
              transform: 'none',
              background: t.kind === 'error' ? 'var(--color-accent)' : t.kind === 'success' ? '#1F4F4D' : 'var(--color-ink)',
            }}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast(): ToastApi {
  const v = useContext(ToastCtx)
  if (!v) return {
    show: (m) => console.log('[toast]', m),
    error: (m) => console.error('[toast]', m),
    success: (m) => console.log('[toast]', m),
  }
  return v
}

/** Lift een onbekende error naar een leesbare string. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message
  }
  return 'Onbekende fout'
}
