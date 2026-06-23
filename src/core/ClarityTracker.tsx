import { useEffect } from 'react'
import { injectExternalScriptOnce } from './services/externalScript'

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

    if (!projectId) {
      return
    }

    if (document.getElementById(CLARITY_SCRIPT_ID)) {
      return
    }

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
  }, [])

  return null
}
