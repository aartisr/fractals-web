import { Panel } from './Panel'
import type { ClassroomModuleId, ClassroomStatus } from '../core/services/educationToolkit'
import { CLASSROOM_TEMPLATES } from '../core/services/educationToolkit'

interface ClassroomPanelProps {
  moduleId: ClassroomModuleId
  status: ClassroomStatus
  educatorMode: boolean
  onExportHandout: () => void
  onExportSlides: () => void
}

export function ClassroomPanel({ moduleId, status, educatorMode, onExportHandout, onExportSlides }: ClassroomPanelProps) {
  const template = CLASSROOM_TEMPLATES[moduleId]

  return (
    <Panel title="Classroom Mode" subtitle="A teacher-friendly view for lessons, rubrics, and handout exports.">
      <div className="edu-note">
        <p className="edu-note-title">Teacher view</p>
        <p>{template.teacherGoal}</p>
        <p>{template.assignmentPrompt}</p>
      </div>

      <div className="edu-chip-row">
        <span className="edu-chip">Mode: {educatorMode ? 'Classroom' : 'Standard'}</span>
        <span className="edu-chip">Submission: {status.submissionStatus.replace(/-/g, ' ')}</span>
        <span className="edu-chip">Progress: {status.progressLabel}</span>
      </div>

      <div className="classroom-grid">
        <section className="classroom-card">
          <h3>Lesson steps</h3>
          <ol>
            {template.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="classroom-card">
          <h3>Rubric</h3>
          <ul>
            {template.rubric.map((item) => (
              <li key={item.label}>
                <strong>{item.label}:</strong> {item.description}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="classroom-card classroom-checklist">
        <h3>Submission checklist</h3>
        <ul>
          {status.checklist.map((item) => (
            <li key={item.label}>
              <strong>{item.complete ? 'Done' : 'Pending'}:</strong> {item.label}
              {item.detail ? <span> — {item.detail}</span> : null}
            </li>
          ))}
        </ul>
      </div>

      <div className="classroom-card classroom-metrics">
        <h3>Evidence summary</h3>
        <ul>
          {status.metrics.map((metric) => (
            <li key={metric.label}>
              <strong>{metric.label}:</strong> {metric.value}
              {metric.detail ? <span> — {metric.detail}</span> : null}
            </li>
          ))}
        </ul>
      </div>

      <div className="compare-stage-actions">
        <button type="button" className="overlay-toggle" onClick={onExportHandout}>
          Export handout
        </button>
        <button type="button" className="overlay-toggle" onClick={onExportSlides}>
          Export slide summary
        </button>
      </div>

      <div className="edu-note">
        <p className="edu-note-title">Safety note</p>
        <p>{template.safetyNote}</p>
      </div>
    </Panel>
  )
}

