import { useMemo } from 'react'
import { GuidedKickoffPanel } from '../../components/GuidedKickoffPanel'
import { CommentThreadPanel } from '../../components/CommentThreadPanel'
import { ClassroomPanel } from '../../components/ClassroomPanel'
import { Panel } from '../../components/Panel'
import { ResultCardPanel } from '../../components/ResultCardPanel'
import { downloadJson, downloadTextAsFile } from '../../core/services/export'
import { useEducatorMode } from '../../core/hooks/useEducatorMode'
import { useWorkbenchShareArtifact } from '../../core/hooks/useWorkbenchShareArtifact'
import {
  buildClassroomStatus,
  buildHandoutMarkdown,
  buildSlideSummaryMarkdown,
  defaultChecklistStatus,
} from '../../core/services/educationToolkit'
import {
  createBoxCountShareCard,
  trackWorkbenchEvent,
} from '../../core/services/workbenchSharing'
import {
  buildMethodsSnapshotMarkdown,
  buildPublicationFigureManifest,
  buildResearchSnapshot,
} from '../../core/services/researchWorkbench'
import { BoxCountControls } from './BoxCountControls'
import { BoxCountResultPanel } from './BoxCountResultPanel'
import { useBoxCountController } from './useBoxCountController'
import type { RunSummary } from '../../core/services/contracts'

const boxCountSourcePath = '/workbench/box-count'

