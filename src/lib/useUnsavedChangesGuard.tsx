import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

/**
 * Beschermt tegen accidenteel weg-navigeren met niet-opgeslagen werk.
 *
 * - In-app navigatie (Link/navigate): react-router-dom `useBlocker`
 *   onderschept de overgang en toont een confirm. Bij OK gaat-ie door,
 *   bij Cancel blijft de gebruiker op de huidige pagina.
 * - Hard refresh / tab sluiten / extern volgen van link: `beforeunload`
 *   toont de browser-native dialoog.
 *
 * Gebruik:
 *   const dirty = ...
 *   useUnsavedChangesGuard(dirty, t('common.unsavedConfirm'))
 */
export function useUnsavedChangesGuard(dirty: boolean, message: string): void {
  // 1. In-app navigatie blokkeren wanneer dirty
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm(message)) {
        blocker.proceed()
      } else {
        blocker.reset()
      }
    }
  }, [blocker, message])

  // 2. Browser-native beforeunload voor tab-sluiten / refresh
  useEffect(() => {
    if (!dirty) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      // Moderne browsers tonen hun eigen string; setReturnValue is nog
      // nodig voor Safari/oude Chromium-versies.
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])
}
