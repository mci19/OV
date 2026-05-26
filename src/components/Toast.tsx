import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface ToastApi {
  show: (message: string, kind?: 'info' | 'success' | 'error') => void
}

const ToastCtx = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; kind: string; id: number } | null>(null)
  const show = useCallback<ToastApi['show']>((text, kind = 'info') => {
    setMsg({ text, kind, id: Date.now() })
    window.setTimeout(() => setMsg((cur) => (cur && cur.id === Date.now() ? null : cur)), 2400)
  }, [])

  // simpler dismiss after delay
  if (msg) {
    setTimeout(() => setMsg((cur) => (cur && cur.id === msg.id ? null : cur)), 2400)
  }

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {msg ? <div className="toast no-print">{msg.text}</div> : null}
    </ToastCtx.Provider>
  )
}

export function useToast(): ToastApi {
  const v = useContext(ToastCtx)
  if (!v) return { show: (m) => console.log('[toast]', m) }
  return v
}
