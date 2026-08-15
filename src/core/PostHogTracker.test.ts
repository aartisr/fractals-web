import assert from 'node:assert/strict'
import test from 'node:test'
import { getPostHogAssetHost } from './services/posthog.ts'

test('PostHog asset host follows the hosted convention and permits a reverse proxy', () => {
  assert.equal(getPostHogAssetHost('https://us.i.posthog.com'), 'https://us-assets.i.posthog.com')
  assert.equal(getPostHogAssetHost('https://eu.i.posthog.com/'), 'https://eu-assets.i.posthog.com')
  assert.equal(getPostHogAssetHost('https://analytics.example.org', 'https://cdn.example.org/'), 'https://cdn.example.org')
})
