import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

/**
 * Beschermt tegen accidenteel weg-navigeren met niet-opgeslagen werk.
 *
 * - In-app navigatie (Link, navigate): react-router-dom `useBlocker`
 *   onderschept de overgang en toont een confirm. Werkt sinds de
 *   migratie naar `createBrowserRouter` (data-router API) in App.tsx.
 * - Browser-native (refresh, tab sluiten, externe link): `beforeunload`
 *   toont de browser-eigen "Wijzigingen verlaten?"-dialoog.
 */
export function useUnsavedChangesGuard(dirty: boolean, message: string): void {
  // 1. In-app blocker — onderschept SPA-navigatie binnen react-router
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state === 'blocked') {
      // Synchroon confirm: user kan OK = doorgaan, Cancel = blijven
      if (window.confirm(message)) {
        blocker.proceed()
      } else {
        blocker.reset()
      }
    }
  }, [blocker, message])

  // 2. Browser-native beforeunload (tab sluiten, refresh, externe link)
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
