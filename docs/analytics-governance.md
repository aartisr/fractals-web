# Privacy-safe product analytics

Fractals Web is analytics-free by default. When analytics is configured, visitors must explicitly opt in using the footer preference before any product event is captured.

## Plug-and-play setup

1. Copy `.env.example` to `.env.local`.
2. Add `VITE_POSTHOG_KEY` and, when needed, `VITE_POSTHOG_HOST` or `VITE_POSTHOG_ASSET_HOST`.
3. Deploy. Without a key, the PostHog adapter does nothing and no PostHog script is loaded.

The PostHog adapter initializes opted out, disables autocapture, pageview/pageleave capture, and session replay, then receives only explicit allowlisted events after consent. This follows PostHog's opt-out-by-default model while retaining the ability to honor a consent change in the current session.

## Event contract

| Event | Purpose | Properties sent |
| --- | --- | --- |
| `page_view` | Understand broad product navigation | `event_schema: 1` |
| `tumor_model_prepare_started` | Measure deliberate model preparation attempts | `event_schema: 1` |
| `tumor_model_prepare_succeeded` | Find local model readiness success rate | `event_schema: 1` |
| `tumor_model_prepare_failed` | Find setup failures without exposing their cause or source data | `event_schema: 1` |

Never send uploaded images, image content, filenames, medical measurements, AI outputs, free text, account identifiers, or protected health information. Do not enable session replay or autocapture for the tumor workflow without a separately approved privacy review.

## Provider architecture

Product modules call `trackProductEvent()` once. Provider adapters listen to the same allowlisted event stream. PostHog is optional; the existing Clarity adapter can coexist, but configuring one provider is the default recommendation to avoid duplicate analytics.

## Operations

- Treat this integration as product analytics, not clinical or research data collection.
- Configure any required consent-management, retention, IP, and regional data-residency controls in the selected provider before enabling it.
- If a CSP is introduced, permit the configured PostHog asset and ingestion hosts as described in the provider documentation.
