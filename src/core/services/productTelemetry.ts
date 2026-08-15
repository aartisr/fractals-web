const CONSENT_KEY = 'fractals.analytics-consent.v1'
const CONSENT_EVENT = 'fractals:analytics-consent'
const PRODUCT_EVENT = 'fractals:product-event'

export type ProductEventName =
  | 'page_view'
  | 'tumor_model_prepare_started'
  | 'tumor_model_prepare_succeeded'
  | 'tumor_model_prepare_failed'

const safeStorage = () => {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export const hasAnalyticsConsent = () => {
  if (typeof window === 'undefined') return false
  return safeStorage()?.getItem(CONSENT_KEY) === 'granted'
}

export const setAnalyticsConsent = (granted: boolean) => {
  if (typeof window === 'undefined') return
  safeStorage()?.setItem(CONSENT_KEY, granted ? 'granted' : 'denied')
  window.dispatchEvent(new Event(CONSENT_EVENT))
}

export const analyticsConsentEventName = CONSENT_EVENT
export const productEventName = PRODUCT_EVENT

/**
 * Consent-gated, payload-free product events. Uploaded images, filenames,
 * measurements, and medical inferences are intentionally never sent here.
 */
export const trackProductEvent = (event: ProductEventName) => {
  if (!hasAnalyticsConsent()) return
  window.dispatchEvent(new CustomEvent<ProductEventName>(PRODUCT_EVENT, { detail: event }))
}
