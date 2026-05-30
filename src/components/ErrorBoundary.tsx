import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * Vangt render-time crashes in de hele app. Zonder deze grenswachter
 * white-screen't React zodra een lazy-page een error gooit. Toont een
 * nette fallback met "herlaad" + de error-message voor de gebruiker
 * (NL primair, EN-gebruikers begrijpen "reload" + browser-error).
 *
 * Heel bewust een class-component: React heeft geen hook-equivalent
 * voor componentDidCatch / getDerivedStateFromError.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // Stuur naar de browser-console zodat ontwikkelaars in productie
    // tenminste een stack zien (geen Sentry geconfigureerd in v1).
    // eslint-disable-next-line no-console
    console.error('App ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    const message = this.state.error.message || 'Onbekende fout'
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-paper p-6">
        <div className="max-w-md w-full card !p-6 space-y-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-accent">
            MY DOORS
          </div>
          <h1 className="text-xl font-semibold">Er ging iets mis</h1>
          <p className="text-sm text-[--color-muted]">
            De pagina kon niet getoond worden. Klik op "Herlaad" om opnieuw te beginnen.
            Als het probleem aanhoudt, neem dan contact op met je beheerder.
          </p>
          <details className="text-xs font-mono text-[--color-muted]">
            <summary className="cursor-pointer">Technische details</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">{message}</pre>
          </details>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Herlaad / Reload
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => { window.location.href = '/' }}
            >
              Home
            </button>
          </div>
        </div>
      </div>
    )
  }
}
