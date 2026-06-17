import { Panel } from '../../components/Panel'
import { BoxCountControls } from './BoxCountControls'
import { BoxCountResultPanel } from './BoxCountResultPanel'
import { useBoxCountController } from './useBoxCountController'

export function BoxCountPage() {
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

  return (
    <div className="tool-grid">
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
    </div>
  )
}
