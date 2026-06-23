import { useMemo, useState } from 'react'
import { downloadTextAsFile } from '../core/services/export'
import type { WorkbenchResultCard } from '../core/services/workbenchSharing'
import { buildPeerComparisonMarkdown } from '../core/services/collaboration'

type PeerComparisonPanelProps = {
  cards: WorkbenchResultCard[]
}

export function PeerComparisonPanel({ cards }: PeerComparisonPanelProps) {
  const [leftId, setLeftId] = useState(cards[0]?.id ?? '')
  const [rightId, setRightId] = useState(cards[1]?.id ?? cards[0]?.id ?? '')

  const left = useMemo(() => cards.find((card) => card.id === leftId) ?? cards[0] ?? null, [cards, leftId])
  const right = useMemo(() => cards.find((card) => card.id === rightId) ?? cards[1] ?? cards[0] ?? null, [cards, rightId])

  const comparison = useMemo(() => {
    if (!left || !right) {
      return ''
    }
    return buildPeerComparisonMarkdown(left, right)
  }, [left, right])

  const exportComparison = () => {
    if (!comparison) {
      return
    }

    downloadTextAsFile('peer-comparison.md', comparison, 'text/markdown')
  }

  if (cards.length < 2) {
    return <p className="muted">Add at least two shared artifacts to compare your answer to a classmate's workflow.</p>
  }

  return (
    <div className="collaboration-panel">
      <section className="collaboration-section">
        <div className="collaboration-header">
          <h3>Compare With A Classmate</h3>
          <span className="muted">Select two shared artifacts and inspect the difference in method and evidence.</span>
        </div>
        <div className="form-grid collaboration-form-grid">
          <label className="field">
            <span>Left artifact</span>
            <select value={left?.id ?? ''} onChange={(event) => setLeftId(event.target.value)}>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Right artifact</span>
            <select value={right?.id ?? ''} onChange={(event) => setRightId(event.target.value)}>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" className="overlay-toggle" onClick={exportComparison}>
          Export peer comparison
        </button>
      </section>

      <section className="collaboration-section">
        <div className="edu-note">
          <p className="edu-note-title">Coach prompt</p>
          <p>What stayed the same across both answers, what changed, and which evidence best supports the stronger claim?</p>
        </div>
        <pre className="result-card-text">{comparison || 'Choose two artifacts to generate a comparison.'}</pre>
      </section>
    </div>
  )
}
