import { useEffect } from 'react'

/**
 * Beschermt tegen accidenteel weg-navigeren met niet-opgeslagen werk.
 *
 * Beperkt tot `beforeunload` — die vangt tab sluiten, browser refresh en
 * navigeren naar een externe URL af. In-app SPA-navigatie via Link of
 * navigate() wordt momenteel NIET geblokkeerd: react-router-dom's
 * `useBlocker` vereist de data-router API (`createBrowserRouter`), terwijl
 * de app op de classic `<BrowserRouter>` draait. Bij migratie naar de
 * data-router voegen we de in-app blocker hier opnieuw toe.
 */
export function useUnsavedChangesGuard(dirty: boolean, _message: string): void {
  useEffect(() => {
    if (!dirty) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      // Moderne browsers tonen hun eigen string; setReturnValue blijft
      // nodig voor Safari + oudere Chromium-versies.
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])
}
