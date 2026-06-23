import assert from 'node:assert/strict'
import test from 'node:test'
import { setCollaborationModeration } from './collaboration.ts'
import { clearDiscoveryBookmarks, buildDiscoveryAnalytics, buildDiscoveryFeed, toggleDiscoveryBookmark } from './discovery.ts'
import { clearWorkbenchEvents, trackWorkbenchEvent, type WorkbenchResultCard } from './workbenchSharing.ts'

const makeCard = (id: string): WorkbenchResultCard => ({
  id,
  kind: 'fractals',
  title: `Card ${id}`,
  summary: 'Summary',
  detail: 'Detail',
  createdAt: '2026-01-01T00:00:00.000Z',
  safetyNote: 'Safe to share.',
  tags: ['fractals', 'zoom'],
  metrics: [{ label: 'Size', value: '1280×720' }],
})

test('tracks bookmarks and analytics', () => {
  clearDiscoveryBookmarks()
  clearWorkbenchEvents()

  const card = makeCard('card-1')
  setCollaborationModeration(
    { kind: 'card', id: card.id, title: card.title, module: card.kind },
    { status: 'approved', updatedBy: 'Teacher', note: 'Approved for public sharing.' },
  )

  const feed = buildDiscoveryFeed([card])
  assert.equal(feed.some((item) => item.kind === 'example' && item.id === card.id), true)

  const bookmarkResult = toggleDiscoveryBookmark({
    kind: 'example',
    id: card.id,
    title: card.title,
    summary: card.summary,
    path: '/workbench/fractals',
    tags: card.tags,
  })
  assert.equal(bookmarkResult.bookmarked, true)
  assert.equal(bookmarkResult.bookmarks.length, 1)

  trackWorkbenchEvent('module_viewed', { module: 'discover', path: '/workbench/discover' })
  trackWorkbenchEvent('discovery_challenge_opened', { challengeId: 'fractals-self-similarity' })

  const analytics = buildDiscoveryAnalytics({
    cards: [card],
    bookmarks: bookmarkResult.bookmarks,
  })

  assert.equal(analytics.activeBookmarks, 1)
  assert.equal(analytics.exampleBookmarks, 1)
  assert.equal(analytics.challengeBookmarks, 0)
  assert.equal(analytics.challengeViews, 1)
  assert.equal(analytics.moduleViews.discover, 1)
  assert.equal(analytics.moderationCounts.approved, 1)
})
