import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Panel } from '../../components/Panel'
import { useEducatorMode } from '../../core/hooks/useEducatorMode'
import { workbenchModules } from '../../core/plugins/modules'
import { loadDiscoveryBookmarks } from '../../core/services/discovery'
import { buildShareUrl, loadSharedCards, loadWorkbenchEvents, trackWorkbenchEvent } from '../../core/services/workbenchSharing'

type AudienceRoute = {
  id: 'student' | 'educator' | 'researcher'
  title: string
  eyebrow: string
  path: string
  summary: string
  outcomes: string[]
}

const audienceRoutes: AudienceRoute[] = [
  {
    id: 'student',
    title: 'Students',
    eyebrow: 'Explore by doing',
    path: '/workbench/fractals',
    summary: 'Start with an interactive canvas, see the pattern change immediately, and learn by making small moves.',
    outcomes: ['Immediate visual feedback', 'Low-friction first success', 'Safe, guided experimentation'],
  },
  {
    id: 'educator',
    title: 'Educators',
    eyebrow: 'Teach with structure',
    path: '/workbench/discover',
    summary: 'Use examples, challenge prompts, and moderated sharing to turn the workbench into a classroom-ready flow.',
    outcomes: ['Clear classroom entry points', 'Discussion-ready evidence', 'Bookmarks and challenge pages'],
  },
  {
    id: 'researcher',
    title: 'Researchers',
    eyebrow: 'Move with rigor',
    path: '/workbench/runs',
    summary: 'Track runs, compare methods, and keep every artifact easy to revisit, cite, and share.',
    outcomes: ['Reproducible workflows', 'Comparative run history', 'Shareable result cards'],
  },
]

const launchSteps = [
  'Choose the audience path that matches your goal.',
  'Open one module and run a fast first experiment.',
  'Save, share, or compare the result without leaving the workbench.',
]

