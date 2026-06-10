import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FilePicker } from '../../components/FilePicker'
import { Panel } from '../../components/Panel'
import { api } from '../../core/services/api'

export function ComparePage() {
  const [fileA, setFileA] = useState<File | null>(null)
  const [fileB, setFileB] = useState<File | null>(null)

  const compareMutation = useMutation({
    mutationFn: async () => {
      if (!fileA || !fileB) {
        throw new Error('Upload two images before comparing.')
      }
      return api.analyzeCompare(fileA, fileB)
    },
  })

  const imageAUrl = fileA ? URL.createObjectURL(fileA) : ''
  const imageBUrl = fileB ? URL.createObjectURL(fileB) : ''

  return (
    <div className="tool-grid">
      <Panel title="Image Compare" subtitle="Side-by-side complexity comparison across two images.">
        <div className="form-grid">
          <FilePicker label="Image A" onChange={setFileA} />
          <FilePicker label="Image B" onChange={setFileB} />
          <button
            className="action"
            type="button"
            disabled={compareMutation.isPending || !fileA || !fileB}
            onClick={() => compareMutation.mutate()}
          >
            {compareMutation.isPending ? 'Comparing...' : 'Compare Images'}
          </button>
          {!fileA || !fileB ? <p className="muted">Both uploads are required.</p> : null}
        </div>
      </Panel>

      <Panel title="Comparison Workspace" subtitle="Linked previews and interpretation output.">
        <div className="compare-grid">
          <div className="compare-slot">{imageAUrl ? <img src={imageAUrl} alt="Image A preview" className="result-image" /> : <p className="muted">Image A</p>}</div>
          <div className="compare-slot">{imageBUrl ? <img src={imageBUrl} alt="Image B preview" className="result-image" /> : <p className="muted">Image B</p>}</div>
        </div>
        {compareMutation.data ? <pre>{JSON.stringify(compareMutation.data, null, 2)}</pre> : null}
      </Panel>
    </div>
  )
}
