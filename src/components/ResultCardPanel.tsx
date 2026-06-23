import type { WorkbenchResultCard } from '../core/services/workbenchSharing'

interface ResultCardPanelProps {
  card: WorkbenchResultCard
  shareUrl?: string
  cardText?: string
  primaryActionLabel?: string
  secondaryActionLabel?: string
  onPrimaryAction?: () => void
  onSecondaryAction?: () => void
  onCopyText?: () => void
  onCopyLink?: () => void
}

export function ResultCardPanel({
  card,
  shareUrl,
  cardText,
  primaryActionLabel = 'Save example',
  secondaryActionLabel = 'Remix',
  onPrimaryAction,
  onSecondaryAction,
  onCopyText,
  onCopyLink,
}: ResultCardPanelProps) {
  return (
    <div className="result-card">
      <div className="result-card-header">
        <div>
          <p className="result-card-kicker">{card.kind.replace(/-/g, ' ')}</p>
          <h3 className="result-card-title">{card.title}</h3>
        </div>
        <span className="result-card-date">{new Date(card.createdAt).toLocaleString()}</span>
      </div>

      <p className="result-card-summary">{card.summary}</p>
      <p className="result-card-detail">{card.detail}</p>

      <div className="result-card-metrics" aria-label="Result metrics">
        {card.metrics.map((metric) => (
          <div key={`${card.id}-${metric.label}`} className="result-card-metric">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            {metric.detail ? <small>{metric.detail}</small> : null}
          </div>
        ))}
      </div>

      <div className="result-card-tags" aria-label="Result tags">
        {card.tags.map((tag) => (
          <span key={`${card.id}-${tag}`} className="edu-chip">
            {tag}
          </span>
        ))}
      </div>

      <div className="edu-note result-card-note">
        <p className="edu-note-title">Safety note</p>
        <p>{card.safetyNote}</p>
      </div>

      {shareUrl ? (
        <div className="result-card-share">
          <label className="field result-card-share-link">
            <span>Share link</span>
            <input readOnly value={shareUrl} />
          </label>
        </div>
      ) : null}

      <div className="result-card-actions">
        {onPrimaryAction ? (
          <button type="button" className="overlay-toggle" onClick={onPrimaryAction}>
            {primaryActionLabel}
          </button>
        ) : null}
        {onSecondaryAction ? (
          <button type="button" className="overlay-toggle" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </button>
        ) : null}
        {onCopyText ? (
          <button type="button" className="overlay-toggle" onClick={onCopyText}>
            Copy card text
          </button>
        ) : null}
        {onCopyLink ? (
          <button type="button" className="overlay-toggle" onClick={onCopyLink}>
            Copy link
          </button>
        ) : null}
      </div>

      {cardText ? <pre className="result-card-text">{cardText}</pre> : null}
    </div>
  )
}

