import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Panel } from '../../components/Panel'
import { ResultCardPanel } from '../../components/ResultCardPanel'
import { useEducatorMode } from '../../core/hooks/useEducatorMode'
import { downloadTextAsFile } from '../../core/services/export'
import {
  buildDiscoveryAnalytics,
  buildDiscoveryFeed,
  buildDiscoveryFeedMarkdown,
  DISCOVERY_CHALLENGES,
  loadDiscoveryBookmarks,
  toggleDiscoveryBookmark,
  type DiscoveryBookmark,
  type DiscoveryFeedItem,
} from '../../core/services/discovery'
import { loadCollaborationModeration } from '../../core/services/collaboration'
import { loadSharedCards } from '../../core/services/workbenchSharing'
import { buildShareUrl } from '../../core/services/workbenchSharing'
import { trackWorkbenchEvent } from '../../core/services/workbenchSharing'

const bookmarkLabel = (bookmark: DiscoveryBookmark) => `${bookmark.title} · ${bookmark.kind}`

export function DiscoveryPage() {
  const { educatorMode } = useEducatorMode()
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
  const [sharedCards, setSharedCards] = useState(() => loadSharedCards().map((record) => record.card))
  const [bookmarks, setBookmarks] = useState(() => loadDiscoveryBookmarks())
  const [, setAnalyticsRefreshTick] = useState(0)

  useEffect(() => {
    const refresh = () => {
      setSharedCards(loadSharedCards().map((record) => record.card))
      setBookmarks(loadDiscoveryBookmarks())
    }

    refresh()
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [])

  useEffect(() => {
    trackWorkbenchEvent('discovery_page_viewed', {
      examples: sharedCards.length,
      bookmarks: bookmarks.length,
      challenges: DISCOVERY_CHALLENGES.length,
    })
    setAnalyticsRefreshTick((value) => value + 1)
  }, [])

  const feed = useMemo(() => buildDiscoveryFeed(sharedCards), [sharedCards])
  const analytics = useMemo(
    () => buildDiscoveryAnalytics({ cards: sharedCards, bookmarks }),
    [bookmarks, sharedCards],
  )

  const visibleExamples = useMemo(
    () =>
      feed.filter((item) => {
        if (item.kind !== 'example') {
          return false
        }
        const moderation = loadCollaborationModeration({
          kind: 'card',
          id: item.id,
          title: item.title,
          module: item.card.kind,
        })
        return moderation.status !== 'hidden' || educatorMode
    }),
    [educatorMode, feed],
  )

  const exampleItems = visibleExamples as Array<Extract<DiscoveryFeedItem, { kind: 'example' }>>

  const challengeItems = feed.filter((item): item is Extract<DiscoveryFeedItem, { kind: 'challenge' }> => item.kind === 'challenge')

  const bookmarkedExampleIds = useMemo(
    () =>
      new Set(
        bookmarks
          .filter((bookmark) => bookmark.kind === 'example')
          .map((bookmark) => bookmark.id),
      ),
    [bookmarks],
  )

  const bookmarkedChallengeIds = useMemo(
    () =>
      new Set(
        bookmarks
          .filter((bookmark) => bookmark.kind === 'challenge')
          .map((bookmark) => bookmark.id),
      ),
    [bookmarks],
  )

  const exportFeed = () => {
    downloadTextAsFile('discovery-feed.md', buildDiscoveryFeedMarkdown(feed), 'text/markdown')
    trackWorkbenchEvent('discovery_feed_exported', {
      examples: visibleExamples.length,
      challenges: challengeItems.length,
    })
  }

  const updateBookmark = (item: DiscoveryFeedItem) => {
    const payload =
      item.kind === 'example'
        ? {
            kind: 'example' as const,
            id: item.id,
            title: item.title,
            summary: item.summary,
            path: buildShareUrl({ version: 1, card: item.card }, `${origin}${item.card.sourcePath ?? '/workbench/fractals'}`),
            tags: item.tags,
          }
        : {
            kind: 'challenge' as const,
            id: item.id,
            title: item.title,
            summary: item.summary,
            path: item.path,
            tags: item.tags,
          }

    const result = toggleDiscoveryBookmark(payload)
    setBookmarks(result.bookmarks)
  }

  const removeBookmark = (bookmark: DiscoveryBookmark) => {
    const result = toggleDiscoveryBookmark({
      kind: bookmark.kind,
      id: bookmark.id,
      title: bookmark.title,
      summary: bookmark.summary,
      path: bookmark.path,
      tags: bookmark.tags,
    })
    setBookmarks(result.bookmarks)
  }

  const bookmarkSummary = bookmarks.length ? `${bookmarks.length} saved` : 'No bookmarks yet'

  return (
    <div className="tool-grid tool-grid-single">
      <Panel title="Discovery Feed" subtitle="Public examples, challenge prompts, and a trust-first route into the workbench.">
        <div className="edu-note">
          <p className="edu-note-title">What makes this feed useful</p>
          <p>Examples are bookmarkable, challenge pages are shareable, and moderation keeps hidden items out of the open surface.</p>
          <p>{bookmarkSummary} · {analytics.totalEvents} tracked interactions · {analytics.exportEvents} exports</p>
        </div>

        <div className="compare-stage-actions">
          <button type="button" className="overlay-toggle" onClick={exportFeed}>
            Export feed markdown
          </button>
          <Link to="/workbench/fractals" className="overlay-toggle">
            Start exploring
          </Link>
        </div>

        <div className="discovery-feed-grid">
          {exampleItems.length > 0 ? (
            exampleItems.map((item) => {
              const bookmarked = bookmarkedExampleIds.has(item.id)
              const moderation = loadCollaborationModeration({
                kind: 'card',
                id: item.id,
                title: item.title,
                module: item.card.kind,
              })
              const shareUrl = buildShareUrl({ version: 1, card: item.card }, `${origin}${item.card.sourcePath ?? '/workbench/fractals'}`)

              return (
                <div key={item.id} className="discovery-feed-item">
                  <ResultCardPanel
                    card={item.card}
                    shareUrl={shareUrl}
                    primaryActionLabel="Open example"
                    secondaryActionLabel={bookmarked ? 'Remove bookmark' : 'Bookmark example'}
                    onPrimaryAction={() => window.location.assign(shareUrl)}
                    onSecondaryAction={() => updateBookmark(item)}
                  />
                  <div className="compare-stage-actions">
                    <span className={`collaboration-status is-${moderation.status}`}>{moderation.status}</span>
                    <span className="edu-chip">{item.audience.join(' · ')}</span>
                  </div>
                </div>
              )
            })
          ) : (
            <p className="muted">No approved examples are available yet. Save a result in a module to seed the feed.</p>
          )}
        </div>
      </Panel>

      <Panel title="Challenge Pages" subtitle="Bookmark a prompt, open the source module, and return to it later with the same question.">
        <div className="discovery-feed-grid">
          {challengeItems.map((item) => {
            const bookmarked = bookmarkedChallengeIds.has(item.id)

            return (
              <article key={item.id} className="discovery-challenge-card">
                <div className="collaboration-header">
                  <h3>{item.title}</h3>
                  <span className="edu-chip">{item.audience.join(' · ')}</span>
                </div>
                <p className="result-card-summary">{item.summary}</p>
                <p className="result-card-detail">{item.detail}</p>
                <ul className="discovery-criteria-list">
                  {item.challenge.successCriteria.map((criterion) => (
                    <li key={`${item.id}-${criterion}`}>{criterion}</li>
                  ))}
                </ul>
                <div className="compare-stage-actions">
                  <Link to="/workbench/discover/$challengeId" params={{ challengeId: item.id }} className="overlay-toggle">
                    Open challenge page
                  </Link>
                  <button type="button" className="overlay-toggle" onClick={() => updateBookmark(item)}>
                    {bookmarked ? 'Remove bookmark' : 'Bookmark challenge'}
                  </button>
                </div>
                <div className="edu-note">
                  <p className="edu-note-title">Launch path</p>
                  <p>{item.path}</p>
                </div>
              </article>
            )
          })}
        </div>
      </Panel>

      <Panel title="Bookmarks" subtitle="Keep examples and challenges close for demos, portfolios, or next-step exploration.">
        {bookmarks.length > 0 ? (
          <ul className="discovery-bookmark-list">
            {bookmarks.map((bookmark) => (
              <li key={`${bookmark.kind}-${bookmark.id}`} className="discovery-bookmark-item">
                <div>
                  <strong>{bookmarkLabel(bookmark)}</strong>
                  <p>{bookmark.summary}</p>
                </div>
                <div className="compare-stage-actions">
                  <button type="button" className="overlay-toggle" onClick={() => window.location.assign(bookmark.path)}>
                    Open
                  </button>
                  <button type="button" className="overlay-toggle" onClick={() => removeBookmark(bookmark)}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Bookmarks will appear here after you save an example or challenge page.</p>
        )}
      </Panel>

      <Panel title="Usage Analytics" subtitle="A lightweight funnel view that shows discovery, bookmarking, and export behavior.">
        <div className="analytics-grid">
          <div className="insight-card">
            <p className="insight-label">Feed views</p>
            <p className="insight-value">{analytics.moduleViews.discover ?? 0}</p>
          </div>
          <div className="insight-card">
            <p className="insight-label">Challenge opens</p>
            <p className="insight-value">{analytics.challengeViews}</p>
          </div>
          <div className="insight-card">
            <p className="insight-label">Bookmarks</p>
            <p className="insight-value">{analytics.activeBookmarks}</p>
          </div>
          <div className="insight-card">
            <p className="insight-label">Exports</p>
            <p className="insight-value">{analytics.exportEvents}</p>
          </div>
        </div>
        <div className="edu-note">
          <p className="edu-note-title">Top interactions</p>
          {analytics.topEvents.length > 0 ? (
            <ul className="discovery-criteria-list">
              {analytics.topEvents.map((event) => (
                <li key={event.name}>
                  {event.name}: {event.count}
                </li>
              ))}
            </ul>
          ) : (
            <p>No event history yet. Browse a few modules to build the funnel.</p>
          )}
        </div>
      </Panel>

      <Panel title="Trust And Privacy" subtitle="Public sharing is moderated, and classroom/research data stays easy to audit.">
        <div className="analytics-grid">
          <div className="insight-card">
            <p className="insight-label">Approved</p>
            <p className="insight-value">{analytics.moderationCounts.approved}</p>
          </div>
          <div className="insight-card">
            <p className="insight-label">Pending</p>
            <p className="insight-value">{analytics.moderationCounts.pending}</p>
          </div>
          <div className="insight-card">
            <p className="insight-label">Hidden</p>
            <p className="insight-value">{analytics.moderationCounts.hidden}</p>
          </div>
          <div className="insight-card">
            <p className="insight-label">Bookmark types</p>
            <p className="insight-value">{analytics.exampleBookmarks} examples / {analytics.challengeBookmarks} challenges</p>
          </div>
        </div>
        <div className="edu-note">
          <p className="edu-note-title">Moderator guidance</p>
          <p>Only approved items should circulate publicly. Hidden cards remain visible only to moderators so the classroom can stay safe.</p>
        </div>
        {educatorMode ? <p className="muted">Educator mode is on, so moderation controls remain visible across shared surfaces.</p> : null}
      </Panel>
    </div>
  )
}
