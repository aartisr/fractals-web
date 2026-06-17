import type { FormEvent, ReactNode } from 'react'
import { FilePicker } from '../../components/FilePicker'
import type { BoxCountRoiInput } from './types'

interface BoxCountControlsProps {
  file: File | null
  roi: BoxCountRoiInput
  onFileChange: (file: File | null) => void
  onRoiChange: (patch: Partial<BoxCountRoiInput>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  canSubmit: boolean
  isSubmitting: boolean
  autoAnalyzeOnPlacement: boolean
  onAutoAnalyzeToggle: (value: boolean) => void
}

function NumberField({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string
  min: number
  max?: number
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}

function StatusMessage({ file }: { file: File | null }): ReactNode {
  if (file) {
    return null
  }

  return <p className="muted">Upload an image to enable analysis.</p>
}

const roiPresets = [64, 96, 128, 192, 256]

export function BoxCountControls({
  file,
  roi,
  onFileChange,
  onRoiChange,
  onSubmit,
  canSubmit,
  isSubmitting,
  autoAnalyzeOnPlacement,
  onAutoAnalyzeToggle,
}: BoxCountControlsProps) {
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <div className="edu-note">
        <p className="edu-note-title">What You'll Learn</p>
        <p><strong>Fractal Dimension:</strong> Measures surface roughness (1–3 scale). Low ≈ smooth; high ≈ jagged.</p>
        <p><strong>Use Cases:</strong> Detect texture patterns in medical imaging, classify surface quality, analyze growth boundaries, study material properties.</p>
        <p><strong>Method:</strong> Box counting overlays grids of decreasing size and counts non-empty boxes. The log-log slope reveals dimensional complexity.</p>
      </div>

      <FilePicker label="Source Image" onChange={onFileChange} />

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={autoAnalyzeOnPlacement}
          onChange={(event) => onAutoAnalyzeToggle(event.target.checked)}
        />
        <span>Auto-analyze when ROI is placed from image interaction</span>
      </label>

      <div className="edu-note">
        <p className="edu-note-title">Pro Tips</p>
        <p><strong>ROI Placement:</strong> Choose structurally rich regions (edges, textures). Avoid uniform blank areas—they yield meaningless dimension estimates.</p>
        <p><strong>Validation:</strong> Run 3–5 different ROI placements on the same image. If dimensions stay stable, your result is reliable (high R²).</p>
        <p><strong>Quality Threshold:</strong> Use R² ≥ 0.9 as a quality gate. Low R² means the linear trend is poor and dimension is unreliable.</p>
      </div>

      <div className="preset-row" role="group" aria-label="ROI size presets">
        {roiPresets.map((size) => (
          <button
            key={size}
            type="button"
            className={size === roi.size ? 'preset-chip preset-chip-active' : 'preset-chip'}
            onClick={() => onRoiChange({ size })}
          >
            {size}px
          </button>
        ))}
      </div>

      <NumberField label="ROI X" min={0} value={roi.x} onChange={(value) => onRoiChange({ x: value })} />

      <NumberField label="ROI Y" min={0} value={roi.y} onChange={(value) => onRoiChange({ y: value })} />

      <NumberField label="ROI Size" min={16} max={1024} value={roi.size} onChange={(value) => onRoiChange({ size: value })} />

      <button className="action" type="submit" disabled={!canSubmit}>
        {isSubmitting ? (
          <>
            <span className="button-spinner" aria-hidden="true" />
            Computing Dimension...
          </>
        ) : (
          'Analyze ROI & Measure Complexity'
        )}
      </button>

      <StatusMessage file={file} />
    </form>
  )
}