export function BoxCountPage() {
  const { educatorMode } = useEducatorMode()
  const {
    file,
    roi,
    hasPlacedRoi,
    onFileChange,
    onRoiChange,
    onSubmit,
    result,
    insight,
    error,
    samples,
    addCurrentSample,
    clearSamples,
    applySampleRoi,
    exportSamplesCsv,
    labChecklist,
    sourcePreviewUrl,
    displayImageUrl,
    roiDraft,
    isSubmitting,
    canSubmit,
    autoAnalyzeOnPlacement,
    setAutoAnalyzeOnPlacement,
    showOverlays,
    setShowOverlays,
    markImageLoaded,
    setRoiAnchorFromImage,
    updateRoiDraftFromDrag,
    commitRoiDraft,
    clearRoiDraft,
  } = useBoxCountController()

  const boxCountShareCard = useMemo(
    () =>
      result
        ? createBoxCountShareCard({
            result,
            label: file?.name,
            insight,
          })
        : null,
    [file?.name, insight, result],
  )
  const researchSnapshot = useMemo(() => {
    if (!result) {
      return null
    }

    return buildResearchSnapshot({
      run: {
        id: result.runId,
        type: 'box_count',
        status: 'complete',
        createdAt: new Date().toISOString(),
        detail: `Box-count run for ROI ${result.roi.x},${result.roi.y},${result.roi.size}`,
        payload: {
          result,
          parameters: { fileName: file?.name ?? null, roi: result.roi },
        },
      } as RunSummary,
      title: 'Box-count research snapshot',
      summary: insight
        ? `Fractal dimension ${result.fractalDimension.toFixed(4)} with R² ${insight.fitR2.toFixed(4)}.`
        : `Fractal dimension ${result.fractalDimension.toFixed(4)}.`,
      metrics: [
        { label: 'D', value: result.fractalDimension.toFixed(4) },
        { label: 'R²', value: insight ? insight.fitR2.toFixed(4) : '—' },
        { label: 'Elapsed', value: `${result.elapsedSeconds.toFixed(2)}s` },
        { label: 'ROI', value: `${result.roi.x},${result.roi.y},${result.roi.size}` },
      ],
      annotations: [
        { label: 'Complexity', text: insight?.teachingHint ?? 'No teaching hint available yet.' },
        { label: 'File', text: file?.name ?? 'Untitled image' },
      ],
      parameters: { fileName: file?.name ?? null, roi: result.roi },
      result,
    })
  }, [file?.name, insight, result])
  const {
    shareUrl: boxCountShareUrl,
    shareText: boxCountShareText,
    shareStatus,
    copyShareLink: copyBoxCountShareLink,
    copyShareText: copyBoxCountShareText,
    saveShareCard: saveBoxCountShareCard,
    remixShareCard,
  } = useWorkbenchShareArtifact<{ roi?: { x: number; y: number; size: number } }>({
    card: boxCountShareCard,
    sourcePath: boxCountSourcePath,
    copyLinkEventName: 'box_count_share_link_copied',
    copyTextEventName: 'box_count_share_card_copied',
    saveEventName: 'box_count_share_saved',
    remixEventName: 'box_count_share_remixed',
    eventPayload: { roi: result?.roi },
    onRemix: (state) => {
      if (state.roi) {
        onRoiChange(state.roi)
      }
      void onSubmit()
    },
  })

  const classroomStatus = useMemo(() => {
    const checklist = defaultChecklistStatus([
      'Upload an image',
      'Place the ROI',
      'Run box-count analysis',
      'Collect or export evidence',
    ])

    checklist[0].complete = !!file
    checklist[0].detail = file ? file.name : 'No file chosen'
    checklist[1].complete = hasPlacedRoi
    checklist[1].detail = hasPlacedRoi ? `ROI ${roi.x},${roi.y},${roi.size}` : 'Waiting for placement'
    checklist[2].complete = !!result
    checklist[2].detail = result ? `D ${result.fractalDimension.toFixed(4)}` : 'Run analysis to compute D'
    checklist[3].complete = samples.length >= 1 || !!result
    checklist[3].detail = samples.length ? `${samples.length} sample${samples.length === 1 ? '' : 's'}` : 'Use the share card or export a CSV'

    return buildClassroomStatus(
      'box-count',
      [
        { label: 'D', value: result ? result.fractalDimension.toFixed(4) : '—' },
        { label: 'R²', value: insight ? insight.fitR2.toFixed(4) : '—' },
        { label: 'Samples', value: String(samples.length) },
        { label: 'ROI', value: `${roi.x},${roi.y},${roi.size}` },
      ],
      checklist,
      {
        submissionStatus: result ? 'ready-to-submit' : hasPlacedRoi ? 'in-progress' : 'not-started',
        progressLabel: `${[file, hasPlacedRoi, result].filter(Boolean).length}/3 core steps`,
        summary: result
          ? `Box-count analysis is ready for classroom review.`
          : 'Set up the image and ROI before exporting the handout.',
      },
    )
  }, [file, hasPlacedRoi, insight, result, roi.x, roi.y, roi.size, samples.length])

  const exportBoxCountHandout = () => {
    downloadTextAsFile(
      'box-count-classroom-handout.md',
      buildHandoutMarkdown('box-count', classroomStatus, ['Use the export CSV for notebook submission.']),
      'text/markdown',
    )
    trackWorkbenchEvent('box_count_classroom_handout_exported', { roi: result?.roi })
  }

  const exportBoxCountSlides = () => {
    downloadTextAsFile(
      'box-count-slide-summary.md',
      buildSlideSummaryMarkdown('box-count', classroomStatus, [
        `ROI: ${roi.x},${roi.y},${roi.size}`,
        `D: ${result ? result.fractalDimension.toFixed(4) : '—'}`,
        `R²: ${insight ? insight.fitR2.toFixed(4) : '—'}`,
      ]),
      'text/markdown',
    )
    trackWorkbenchEvent('box_count_classroom_slides_exported', { roi: result?.roi })
  }

  const exportBoxCountResearchSnapshot = () => {
    if (!researchSnapshot) {
      return
    }

    downloadTextAsFile(
      'box-count-methods-snapshot.md',
      buildMethodsSnapshotMarkdown(researchSnapshot),
      'text/markdown',
    )
  }

  const exportBoxCountResearchJson = () => {
    if (!researchSnapshot) {
      return
    }

    downloadJson('box-count-methods-snapshot.json', researchSnapshot)
  }

  const exportBoxCountFigureManifest = () => {
    if (!researchSnapshot || !result) {
      return
    }

    downloadJson(
      'box-count-figure-manifest.json',
      buildPublicationFigureManifest(researchSnapshot, {
        primaryImageUrl: result.previewUrl,
      }),
    )
  }

  return (
    <div className="tool-grid">
      <GuidedKickoffPanel
        title="Box Counting"
        subtitle="Choose a region, scan the occupied boxes, and keep the result reproducible."
        steps={[
          'Upload an image with a boundary or texture worth measuring.',
          'Place the ROI carefully so the count ladder sees the structure you care about.',
          'Run the analysis, then save or export the evidence before moving on.',
        ]}
        actions={[
          {
            label: 'Open compare',
            to: '/workbench/compare',
            description: 'Use the comparison lab for side-by-side structure checks.',
          },
          {
            label: 'Review runs',
            to: '/workbench/runs',
            description: 'Keep your ROI and exports in the run history.',
          },
        ]}
        note="If the ROI feels ambiguous, shrink the view and pick the clearest structural boundary first."
      />

      <Panel title="Box Counter" subtitle="Quantify surface complexity and roughness patterns in images.">
        <BoxCountControls
          file={file}
          roi={roi}
          onFileChange={onFileChange}
          onRoiChange={onRoiChange}
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void onSubmit()
          }}
          canSubmit={canSubmit}
          isSubmitting={isSubmitting}
          autoAnalyzeOnPlacement={autoAnalyzeOnPlacement}
          onAutoAnalyzeToggle={setAutoAnalyzeOnPlacement}
        />
      </Panel>

      <Panel title="Analysis Results" subtitle="Fractal dimension reveals boundary complexity; stability (R²) shows fit quality.">
        <BoxCountResultPanel
          roi={roi}
          hasPlacedRoi={hasPlacedRoi}
          result={result}
          insight={insight}
          error={error}
          samples={samples}
          onAddCurrentSample={addCurrentSample}
          onClearSamples={clearSamples}
          onApplySampleRoi={applySampleRoi}
          exportSamplesCsv={exportSamplesCsv}
          labChecklist={labChecklist}
          displayImageUrl={displayImageUrl}
          sourcePreviewUrl={sourcePreviewUrl}
          roiDraft={roiDraft}
          showOverlays={showOverlays}
          onToggleOverlays={() => setShowOverlays((value) => !value)}
          onImageLoad={markImageLoaded}
          onSelectRoiAnchor={setRoiAnchorFromImage}
          onUpdateRoiDraftFromDrag={updateRoiDraftFromDrag}
          onCommitRoiDraft={commitRoiDraft}
          onClearRoiDraft={clearRoiDraft}
        />
      </Panel>

      <Panel title="Share This ROI" subtitle="Copy the current analysis, save it to the local gallery, or remix the ROI and run it again.">
        {boxCountShareCard ? (
          <ResultCardPanel
            card={boxCountShareCard}
            shareUrl={boxCountShareUrl}
            cardText={boxCountShareText}
            primaryActionLabel="Save example"
            secondaryActionLabel="Remix ROI"
            onPrimaryAction={saveBoxCountShareCard}
            onSecondaryAction={remixShareCard}
            onCopyText={copyBoxCountShareText}
            onCopyLink={copyBoxCountShareLink}
          />
        ) : (
          <p className="muted">Run an analysis to generate a share card.</p>
        )}
        <div className="edu-note">
          <p className="edu-note-title">Share status</p>
          <p>
            {shareStatus === 'copied'
              ? 'Copied to clipboard.'
              : shareStatus === 'saved'
                ? 'Saved to the local gallery.'
                : shareStatus === 'error'
                  ? 'Clipboard unavailable, but the card is still visible.'
                  : 'Save the current ROI analysis or remix it with the same settings.'}
          </p>
        </div>
        <div className="edu-note">
          <p className="edu-note-title">Research exports</p>
          <p>Capture a versioned snapshot, normalized JSON, and figure manifest for the ROI analysis.</p>
          <div className="compare-stage-actions">
            <button type="button" className="overlay-toggle" onClick={exportBoxCountResearchSnapshot}>
              Export methods snapshot
            </button>
            <button type="button" className="overlay-toggle" onClick={exportBoxCountResearchJson}>
              Export snapshot JSON
            </button>
            <button type="button" className="overlay-toggle" onClick={exportBoxCountFigureManifest}>
              Export figure manifest
            </button>
          </div>
        </div>
        {boxCountShareCard ? (
          <CommentThreadPanel
            target={{ kind: 'card', id: boxCountShareCard.id, title: boxCountShareCard.title, module: 'box-count' }}
            subject="box-count result card"
          />
        ) : null}
      </Panel>

      {educatorMode ? (
        <ClassroomPanel
          moduleId="box-count"
          status={classroomStatus}
          educatorMode={educatorMode}
          onExportHandout={exportBoxCountHandout}
          onExportSlides={exportBoxCountSlides}
        />
      ) : null}
    </div>
  )
}
