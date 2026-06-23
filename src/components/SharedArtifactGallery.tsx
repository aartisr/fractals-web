import type { WorkbenchResultCard, WorkbenchShareKind } from '../core/services/workbenchSharing'
import {
  loadCollaborationModeration,
  setCollaborationModeration,
  type CollaborationModerationStatus,
} from '../core/services/collaboration'
import { ResultCardPanel } from './ResultCardPanel'

interface SharedArtifactGalleryProps {
  cards: WorkbenchResultCard[]
  kind?: WorkbenchShareKind
  onRemix?: (card: WorkbenchResultCard) => void
  onSave?: (card: WorkbenchResultCard) => void
  canModerate?: boolean
}

export function SharedArtifactGallery({ cards, kind, onRemix, onSave, canModerate }: SharedArtifactGalleryProps) {
  const visible = kind ? cards.filter((card) => card.kind === kind) : cards

  if (!visible.length) {
    return <p className="muted">No shared examples yet. Save one to build the gallery.</p>
  }

  const updateModeration = (card: WorkbenchResultCard, status: CollaborationModerationStatus) => {
    setCollaborationModeration(
      { kind: 'card', id: card.id, title: card.title, module: card.kind },
      {
        status,
        updatedBy: 'Teacher',
        note: status === 'approved' ? 'Approved for classroom sharing.' : status === 'hidden' ? 'Hidden from the shared gallery.' : 'Under review.',
      },
    )
  }

  const renderCard = (card: WorkbenchResultCard) => {
    const moderation = loadCollaborationModeration({ kind: 'card', id: card.id, title: card.title, module: card.kind })
    if (moderation.status === 'hidden' && !canModerate) {
      return null
    }

    return (
      <div key={card.id} className="shared-gallery-card">
        <ResultCardPanel
          card={card}
          primaryActionLabel="Save copy"
          secondaryActionLabel="Remix"
          onPrimaryAction={onSave ? () => onSave(card) : undefined}
          onSecondaryAction={onRemix ? () => onRemix(card) : undefined}
        />
        {canModerate ? (
          <div className="edu-note">
            <p className="edu-note-title">Moderation</p>
            <p>Current status: {moderation.status}</p>
            <div className="compare-stage-actions">
              <button type="button" className="overlay-toggle" onClick={() => updateModeration(card, 'approved')}>
                Approve
              </button>
              <button type="button" className="overlay-toggle" onClick={() => updateModeration(card, 'pending')}>
                Mark pending
              </button>
              <button type="button" className="overlay-toggle" onClick={() => updateModeration(card, 'hidden')}>
                Hide
              </button>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="shared-gallery">
      {visible.map((card) => renderCard(card))}
    </div>
  )
}
