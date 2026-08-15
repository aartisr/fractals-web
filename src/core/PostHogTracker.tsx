import { useEffect } from 'react'
import {
  analyticsConsentEventName,
  hasAnalyticsConsent,
  productEventName,
  type ProductEventName,
} from './services/productTelemetry'
import { getPostHogAssetHost } from './services/posthog'

type PostHogClient = {
  init: (key: string, options: Record<string, unknown>) => void
  capture: (event: string, properties?: Record<string, unknown>) => void
  opt_in_capturing: () => void
  opt_out_capturing: () => void
}

type PostHogBootstrap = PostHogClient & { _i?: Array<[string, Record<string, unknown>]> }

declare global {
  interface Window {
    posthog?: PostHogClient
  }
}

const POSTHOG_SCRIPT_ID = 'posthog-tracker'

// The hosted PostHog array bundle expects the same minimal initialization queue
// as the official snippet. We only queue init; no events are queued pre-consent.
const installBootstrapQueue = () => {
  if (window.posthog) return
  const client = [] as unknown as PostHogBootstrap
  client._i = []
  client.init = (key, options) => client._i?.push([key, options])
  client.capture = () => undefined
  client.opt_in_capturing = () => undefined
  client.opt_out_capturing = () => undefined
  window.posthog = client
}

const loadScript = (source: string) => new Promise<void>((resolve, reject) => {
  const existing = document.getElementById(POSTHOG_SCRIPT_ID) as HTMLScriptElement | null
  if (existing) {
    if (window.posthog) resolve()
    else existing.addEventListener('load', () => resolve(), { once: true })
    return
  }

  const script = document.createElement('script')
  script.id = POSTHOG_SCRIPT_ID
  script.async = true
  script.crossOrigin = 'anonymous'
  script.src = `${source}/static/array.js`
  script.onload = () => resolve()
  script.onerror = () => reject(new Error('PostHog could not be loaded.'))
  document.head.appendChild(script)
})

/**
 * Optional PostHog adapter. It is inert without VITE_POSTHOG_KEY. When present,
 * PostHog is initialized opted out and receives only allowlisted product events
 * after the visitor explicitly grants analytics consent.
 */
export function PostHogTracker() {
  useEffect(() => {
    const key = (import.meta.env.VITE_POSTHOG_KEY as string | undefined)?.trim()
    if (!key) return

    const host = ((import.meta.env.VITE_POSTHOG_HOST as string | undefined)?.trim() || 'https://us.i.posthog.com').replace(/\/$/, '')
    const assetHost = getPostHogAssetHost(host, (import.meta.env.VITE_POSTHOG_ASSET_HOST as string | undefined)?.trim())
    let disposed = false

    const syncConsent = () => {
      if (!window.posthog) return
      if (hasAnalyticsConsent()) window.posthog.opt_in_capturing()
      else window.posthog.opt_out_capturing()
    }

    installBootstrapQueue()
    void loadScript(assetHost).then(() => {
      if (disposed || !window.posthog) return
      window.posthog.init(key, {
        api_host: host,
        defaults: '2026-05-30',
        opt_out_capturing_by_default: true,
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        opt_out_capturing_persistence_type: 'local_storage',
      })
      syncConsent()
    }).catch(() => {
      // Analytics must never make the workbench unavailable.
    })

    const captureProductEvent = (event: Event) => {
      if (!hasAnalyticsConsent()) return
      const name = (event as CustomEvent<ProductEventName>).detail
      if (name) window.posthog?.capture(name, { event_schema: 1 })
    }

    window.addEventListener(analyticsConsentEventName, syncConsent)
    window.addEventListener(productEventName, captureProductEvent)
    return () => {
      disposed = true
      window.removeEventListener(analyticsConsentEventName, syncConsent)
      window.removeEventListener(productEventName, captureProductEvent)
    }
  }, [])

  return null
}
