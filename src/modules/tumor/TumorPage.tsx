import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { GuidedKickoffPanel } from '../../components/GuidedKickoffPanel'
import { CommentThreadPanel } from '../../components/CommentThreadPanel'
import { ClassroomPanel } from '../../components/ClassroomPanel'
import { FilePicker } from '../../components/FilePicker'
import { Panel } from '../../components/Panel'
import { ResultCardPanel } from '../../components/ResultCardPanel'
import { downloadJson, downloadTextAsFile } from '../../core/services/export'
import { useEducatorMode } from '../../core/hooks/useEducatorMode'
import { useWorkbenchShareArtifact } from '../../core/hooks/useWorkbenchShareArtifact'
import { useOverlayPreference } from '../../core/hooks/useOverlayPreference'
import { api } from '../../core/services/api'
import {
  buildClassroomStatus,
  buildHandoutMarkdown,
  buildSlideSummaryMarkdown,
  defaultChecklistStatus,
} from '../../core/services/educationToolkit'
import {
  createTumorShareCard,
  trackWorkbenchEvent,
} from '../../core/services/workbenchSharing'
import {
  buildMethodsSnapshotMarkdown,
  buildPublicationFigureManifest,
  buildResearchSnapshot,
} from '../../core/services/researchWorkbench'
import { TumorComparisonPanel } from './TumorComparisonPanel'
import { TumorStatusCard } from './TumorStatusCard'
import { formatConfidence, summarizeConfidence } from './tumorDisplay'
import { useTumorFractalEvidence } from './useTumorFractalEvidence'
import { buildTumorEvidenceSummary, tumorFractalEvidenceSources } from './tumorEvidence'
import type { RunSummary } from '../../core/services/contracts'

type View = 'axial' | 'coronal' | 'sagittal'
type ModelStatus = 'idle' | 'loading' | 'ready' | 'error'

