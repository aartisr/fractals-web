import { useEffect } from 'react'
import { injectExternalScriptOnce } from './services/externalScript'
import { analyticsConsentEventName, hasAnalyticsConsent, productEventName, type ProductEventName } from './services/productTelemetry'

type ClarityShim = ((...args: unknown[]) => void) & {
  q?: unknown[][]
}

declare global {
  interface Window {
    clarity?: ClarityShim
  }
}

const CLARITY_SCRIPT_ID = 'clarity-tracker'

export function ClarityTracker() {
  useEffect(() => {
    const projectId = (import.meta.env.VITE_CLARITY_PROJECT_ID as string | undefined)?.trim()

    const startIfAllowed = () => {
      if (!projectId || !hasAnalyticsConsent() || document.getElementById(CLARITY_SCRIPT_ID)) return

      const queue = window.clarity?.q ?? []
      window.clarity = Object.assign((...args: unknown[]) => {
        queue.push(args)
      }, { q: queue })

      injectExternalScriptOnce({
        id: CLARITY_SCRIPT_ID,
        src: `https://www.clarity.ms/tag/${projectId}`,
        crossOrigin: 'anonymous',
        referrerPolicy: 'no-referrer-when-downgrade',
      })
    }

    startIfAllowed()
    window.addEventListener(analyticsConsentEventName, startIfAllowed)
    const captureProductEvent = (event: Event) => {
      if (!hasAnalyticsConsent()) return
      const name = (event as CustomEvent<ProductEventName>).detail
      if (name) window.clarity?.('event', name)
    }
    window.addEventListener(productEventName, captureProductEvent)
    return () => {
      window.removeEventListener(analyticsConsentEventName, startIfAllowed)
      window.removeEventListener(productEventName, captureProductEvent)
    }
  }, [])

  return null
}
