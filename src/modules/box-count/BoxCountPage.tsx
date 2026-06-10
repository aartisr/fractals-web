import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import { FilePicker } from '../../components/FilePicker'
import { Panel } from '../../components/Panel'
import { api } from '../../core/services/api'

export function BoxCountPage() {
  const [file, setFile] = useState<File | null>(null)

  const analyzeMutation = useMutation({
    mutationFn: async (values: { x: number; y: number; size: number }) => {
      if (!file) {
        throw new Error('Upload an image before running analysis.')
      }
      return api.analyzeBoxCount(file, values)
    },
  })

  const form = useForm({
    defaultValues: { x: 120, y: 120, size: 128 },
    onSubmit: async ({ value }) => {
      await analyzeMutation.mutateAsync(value)
    },
  })

  return (
    <div className="tool-grid">
      <Panel title="Box Counter" subtitle="ROI-driven fractal dimension with box-count diagnostics.">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            form.handleSubmit()
          }}
        >
          <FilePicker label="Source Image" onChange={setFile} />

          <form.Field
            name="x"
            children={(field) => (
              <label className="field">
                <span>ROI X</span>
                <input type="number" min={0} value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} />
              </label>
            )}
          />

          <form.Field
            name="y"
            children={(field) => (
              <label className="field">
                <span>ROI Y</span>
                <input type="number" min={0} value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} />
              </label>
            )}
          />

          <form.Field
            name="size"
            children={(field) => (
              <label className="field">
                <span>ROI Size</span>
                <input type="number" min={32} max={1024} value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} />
              </label>
            )}
          />

          <button className="action" type="submit" disabled={analyzeMutation.isPending || !file}>
            {analyzeMutation.isPending ? 'Analyzing...' : 'Analyze ROI'}
          </button>
          {!file ? <p className="muted">Upload an image to enable analysis.</p> : null}
        </form>
      </Panel>

      <Panel title="Box Count Metrics" subtitle="Dimension, timing, and count trend by box size.">
        {analyzeMutation.data ? (
          <div className="result-stack">
            <img src={analyzeMutation.data.previewUrl} alt="Analyzed ROI source" className="result-image" />
            <div className="metrics">
              <span>Fractal Dimension: {analyzeMutation.data.fractalDimension}</span>
              <span>Elapsed Seconds: {analyzeMutation.data.elapsedSeconds}</span>
            </div>
            <pre>{JSON.stringify(analyzeMutation.data.boxCounts, null, 2)}</pre>
          </div>
        ) : (
          <p className="muted">Run ROI analysis to inspect box-count output.</p>
        )}
      </Panel>
    </div>
  )
}