export function HomePage() {
  const { educatorMode } = useEducatorMode()
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
  const [sharedCards, setSharedCards] = useState(() => loadSharedCards().map((record) => record.card))
  const [bookmarks, setBookmarks] = useState(() => loadDiscoveryBookmarks())
  const [events, setEvents] = useState(() => loadWorkbenchEvents())

  useEffect(() => {
    const refresh = () => {
      setSharedCards(loadSharedCards().map((record) => record.card))
      setBookmarks(loadDiscoveryBookmarks())
      setEvents(loadWorkbenchEvents())
    }

    trackWorkbenchEvent('home_page_viewed', {
      sharedCards: sharedCards.length,
      bookmarks: bookmarks.length,
      educatorMode,
    })
    refresh()
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const featuredCard = sharedCards[0] ?? null
  const featuredShareUrl = useMemo(() => {
    if (!featuredCard) {
      return '/workbench/fractals'
    }

    return buildShareUrl({ version: 1, card: featuredCard }, `${origin}${featuredCard.sourcePath ?? '/workbench/fractals'}`)
  }, [featuredCard, origin])

  const recentBookmarks = useMemo(() => bookmarks.slice(0, 3), [bookmarks])
  const recentExamples = useMemo(() => sharedCards.slice(0, 3), [sharedCards])
  const recentEvents = useMemo(() => events.slice(0, 4), [events])

  const eventCounts = useMemo(() => {
    return events.reduce<Record<string, number>>((acc, event) => {
      acc[event.name] = (acc[event.name] ?? 0) + 1
      return acc
    }, {})
  }, [events])

  const topSignals = useMemo(
    () =>
      Object.entries(eventCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3),
    [eventCounts],
  )

  const moduleCount = workbenchModules.length
  const sharedCount = sharedCards.length
  const bookmarkCount = bookmarks.length

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <div className="home-hero-kicker">
            <span className="home-kicker-badge">Fractals Web</span>
            <span className="home-kicker-text">A premium launchpad for students, educators, and researchers</span>
          </div>

          <h1>Turn complex visual science into a calm, intuitive first step.</h1>

          <p className="home-lead">
            Start with one obvious action, jump straight into an interactive module, and keep the entire experience
            portable through shared examples, bookmarks, and run history.
          </p>

          <div className="home-cta-row">
            <Link to="/workbench/fractals" className="home-cta home-cta-primary">
              Start exploring
            </Link>
            <Link to="/workbench/discover" className="home-cta home-cta-secondary">
              Browse examples
            </Link>
            <Link to="/workbench/runs" className="home-cta home-cta-secondary">
              Review runs
            </Link>
          </div>

          <div className="home-stat-strip" aria-label="Homepage overview">
            <div className="home-stat-card">
              <strong>{moduleCount}</strong>
              <span>modules ready to launch</span>
            </div>
            <div className="home-stat-card">
              <strong>{sharedCount}</strong>
              <span>shared examples saved locally</span>
            </div>
            <div className="home-stat-card">
              <strong>{bookmarkCount}</strong>
              <span>bookmarks and challenge anchors</span>
            </div>
          </div>

          <div className="home-launch-guide">
            <p className="edu-note-title">Quick start</p>
            <ol className="home-launch-steps">
              {launchSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>

        <aside className="home-hero-stage" aria-label="Featured workbench preview">
          <div className="home-stage-surface">
            <div className="home-stage-header">
              <div>
                <p className="home-stage-eyebrow">Today’s best next step</p>
                <h2>{featuredCard ? featuredCard.title : 'Fractal Generator'}</h2>
              </div>
              <span className="home-stage-badge">{featuredCard ? featuredCard.kind.replace(/-/g, ' ') : 'start here'}</span>
            </div>

            <p className="home-stage-summary">
              {featuredCard
                ? featuredCard.summary
                : 'Open the most visual module first, then use the discovery feed to branch into classroom and research workflows.'}
            </p>

            {featuredCard ? (
              <div className="home-stage-metrics" aria-label="Featured example metrics">
                {featuredCard.metrics.slice(0, 4).map((metric) => (
                  <div key={`${featuredCard.id}-${metric.label}`} className="home-stage-metric">
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                    {metric.detail ? <small>{metric.detail}</small> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="home-stage-prompt">
                <p className="edu-note-title">Why this layout works</p>
                <p>The page opens with one obvious action, then reveals the rest of the system only when it adds value.</p>
              </div>
            )}

            <div className="home-stage-actions">
              <a href={featuredShareUrl} className="home-stage-button">
                Open featured example
              </a>
              <Link to="/workbench/discover" className="home-stage-button home-stage-button-secondary">
                Explore discovery
              </Link>
            </div>
          </div>

          <div className="home-stage-trail">
            <div className="home-trail-card">
              <span>Most active signals</span>
              <strong>{topSignals.length ? topSignals.map(([name, count]) => `${name} · ${count}`).join('  •  ') : 'No activity yet'}</strong>
            </div>
            <div className="home-trail-card">
              <span>Launch order</span>
              <strong>Fractals → Discovery → Compare → Runs</strong>
            </div>
          </div>
        </aside>
      </section>

      <Panel title="Choose your path" subtitle="The homepage should answer the only question that matters first: what do you want to do right now?">
        <div className="home-route-grid">
          {audienceRoutes.map((route) => (
            <article key={route.id} className="home-route-card" data-audience={route.id}>
              <div className="home-route-header">
                <div>
                  <p className="home-route-eyebrow">{route.eyebrow}</p>
                  <h3>{route.title}</h3>
                </div>
                <span className="home-route-dot" aria-hidden="true" />
              </div>
              <p className="home-route-summary">{route.summary}</p>
              <ul className="home-route-list">
                {route.outcomes.map((outcome) => (
                  <li key={outcome}>{outcome}</li>
                ))}
              </ul>
              <Link to={route.path} className="home-route-link">
                Open {route.title.toLowerCase()}
              </Link>
            </article>
          ))}
        </div>
      </Panel>

      <Panel title="Launch modules" subtitle="Every module is discoverable from the registry, so this stays generic as the app grows.">
        <div className="home-module-launcher">
          {workbenchModules.map((mod) => (
            <Link key={mod.id} to={mod.path} className="home-launch-card" data-module-id={mod.id}>
              <div className="home-module-card-top">
                <span className="home-module-accent" aria-hidden="true" />
                <span className="home-module-id">{mod.id.replace(/-/g, ' ')}</span>
              </div>
              <strong>{mod.title}</strong>
              <p>{mod.tagline}</p>
              <span className="home-module-action">Open module</span>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel title="Recent proof" subtitle="Useful homepage surfaces should feel alive without becoming noisy.">
        <div className="home-proof-grid">
          <div className="home-proof-column">
            <div className="home-proof-heading">
              <h3>Shared examples</h3>
              <span>{sharedCount} saved</span>
            </div>
            {recentExamples.length ? (
              <div className="home-proof-list">
                {recentExamples.map((card) => (
                  <a
                    key={card.id}
                    href={buildShareUrl({ version: 1, card }, `${origin}${card.sourcePath ?? '/workbench/fractals'}`)}
                    className="home-proof-card"
                  >
                    <strong>{card.title}</strong>
                    <span>{card.summary}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="muted">No shared examples yet. Run a module and save the result to seed this space.</p>
            )}
          </div>

          <div className="home-proof-column">
            <div className="home-proof-heading">
              <h3>Bookmarks</h3>
              <span>{bookmarkCount} saved</span>
            </div>
            {recentBookmarks.length ? (
              <div className="home-proof-list">
                {recentBookmarks.map((bookmark) => (
                  <a key={`${bookmark.kind}-${bookmark.id}`} href={bookmark.path} className="home-proof-card">
                    <strong>{bookmark.title}</strong>
                    <span>{bookmark.summary}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="muted">Bookmarks will appear here after you save an example or challenge page.</p>
            )}
          </div>

          <div className="home-proof-column">
            <div className="home-proof-heading">
              <h3>Recent activity</h3>
              <span>{recentEvents.length} events</span>
            </div>
            {recentEvents.length ? (
              <div className="home-proof-list">
                {recentEvents.map((event) => (
                  <div key={event.id} className="home-proof-card home-proof-card-static">
                    <strong>{event.name.replace(/_/g, ' ')}</strong>
                    <span>{new Date(event.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">Once you interact with the workbench, activity signals will appear here.</p>
            )}
          </div>
        </div>
      </Panel>

      <Panel title="Why this homepage stays strong" subtitle="The page should remain easy to extend even as more modules, audiences, and research flows arrive.">
        <div className="home-principles-grid">
          <div className="home-principle-card">
            <strong>Registry driven</strong>
            <p>Module cards are sourced from the shared workbench registry, so new tools appear without bespoke homepage logic.</p>
          </div>
          <div className="home-principle-card">
            <strong>Audience first</strong>
            <p>Students, educators, and researchers each get a clear next step instead of one generic wall of links.</p>
          </div>
          <div className="home-principle-card">
            <strong>Evidence rich</strong>
            <p>Shared examples, bookmarks, and event signals make the homepage feel useful on repeat visits, not just first load.</p>
          </div>
        </div>
      </Panel>
    </div>
  )
}