export function TumorPage() {
  const { educatorMode } = useEducatorMode()
  const [file, setFile] = useState<File | null>(null)
  const [view, setView] = useState<View>('axial')
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.25)
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle')
  const [modelStatusMessage, setModelStatusMessage] = useState('')
  const [showDetails, setShowDetails] = useOverlayPreference('tumor.overlay.visible')
  const previousFileRef = useRef<File | null>(null)

  useEffect(() => {
    let cancelled = false
    const timeout = window.setTimeout(() => {
      if (cancelled) {
        return
      }

      setModelStatus('loading')
      setModelStatusMessage('Loading tumor model...')

      api
        .preloadTumorModel(view)
        .then(() => {
          if (cancelled) {
            return
          }
          setModelStatus('ready')
          setModelStatusMessage('Model ready')
        })
        .catch((error) => {
          if (cancelled) {
            return
          }
          setModelStatus('error')
          setModelStatusMessage(error instanceof Error ? error.message : 'Failed to load tumor model.')
        })
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [view])

  const detectMutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error('Upload an image before detection.')
      }

      return api.detectTumor(file, view, confidenceThreshold)
    },
  })

  useEffect(() => {
    if (previousFileRef.current === file) {
      return
    }

    previousFileRef.current = file
    detectMutation.reset()
  }, [file, detectMutation])

  useEffect(() => {
    if (educatorMode) {
      setShowDetails(true)
    }
  }, [educatorMode, setShowDetails])

  const detectionData = detectMutation.data
  const detectionError = detectMutation.error instanceof Error ? detectMutation.error.message : ''
  const confidenceSummary = detectionData ? summarizeConfidence(detectionData.detections) : null
  const fractalEvidence = useTumorFractalEvidence(file, detectionData?.cropImageUrl)

  const strongestDetection = useMemo(() => {
    if (!detectionData?.detections.length) {
      return null
    }

    return [...detectionData.detections].sort((left, right) => right.confidence - left.confidence)[0]
  }, [detectionData])

  const detectionCount = detectionData?.detections.length ?? 0
  const strongestConfidence = strongestDetection ? formatConfidence(strongestDetection.confidence) : '—'
  const evidenceSummary = useMemo(
    () =>
      buildTumorEvidenceSummary({
        view,
        threshold: confidenceThreshold,
        detectionCount,
        strongestConfidence,
        confidenceSummary,
      }),
    [confidenceSummary, confidenceThreshold, detectionCount, strongestConfidence, view],
  )
  const classroomStatus = useMemo(() => {
    const checklist = defaultChecklistStatus([
      'Upload a scan',
      'Choose an anatomical view',
      'Run detection',
      'Review the evidence panel',
    ])

    checklist[0].complete = !!file
    checklist[0].detail = file ? file.name : 'No file chosen'
    checklist[1].complete = !!view
    checklist[1].detail = view
    checklist[2].complete = !!detectionData
    checklist[2].detail = detectionData ? `${detectionCount} candidates` : 'Run inference first'
    checklist[3].complete = fractalEvidence.status === 'ready' || !!detectionData
    checklist[3].detail = detectionData ? 'Share card ready' : fractalEvidence.status === 'ready' ? 'Evidence panel ready' : 'Waiting on the model'

    return buildClassroomStatus(
      'tumor-detection',
      [
        { label: 'View', value: view },
        { label: 'Threshold', value: `${Math.round(confidenceThreshold * 100)}%` },
        { label: 'Candidates', value: String(detectionCount) },
        { label: 'Top confidence', value: strongestConfidence },
      ],
      checklist,
      {
        submissionStatus: detectionData ? 'ready-to-submit' : file ? 'in-progress' : 'not-started',
        progressLabel: detectionData ? 'Evidence ready' : 'Run detection to generate evidence',
        summary: detectionData
          ? `Tumor evidence is ready for cautious classroom discussion.`
          : 'Prepare the scan, then run detection to create the evidence summary.',
      },
    )
  }, [confidenceThreshold, detectionCount, detectionData, file, fractalEvidence, strongestConfidence, view])
  const tumorShareCard = useMemo(
    () =>
      detectionData
        ? createTumorShareCard({
          result: detectionData,
          threshold: confidenceThreshold,
          detectionCount,
          strongestConfidence,
          summary: evidenceSummary.summary,
          })
        : null,
    [confidenceThreshold, detectionCount, detectionData, evidenceSummary.summary, strongestConfidence],
  )
  const researchSnapshot = useMemo(() => {
    if (!detectionData) {
      return null
    }

    return buildResearchSnapshot({
      run: {
        id: detectionData.runId,
        type: 'tumor_detection',
        status: 'complete',
        createdAt: new Date().toISOString(),
        detail: evidenceSummary.summary,
        payload: {
          result: detectionData,
          parameters: { view, threshold: confidenceThreshold },
        },
      } as RunSummary,
      title: `Tumor evidence snapshot - ${view}`,
      summary: evidenceSummary.summary,
      metrics: [
        { label: 'View', value: view },
        { label: 'Threshold', value: `${Math.round(confidenceThreshold * 100)}%` },
        { label: 'Candidates', value: String(detectionCount) },
        { label: 'Top confidence', value: strongestConfidence },
      ],
      annotations: [
        ...evidenceSummary.cautions.map((text, index) => ({ label: `Caution ${index + 1}`, text })),
        ...tumorFractalEvidenceSources.slice(0, 2).map((source) => ({ label: source.label, text: source.summary })),
      ],
      parameters: { view, threshold: confidenceThreshold },
      result: detectionData,
      artifacts: {
        imageUrl: detectionData.imageUrl,
        overlayImageUrl: detectionData.overlayImageUrl ?? '',
        cropImageUrl: detectionData.cropImageUrl ?? '',
      },
    })
  }, [confidenceThreshold, detectionData, evidenceSummary.cautions, evidenceSummary.summary, strongestConfidence, view])
  const figureManifest = useMemo(
    () =>
      researchSnapshot
        ? buildPublicationFigureManifest(researchSnapshot, {
            primaryImageUrl: detectionData?.overlayImageUrl || detectionData?.imageUrl,
            secondaryImageUrl: detectionData?.cropImageUrl,
          })
        : null,
    [detectionData?.cropImageUrl, detectionData?.imageUrl, detectionData?.overlayImageUrl, researchSnapshot],
  )
  const {
    shareUrl: tumorShareUrl,
    shareText: tumorShareText,
    shareStatus,
    copyShareLink: copyTumorShareLink,
    copyShareText: copyTumorShareText,
    saveShareCard: saveTumorShareCard,
    remixShareCard,
  } = useWorkbenchShareArtifact<{ view?: View; threshold?: number }>({
    card: tumorShareCard,
    sourcePath: '/workbench/tumor-detection',
    copyLinkEventName: 'tumor_share_link_copied',
    copyTextEventName: 'tumor_share_card_copied',
    saveEventName: 'tumor_share_saved',
    remixEventName: 'tumor_share_remixed',
    eventPayload: { view, threshold: confidenceThreshold },
    onRemix: (state) => {
      if (state.view) {
        setView(state.view)
      }
      if (typeof state.threshold === 'number') {
        setConfidenceThreshold(state.threshold)
      }
    },
  })

  const exportTumorHandout = () => {
    downloadTextAsFile(
      'tumor-classroom-handout.md',
      buildHandoutMarkdown('tumor-detection', classroomStatus, ['Keep all descriptions cautious and non-diagnostic.']),
      'text/markdown',
    )
    trackWorkbenchEvent('tumor_classroom_handout_exported', { view, threshold: confidenceThreshold })
  }

  const exportTumorSlides = () => {
    downloadTextAsFile(
      'tumor-slide-summary.md',
      buildSlideSummaryMarkdown('tumor-detection', classroomStatus, [
        `View: ${view}`,
        `Threshold: ${Math.round(confidenceThreshold * 100)}%`,
        `Candidates: ${detectionCount}`,
      ]),
      'text/markdown',
    )
    trackWorkbenchEvent('tumor_classroom_slides_exported', { view, threshold: confidenceThreshold })
  }

  const exportTumorMethodsSnapshot = () => {
    if (!researchSnapshot) {
      return
    }

    downloadTextAsFile('tumor-methods-snapshot.md', buildMethodsSnapshotMarkdown(researchSnapshot), 'text/markdown')
  }

  const exportTumorResearchJson = () => {
    if (!researchSnapshot) {
      return
    }

    downloadJson('tumor-methods-snapshot.json', researchSnapshot)
  }

  const exportTumorFigureManifest = () => {
    if (!figureManifest) {
      return
    }

    downloadJson('tumor-figure-manifest.json', figureManifest)
  }

  return (
    <div className="tool-grid tumor-tool-grid">
      <GuidedKickoffPanel
        title="Tumor Evidence Review"
        subtitle="Upload a scan, choose a view, and keep the interpretation cautious and evidence-first."
        steps={[
          'Start by uploading the scan you want to review.',
          'Pick the anatomical view that matches the question you need to answer.',
          'Run detection, then read the confidence and safety notes before sharing anything.',
        ]}
        actions={[
          {
            label: 'Open runs',
            to: '/workbench/runs',
            description: 'Keep the output and provenance together.',
          },
          {
            label: 'Open discovery',
            to: '/workbench/discover',
            description: 'See classroom-safe examples and challenge pages.',
          },
        ]}
        note="This surface is educational only. Always keep the language descriptive, cautious, and non-diagnostic."
      />

      <Panel title="Tumor Detection" subtitle="Load a scan, choose the anatomical view, and review the candidate region summary.">
        <div className="tumor-control-grid">
          <div className="form-grid">
            <FilePicker label="MRI/Scan Image" onChange={setFile} />
            <label className="field">
              <span>View</span>
              <select value={view} onChange={(e) => setView(e.target.value as View)}>
                <option value="axial">axial</option>
                <option value="coronal">coronal</option>
                <option value="sagittal">sagittal</option>
              </select>
            </label>

            <div className="edu-note">
              <p className="edu-note-title">Clinical Safety Note</p>
              <p>This view is educational support, not medical diagnosis or treatment guidance.</p>
              <p>Interpret confidence with caution and validate against expert review protocols.</p>
            </div>

            <label className="field tumor-threshold-field">
              <span>Confidence threshold</span>
              <div className="tumor-threshold-row">
                <input
                  type="range"
                  min="0.1"
                  max="0.95"
                  step="0.05"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                />
                <strong>{Math.round(confidenceThreshold * 100)}%</strong>
              </div>
            </label>

            <button className="action" type="button" disabled={!file || detectMutation.isPending} onClick={() => detectMutation.mutate()}>
              {detectMutation.isPending ? (
                <>
                  <span className="button-spinner" aria-hidden="true" />
                  Running detection...
                </>
              ) : (
                'Run Detection'
              )}
            </button>

            <div className="tumor-model-badge" aria-live="polite">
              <span className={`tumor-model-dot tumor-model-dot-${modelStatus}`} aria-hidden="true" />
              <div>
                <strong>Model status</strong>
                <p>{modelStatusMessage}</p>
              </div>
            </div>

            <p className="muted">Model-backed processing runs locally in the browser. If inference fails, we surface the error instead of inventing a box.</p>
          </div>

          <TumorStatusCard
            isRunning={detectMutation.isPending}
            detectionData={detectionData}
            detectionError={detectionError}
            confidenceThreshold={confidenceThreshold}
            detectionCount={detectionCount}
            strongestConfidence={strongestConfidence}
            confidenceSummary={confidenceSummary}
            fractalEvidence={fractalEvidence}
          />
        </div>
      </Panel>

      <Panel title="Before / After Compare" subtitle="The left panel shows the uploaded scan; the right panel shows the model-annotated detection result.">
        <TumorComparisonPanel
          key={file ? `${file.name}-${file.size}-${file.lastModified}` : 'no-file'}
          file={file}
          detectionData={detectionData}
          showDetails={showDetails}
          onToggleDetails={() => setShowDetails((value) => !value)}
        />
      </Panel>

      {educatorMode ? (
        <ClassroomPanel
          moduleId="tumor-detection"
          status={classroomStatus}
          educatorMode={educatorMode}
          onExportHandout={exportTumorHandout}
          onExportSlides={exportTumorSlides}
        />
      ) : null}

      <Panel title="Share This Evidence" subtitle="Turn the current tumor detection and fractal evidence into a shareable, classroom-safe summary.">
        {tumorShareCard ? (
          <ResultCardPanel
            card={tumorShareCard}
            shareUrl={tumorShareUrl}
            cardText={tumorShareText}
            primaryActionLabel="Save example"
            secondaryActionLabel="Duplicate settings"
            onPrimaryAction={saveTumorShareCard}
            onSecondaryAction={remixShareCard}
            onCopyText={copyTumorShareText}
            onCopyLink={copyTumorShareLink}
          />
        ) : (
          <p className="muted">Run detection to create a share card.</p>
        )}
        <div className="edu-note">
          <p className="edu-note-title">Share status</p>
          <p>
            {shareStatus === 'copied'
              ? 'Copied to clipboard.'
              : shareStatus === 'saved'
                ? 'Saved to the local gallery.'
                : shareStatus === 'error'
                  ? 'Clipboard unavailable, but the evidence card is still visible.'
              : 'Save a classroom-safe evidence summary or duplicate the detection settings.'}
          </p>
        </div>
        <div className="edu-note">
          <p className="edu-note-title">Research exports</p>
          <p>Capture the tumor evidence as a methods snapshot, normalized JSON, and figure manifest.</p>
          <div className="compare-stage-actions">
            <button type="button" className="overlay-toggle" onClick={exportTumorMethodsSnapshot}>
              Export methods snapshot
            </button>
            <button type="button" className="overlay-toggle" onClick={exportTumorResearchJson}>
              Export snapshot JSON
            </button>
            <button type="button" className="overlay-toggle" onClick={exportTumorFigureManifest}>
              Export figure manifest
            </button>
          </div>
        </div>
        {tumorShareCard ? (
          <CommentThreadPanel
            target={{ kind: 'card', id: tumorShareCard.id, title: tumorShareCard.title, module: 'tumor-detection' }}
            subject="tumor evidence card"
          />
        ) : null}
      </Panel>
    </div>
  )
}
