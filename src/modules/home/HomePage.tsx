import { Link } from '@tanstack/react-router'
import { Panel } from '../../components/Panel'
import { DISCOVERY_CHALLENGES } from '../../core/services/discovery'
import { loadSharedCards, loadWorkbenchEvents, trackWorkbenchEvent, type WorkbenchShareKind } from '../../core/services/workbenchSharing'
import { HomeFractalPreview } from './HomeFractalPreview'

type HomeDestination =
  | '/workbench/fractals'
  | '/workbench/box-count'
  | '/workbench/compare'
  | '/workbench/discover'
  | '/workbench/tumor-detection'
  | '/workbench/runs'

const moduleDestinations: Record<WorkbenchShareKind | 'discover' | 'runs', { to: HomeDestination; label: string }> = {
  fractals: { to: '/workbench/fractals', label: 'Fractal studio' },
  'box-count': { to: '/workbench/box-count', label: 'Box Counter' },
  compare: { to: '/workbench/compare', label: 'Image Compare' },
  'tumor-detection': { to: '/workbench/tumor-detection', label: 'Evidence workflow' },
  discover: { to: '/workbench/discover', label: 'Discovery' },
  runs: { to: '/workbench/runs', label: 'Saved runs' },
}

const getReturnThread = () => {
  const latestCard = loadSharedCards()[0]?.card
  if (latestCard) {
    const destination = moduleDestinations[latestCard.kind]
    return {
      to: destination.to,
      eyebrow: 'Your latest saved thread',
      title: latestCard.title,
      description: `Return to ${destination.label} and build from the result you chose to keep.`,
    }
  }

  const lastModule = loadWorkbenchEvents()
    .find((event) => event.name === 'module_viewed' && typeof event.payload?.module === 'string' && event.payload.module in moduleDestinations)
    ?.payload?.module as keyof typeof moduleDestinations | undefined

  if (!lastModule) return null
  const destination = moduleDestinations[lastModule]
  return {
    to: destination.to,
    eyebrow: 'Pick up your thread',
    title: `Continue in ${destination.label}`,
    description: 'Your recent exploration is still here in this browser.',
  }
}

const getDailyPrompt = () => {
  const day = Math.floor(Date.now() / 86_400_000)
  return DISCOVERY_CHALLENGES[day % DISCOVERY_CHALLENGES.length]
}

const nextSteps = [
  {
    title: 'Create a fractal',
    description: 'Choose a pattern and explore it directly on the canvas.',
    to: '/workbench/fractals',
    action: 'Open studio',
    primary: true,
  },
  {
    title: 'Measure an image',
    description: 'Estimate fractal dimension from a focused region of interest.',
    to: '/workbench/box-count',
    action: 'Open measurement',
  },
  {
    title: 'Learn from examples',
    description: 'Browse one curated prompt at a time.',
    to: '/workbench/discover',
    action: 'Browse examples',
  },
]

export function HomePage() {
  const returnThread = getReturnThread()
  const dailyPrompt = getDailyPrompt()

  return (
    <div className="home-page home-page-calm">
      <section className="home-calm-hero" aria-labelledby="home-title">
        <div className="home-calm-hero-copy">
          <p className="home-calm-eyebrow">Nexus Fractal Lab</p>
          <h1 id="home-title">Explore complexity, one clear step at a time.</h1>
          <p>
            Make a fractal, follow what catches your eye, and keep only the result you want to return to.
          </p>
          <Link to="/workbench/fractals" className="home-calm-primary">
            Start exploring <span aria-hidden="true">→</span>
          </Link>
          <span className="home-calm-hint">No account. No setup. Your work stays in this browser.</span>
        </div>
        <HomeFractalPreview />
      </section>

      {returnThread ? (
        <section className="home-return" aria-labelledby="return-thread-title">
          <div>
            <p>{returnThread.eyebrow}</p>
            <h2 id="return-thread-title">{returnThread.title}</h2>
            <span>{returnThread.description}</span>
          </div>
          <Link
            to={returnThread.to}
            className="home-return-action"
            onClick={() => trackWorkbenchEvent('home_return_thread_resumed', { destination: returnThread.to })}
          >
            Continue <span aria-hidden="true">→</span>
          </Link>
        </section>
      ) : null}

      <Panel title="Choose a starting point" subtitle="You can change direction at any time.">
        <div className="home-calm-choices">
          {nextSteps.map((step) => (
            <Link
              key={step.to}
              to={step.to}
              className={`home-calm-choice${step.primary ? ' is-primary' : ''}`}
            >
              <strong>{step.title}</strong>
              <span>{step.description}</span>
              <em>{step.action} <span aria-hidden="true">→</span></em>
            </Link>
          ))}
        </div>
      </Panel>

      <details className="home-calm-more">
        <summary>One more idea for today</summary>
        <div>
          <Link to="/workbench/discover/$challengeId" params={{ challengeId: dailyPrompt.id }}>
            Today’s prompt: {dailyPrompt.title}
          </Link>
          <Link to="/workbench/compare">Compare two visual methods</Link>
          <Link to="/workbench/tumor-detection">Inspect a medical-image demonstration</Link>
          <Link to="/workbench/runs">Review saved runs</Link>
        </div>
      </details>
    </div>
  )
}
