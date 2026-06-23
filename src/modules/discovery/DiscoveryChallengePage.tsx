import { useEffect, useMemo, useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { Panel } from '../../components/Panel'
import { ResultCardPanel } from '../../components/ResultCardPanel'
import { downloadTextAsFile } from '../../core/services/export'
import {
  buildChallengeMarkdown,
  DISCOVERY_CHALLENGES,
  loadDiscoveryBookmarks,
  toggleDiscoveryBookmark,
} from '../../core/services/discovery'
import { buildShareUrl, loadSharedCards, trackWorkbenchEvent } from '../../core/services/workbenchSharing'

export function DiscoveryChallengePage() {
  const { challengeId } = useParams({ from: '/workbench/discover/$challengeId' })
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
  const [bookmarks, setBookmarks] = useState(() => loadDiscoveryBookmarks())
  const [sharedCards, setSharedCards] = useState(() => loadSharedCards().map((record) => record.card))

  useEffect(() => {
    const refresh = () => {
      setBookmarks(loadDiscoveryBookmarks())
      setSharedCards(loadSharedCards().map((record) => record.card))
    }

    refresh()
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [])

  const challenge = useMemo(
    () => DISCOVERY_CHALLENGES.find((item) => item.id === challengeId) ?? null,
    [challengeId],
  )

  useEffect(() => {
    if (challenge) {
      trackWorkbenchEvent('discovery_challenge_opened', {
        challengeId: challenge.id,
        audience: challenge.audience,
      })
    }
  }, [challenge])

  const bookmarked = bookmarks.some((bookmark) => bookmark.kind === 'challenge' && bookmark.id === challengeId)

  const relatedExamples = useMemo(() => {
    if (!challenge) {
      return []
    }

    return sharedCards.filter((card) => {
      const text = `${card.title} ${card.summary} ${card.detail} ${card.tags.join(' ')}`.toLowerCase()
      return challenge.tags.some((tag) => text.includes(tag.toLowerCase()))
    })
  }, [challenge, sharedCards])

  const toggleBookmark = () => {
    if (!challenge) {
      return
    }

    const result = toggleDiscoveryBookmark({
      kind: 'challenge',
      id: challenge.id,
      title: challenge.title,
      summary: challenge.summary,
      path: challenge.path,
      tags: challenge.tags,
    })
    setBookmarks(result.bookmarks)
  }

  const exportChallenge = () => {
    if (!challenge) {
      return
    }

    downloadTextAsFile(`${challenge.id}.md`, buildChallengeMarkdown(challenge), 'text/markdown')
  }

  if (!challenge) {
    return (
      <div className="tool-grid tool-grid-single">
        <Panel title="Challenge Not Found" subtitle="The requested challenge does not exist in the catalog.">
          <p className="muted">Challenge id: {challengeId}</p>
        </Panel>
      </div>
    )
  }

  return (
    <div className="tool-grid tool-grid-single">
      <Panel title={challenge.title} subtitle="A bookmarkable challenge page with reusable prompts and related examples.">
        <div className="edu-note">
          <p className="edu-note-title">Audience</p>
          <p>{challenge.audience}</p>
          <p>{challenge.summary}</p>
          <p>{challenge.prompt}</p>
        </div>

        <div className="compare-stage-actions">
          <button type="button" className="overlay-toggle" onClick={toggleBookmark}>
            {bookmarked ? 'Remove bookmark' : 'Bookmark challenge'}
          </button>
          <button type="button" className="overlay-toggle" onClick={exportChallenge}>
            Export challenge markdown
          </button>
          <button type="button" className="overlay-toggle" onClick={() => window.location.assign(challenge.path)}>
            Open source module
          </button>
        </div>

        <div className="analytics-grid">
          <div className="insight-card">
            <p className="insight-label">Success criteria</p>
            <p className="insight-value">{challenge.successCriteria.length}</p>
          </div>
          <div className="insight-card">
            <p className="insight-label">Related examples</p>
            <p className="insight-value">{relatedExamples.length}</p>
          </div>
          <div className="insight-card">
            <p className="insight-label">Tags</p>
            <p className="insight-value">{challenge.tags.length}</p>
          </div>
          <div className="insight-card">
            <p className="insight-label">Bookmark state</p>
            <p className="insight-value">{bookmarked ? 'saved' : 'available'}</p>
          </div>
        </div>
      </Panel>

      <Panel title="Success Criteria" subtitle="Students can use these checkpoints as a self-check before submitting work.">
        <ul className="discovery-criteria-list">
          {challenge.successCriteria.map((criterion) => (
            <li key={criterion}>{criterion}</li>
          ))}
        </ul>
      </Panel>

      <Panel title="Related Examples" subtitle="These cards are tagged to match the current challenge so students can see good starting points.">
        {relatedExamples.length > 0 ? (
          <div className="discovery-feed-grid">
            {relatedExamples.slice(0, 3).map((card) => {
              const shareUrl = buildShareUrl({ version: 1, card }, `${origin}${card.sourcePath ?? '/workbench/fractals'}`)

              return (
              <ResultCardPanel
                key={card.id}
                card={card}
                shareUrl={shareUrl}
                primaryActionLabel="Open example"
                secondaryActionLabel="Open source module"
                onPrimaryAction={() => window.location.assign(shareUrl)}
                onSecondaryAction={() => window.location.assign(card.sourcePath ?? '/workbench/fractals')}
              />
              )
            })}
          </div>
        ) : (
          <p className="muted">No tagged examples yet. Save a matching result to seed this challenge page.</p>
        )}
      </Panel>

      <Panel title="Sharing Note" subtitle="Keep challenge language precise and classroom-friendly.">
        <div className="edu-note">
          <p className="edu-note-title">Teacher guidance</p>
          <p>Use the prompt as a launch point, not a verdict. Ask students to point to evidence before they explain what it means.</p>
        </div>
      </Panel>
    </div>
  )
}
