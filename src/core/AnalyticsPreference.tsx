import { useState } from 'react'
import { hasAnalyticsConsent, setAnalyticsConsent } from './services/productTelemetry'

export function AnalyticsPreference() {
  const [enabled, setEnabled] = useState(() => hasAnalyticsConsent())

  return (
    <label className="ft-analytics-choice">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => {
          const next = event.target.checked
          setEnabled(next)
          setAnalyticsConsent(next)
        }}
      />
      <span>Allow anonymous product analytics</span>
    </label>
  )
}
