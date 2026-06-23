import { useMemo, useState } from 'react'
import {
  addCollaborationComment,
  buildDefaultPeerReviewRubric,
  loadCollaborationComments,
  loadCollaborationModeration,
  loadCollaborationRubric,
  saveCollaborationRubric,
  setCollaborationModeration,
  toggleCollaborationCommentResolved,
  type CollaborationTarget,
  type CollaborationRole,
  type CollaborationRubricScore,
} from '../core/services/collaboration'

type CommentThreadPanelProps = {
  target: CollaborationTarget
  subject: string
}

const roles: CollaborationRole[] = ['student', 'peer', 'teacher']
const moderationOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'hidden', label: 'Hidden' },
] as const

export function CommentThreadPanel({ target, subject }: CommentThreadPanelProps) {
  const [commentsTick, setCommentsTick] = useState(0)
  const [moderationTick, setModerationTick] = useState(0)
  const [rubricTick, setRubricTick] = useState(0)
  const [author, setAuthor] = useState('Teacher')
  const [commentRole, setCommentRole] = useState<CollaborationRole>('teacher')
  const [reviewerRole, setReviewerRole] = useState<CollaborationRole>('teacher')
  const [body, setBody] = useState('')
  const [reviewer, setReviewer] = useState('Teacher')
  const [overallFeedback, setOverallFeedback] = useState('')
  const [criteriaNotes, setCriteriaNotes] = useState<Record<string, string>>({})
  const [criteriaScores, setCriteriaScores] = useState<Record<string, CollaborationRubricScore>>({})
  const [moderationStatus, setModerationStatus] = useState(loadCollaborationModeration(target).status)
  const [moderationNote, setModerationNote] = useState('')
  const [moderatedBy, setModeratedBy] = useState('Teacher')

  const comments = useMemo(() => loadCollaborationComments(target), [target, commentsTick])
  const rubric = useMemo(() => loadCollaborationRubric(target), [target, rubricTick])
  const defaultRubric = useMemo(() => buildDefaultPeerReviewRubric(subject), [subject])
  const moderation = useMemo(() => loadCollaborationModeration(target), [target, moderationTick])

  const visibleRubric = rubric ?? {
    id: '',
    targetKind: target.kind,
    targetId: target.id,
    createdAt: '',
    reviewer,
    role: reviewerRole,
    criteria: defaultRubric.map((criterion) => ({
      label: criterion.label,
      score: criteriaScores[criterion.label] ?? 3,
      note: criteriaNotes[criterion.label] ?? criterion.note,
    })),
    overallFeedback,
  }

  const addComment = () => {
    if (!body.trim()) {
      return
    }

    addCollaborationComment(target, {
      author,
      role: commentRole,
      body,
      isTeacherAnnotation: commentRole === 'teacher',
    })
    setBody('')
    setCommentsTick((value) => value + 1)
  }

  const saveRubric = () => {
    saveCollaborationRubric(target, {
      reviewer,
      role: reviewerRole,
      criteria: defaultRubric.map((criterion) => ({
        label: criterion.label,
        score: criteriaScores[criterion.label] ?? 3,
        note: criteriaNotes[criterion.label] ?? criterion.note,
      })),
      overallFeedback,
    })
    setRubricTick((value) => value + 1)
  }

  const saveModeration = () => {
    setCollaborationModeration(target, {
      status: moderationStatus,
      updatedBy: moderatedBy,
      note: moderationNote,
    })
    setModerationTick((value) => value + 1)
  }

  return (
    <div className="collaboration-panel">
      <div className="edu-note">
        <p className="edu-note-title">Collaboration</p>
        <p>Threaded comments, teacher annotations, peer-review rubrics, and moderation for this {target.kind}.</p>
      </div>

      <section className="collaboration-section">
        <div className="collaboration-header">
          <h3>Moderation</h3>
          <span className={`collaboration-status is-${moderation.status}`}>{moderation.status}</span>
        </div>
        <div className="form-grid collaboration-form-grid">
          <label className="field">
            <span>Status</span>
            <select value={moderationStatus} onChange={(event) => setModerationStatus(event.target.value as typeof moderationStatus)}>
              {moderationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Moderator</span>
            <input value={moderatedBy} onChange={(event) => setModeratedBy(event.target.value)} />
          </label>
          <label className="field collaboration-span-2">
            <span>Moderator note</span>
            <textarea value={moderationNote} onChange={(event) => setModerationNote(event.target.value)} rows={2} />
          </label>
        </div>
        <button type="button" className="overlay-toggle" onClick={saveModeration}>
          Save moderation
        </button>
      </section>

      <section className="collaboration-section">
        <div className="collaboration-header">
          <h3>Comments</h3>
          <span className="muted">{comments.length} thread{comments.length === 1 ? '' : 's'}</span>
        </div>
        <div className="collaboration-comment-list">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <article key={comment.id} className={`collaboration-comment ${comment.resolved ? 'is-resolved' : ''}`}>
                <div className="collaboration-comment-meta">
                  <strong>{comment.author}</strong>
                  <span>{comment.role}</span>
                  <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time>
                </div>
                <p>{comment.body}</p>
                <div className="compare-stage-actions">
                  <button
                    type="button"
                    className="overlay-toggle"
                    onClick={() => {
                      toggleCollaborationCommentResolved(comment.id)
                      setCommentsTick((value) => value + 1)
                    }}
                  >
                    {comment.resolved ? 'Reopen' : 'Resolve'}
                  </button>
                  {comment.isTeacherAnnotation ? <span className="edu-chip">Teacher note</span> : null}
                </div>
              </article>
            ))
          ) : (
            <p className="muted">No comments yet. Add the first peer or teacher note below.</p>
          )}
        </div>

        <div className="form-grid collaboration-form-grid">
          <label className="field">
            <span>Author</span>
            <input value={author} onChange={(event) => setAuthor(event.target.value)} />
          </label>
          <label className="field">
            <span>Role</span>
            <select value={commentRole} onChange={(event) => setCommentRole(event.target.value as CollaborationRole)}>
              {roles.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="field collaboration-span-2">
            <span>Comment</span>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={3} />
          </label>
        </div>
        <button type="button" className="overlay-toggle" onClick={addComment}>
          Add comment
        </button>
      </section>

      <section className="collaboration-section">
        <div className="collaboration-header">
          <h3>Peer-review rubric</h3>
          <span className="muted">3-point critique with structured feedback</span>
        </div>
        <div className="form-grid collaboration-rubric-grid">
          <label className="field">
            <span>Reviewer</span>
            <input value={reviewer} onChange={(event) => setReviewer(event.target.value)} />
          </label>
          <label className="field">
            <span>Role</span>
            <select value={reviewerRole} onChange={(event) => setReviewerRole(event.target.value as CollaborationRole)}>
              {roles.map((item) => (
                <option key={`rubric-${item}`} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          {defaultRubric.map((criterion) => (
            <div className="collaboration-criterion" key={criterion.label}>
              <div className="collaboration-header">
                <strong>{criterion.label}</strong>
                <select
                  value={criteriaScores[criterion.label] ?? 3}
                  onChange={(event) =>
                    setCriteriaScores((prev) => ({
                      ...prev,
                      [criterion.label]: Number(event.target.value) as CollaborationRubricScore,
                    }))
                  }
                >
                  {[1, 2, 3, 4].map((score) => (
                    <option key={`${criterion.label}-${score}`} value={score}>
                      {score}
                    </option>
                  ))}
                </select>
              </div>
              <p className="muted">{criterion.note}</p>
              <textarea
                rows={2}
                value={criteriaNotes[criterion.label] ?? ''}
                onChange={(event) =>
                  setCriteriaNotes((prev) => ({
                    ...prev,
                    [criterion.label]: event.target.value,
                  }))
                }
                placeholder="Add a short critique or evidence note"
              />
            </div>
          ))}
          <label className="field collaboration-span-2">
            <span>Overall feedback</span>
            <textarea value={overallFeedback} onChange={(event) => setOverallFeedback(event.target.value)} rows={3} />
          </label>
        </div>
        <button type="button" className="overlay-toggle" onClick={saveRubric}>
          Save rubric
        </button>
        {rubric ? (
          <div className="edu-note">
            <p className="edu-note-title">Saved rubric</p>
            {rubric.criteria.map((criterion) => (
              <p key={`${rubric.id}-${criterion.label}`}>
                <strong>{criterion.label}:</strong> {criterion.score}/4 {criterion.note ? `- ${criterion.note}` : ''}
              </p>
            ))}
            <p>{rubric.overallFeedback}</p>
          </div>
        ) : null}
      </section>

      <section className="collaboration-section">
        <div className="collaboration-header">
          <h3>Preview</h3>
          <span className="muted">{visibleRubric.criteria.length} rubric items</span>
        </div>
        <div className="edu-note">
          <p className="edu-note-title">Current review state</p>
          {visibleRubric.criteria.map((criterion) => (
            <p key={`${target.id}-preview-${criterion.label}`}>
              <strong>{criterion.label}:</strong> {criterion.score}/4
            </p>
          ))}
        </div>
      </section>
    </div>
  )
}
