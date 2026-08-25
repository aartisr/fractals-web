import { useState } from 'react'
import { analyzeDicomStack, analyzeMeshVolume, type VolumeBoxCountResult } from './volumeAnalysis'

export function VolumetricBoxCountPanel() {
  const [files, setFiles] = useState<File[]>([])
  const [result, setResult] = useState<VolumeBoxCountResult | null>(null)
  const [error, setError] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const isDicom = files.length > 0 && files.every((file) => file.name.toLowerCase().endsWith('.dcm'))
  const canAnalyze = files.length > 0 && (!isDicom || files.length >= 2)
  const analyze = async () => {
    if (!canAnalyze) return
    setIsAnalyzing(true); setError(''); setResult(null)
    try {
      setResult(isDicom ? await analyzeDicomStack(files) : await analyzeMeshVolume(files[0]))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to analyze this volume.')
    } finally { setIsAnalyzing(false) }
  }

  return (
    <section className="result-stack" aria-label="3D volumetric box counting">
      <div className="edu-note">
        <p className="edu-note-title">3D volumetric mesh analysis</p>
        <p>Analyze OBJ/STL surface meshes or a stack of uncompressed explicit-little-endian DICOM slices. The browser normalizes the volume to a cubic voxel space; no clinical files leave this device.</p>
      </div>
      <label className="field">
        <span>Volume source (.obj, .stl, or multiple .dcm files)</span>
        <input type="file" accept=".obj,.stl,.dcm,model/obj,model/stl,application/dicom" multiple onChange={(event) => {
          const selected = Array.from(event.target.files ?? [])
          setFiles(selected); setResult(null); setError('')
        }} />
      </label>
      {files.length ? <p className="muted">{files.length === 1 ? files[0].name : `${files.length} DICOM slices selected`}</p> : null}
      <button className="action" type="button" disabled={!canAnalyze || isAnalyzing} onClick={() => void analyze()}>
        {isAnalyzing ? 'Voxelizing & measuring…' : 'Analyze 3D volume'}
      </button>
      {!canAnalyze && files.length > 0 ? <p className="muted">A DICOM volume requires at least two slices.</p> : null}
      {error ? <p className="alert-inline">{error}</p> : null}
      {result ? <>
        <div className="metrics">
          <span>3D Fractal Dimension: {result.fractalDimension}</span>
          <span>Occupied samples: {result.pointCount.toLocaleString()}</span>
          <span>Volume: {result.bounds.x} × {result.bounds.y} × {result.bounds.z}</span>
          <span>Elapsed Seconds: {result.elapsedSeconds}</span>
        </div>
        <div className="edu-note">
          <p className="edu-note-title">Boundary-safe volumetric estimate</p>
          <p>Grid-shift averaging is active: each voxel scale is evaluated across {result.gridOptimization.offsetsPerScale} translated lattice phases, then averaged to reduce alignment artifacts.</p>
        </div>
        <details className="boxcount-raw-details"><summary>Raw 3D box counts</summary><pre>{JSON.stringify(result.boxCounts, null, 2)}</pre></details>
      </> : null}
    </section>
  )
}
