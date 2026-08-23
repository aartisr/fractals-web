# Privacy-safe product analytics

Fractals Web is analytics-free by default. When analytics is configured, visitors must explicitly opt in using the footer preference before any product event is captured.

## Setup

1. Choose one provider unless there is a documented reason to operate both.
2. For local development, copy `.env.example` to `.env.local`. For production, add browser-safe values in the Vercel project environment and redeploy.
3. Set `VITE_CLARITY_PROJECT_ID` for Microsoft Clarity, or set `VITE_POSTHOG_KEY` for PostHog. Use `VITE_POSTHOG_HOST` only for a non-default ingestion host; `VITE_POSTHOG_ASSET_HOST` is optional for a reverse proxy or self-hosted assets.
4. Keep provider administration keys, API tokens, and exports out of Vite environment variables. Vite exposes `VITE_*` values to every browser build.
5. Verify that the footer consent control works before enabling production traffic.

Without the relevant value, that provider adapter remains inert and its script is not loaded.

## Provider behavior

Microsoft Clarity is injected only after a visitor grants analytics consent. It receives only the allowlisted product-event names in the event contract below.

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

Product modules call `trackProductEvent()` once. Provider adapters listen to the same allowlisted event stream. PostHog and Clarity are optional and can coexist, but configuring one provider is the default recommendation to avoid duplicate analytics.

## Operations

- Treat this integration as product analytics, not clinical or research data collection.
- Configure any required consent-management, retention, IP, and regional data-residency controls in the selected provider before enabling it.
- If a CSP is introduced, permit the configured PostHog asset and ingestion hosts as described in the provider documentation.
- For Clarity, permit `https://www.clarity.ms` in the CSP only when Clarity is configured.
