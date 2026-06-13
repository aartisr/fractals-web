import { useEffect, useState } from 'react'

export function useOverlayPreference(storageKey: string, defaultValue = true) {
  const [showOverlays, setShowOverlays] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return defaultValue
    }

    try {
      const stored = window.localStorage.getItem(storageKey)
      if (stored === null) {
        return defaultValue
      }
      return stored === 'true'
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, String(showOverlays))
    } catch {
      // Ignore storage failures (private mode, disabled storage, etc.)
    }
  }, [storageKey, showOverlays])

  return [showOverlays, setShowOverlays] as const
}
