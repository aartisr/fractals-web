import { Link } from '@tanstack/react-router'
import { Panel } from './Panel'

type GuidedKickoffAction = {
  label: string
  to: string
  description?: string
}

type GuidedKickoffPanelProps = {
  title: string
  subtitle: string
  steps: string[]
  actions: GuidedKickoffAction[]
  note?: string
}

export function GuidedKickoffPanel({ title, subtitle, steps, actions, note }: GuidedKickoffPanelProps) {
  return (
    <div className="guided-kickoff-panel">
      <Panel title={title} subtitle={subtitle}>
        <div className="guided-kickoff-grid">
          <div className="guided-kickoff-steps">
            <p className="edu-note-title">Start here</p>
            <ol className="home-steps">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {note ? <p className="muted">{note}</p> : null}
          </div>
          <div className="guided-kickoff-actions">
            {actions.map((action) => (
              <Link key={action.to} to={action.to} className="home-module-card">
                <strong>{action.label}</strong>
                {action.description ? <span>{action.description}</span> : null}
              </Link>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  )
}
