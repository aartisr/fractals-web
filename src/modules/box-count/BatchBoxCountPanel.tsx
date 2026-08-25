import { useEffect, useMemo, useRef, useState } from 'react'
import type { BoxCountResult } from '../../core/services/contracts'
import { api } from '../../core/services/api'
import { downloadCsv } from '../../core/services/export'
import { buildBoxCountInsight } from './analysisInsights'

type QueueState = 'ready' | 'running' | 'complete' | 'failed' | 'cancelled'
type BatchItem = { id: string; file: File; state: QueueState; result?: BoxCountResult; error?: string }

const imageTypes = 'image/png,image/jpeg,image/jpg,image/bmp,image/tiff,image/gif'

async function fullImageRoi(file: File) {
  const bitmap = await createImageBitmap(file)
  const size = Math.min(bitmap.width, bitmap.height)
  const roi = { x: Math.floor((bitmap.width - size) / 2), y: Math.floor((bitmap.height - size) / 2), size }
  bitmap.close()
  return roi
}

export function BatchBoxCountPanel() {
  const [items, setItems] = useState<BatchItem[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const cancelRequested = useRef(false)
  useEffect(() => () => { cancelRequested.current = true }, [])

  const completed = items.filter((item) => item.state === 'complete').length
  const csv = useMemo(() => {
    const header = ['file_name', 'status', 'roi_x', 'roi_y', 'roi_size', 'fractal_dimension', 'fit_r2', 'elapsed_seconds', 'error']
    const rows = items.map((item) => {
      const insight = item.result ? buildBoxCountInsight(item.result) : null
      return [item.file.name, item.state, item.result?.roi.x ?? '', item.result?.roi.y ?? '', item.result?.roi.size ?? '', item.result?.fractalDimension ?? '', insight?.fitR2 ?? '', item.result?.elapsedSeconds ?? '', item.error ?? '']
        .map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')
    })
    return [header.join(','), ...rows].join('\n')
  }, [items])

  const runQueue = async () => {
    if (!items.some((item) => item.state === 'ready')) return
    cancelRequested.current = false
    setIsRunning(true)
    for (const item of items) {
      if (item.state !== 'ready') continue
      if (cancelRequested.current) break
      setItems((previous) => previous.map((candidate) => candidate.id === item.id ? { ...candidate, state: 'running' } : candidate))
      try {
        const roi = await fullImageRoi(item.file)
        if (cancelRequested.current) break
        const result = await api.analyzeBoxCount(item.file, roi)
        setItems((previous) => previous.map((candidate) => candidate.id === item.id ? { ...candidate, state: 'complete', result } : candidate))
      } catch (reason) {
        setItems((previous) => previous.map((candidate) => candidate.id === item.id ? { ...candidate, state: 'failed', error: reason instanceof Error ? reason.message : 'Analysis failed.' } : candidate))
      }
    }
    if (cancelRequested.current) {
      setItems((previous) => previous.map((item) => item.state === 'ready' ? { ...item, state: 'cancelled' } : item))
    }
    setIsRunning(false)
  }

  return (
    <section className="result-stack" aria-label="Batch image benchmarking">
      <div className="edu-note">
        <p className="edu-note-title">Automated dataset benchmark queue</p>
        <p>Select multiple images to measure them sequentially in this browser. Each image uses its largest centered square region automatically, with grid-offset averaging enabled—no manual ROI placement required.</p>
      </div>
      <label className="field">
        <span>Image dataset</span>
        <input type="file" accept={imageTypes} multiple disabled={isRunning} onChange={(event) => {
          setItems(Array.from(event.target.files ?? []).map((file, index) => ({ id: `${file.name}-${file.lastModified}-${index}`, file, state: 'ready' })))
        }} />
      </label>
      {items.length ? <p className="muted">{completed}/{items.length} complete. Processing is sequential to keep memory use predictable for whole-slide datasets.</p> : null}
      <div className="overlay-controls">
        <button className="action" type="button" onClick={() => void runQueue()} disabled={isRunning || !items.some((item) => item.state === 'ready')}>
          {isRunning ? 'Processing queue…' : 'Run dataset benchmark'}
        </button>
        {isRunning ? <button className="overlay-toggle" type="button" onClick={() => { cancelRequested.current = true }}>Stop after current image</button> : null}
        {items.length ? <button className="overlay-toggle" type="button" disabled={isRunning} onClick={() => setItems([])}>Clear queue</button> : null}
        {completed ? <button className="overlay-toggle" type="button" onClick={() => downloadCsv('box-count-batch-benchmark.csv', csv)}>Export CSV</button> : null}
      </div>
      {items.length ? <div className="table-wrap"><table className="runs-table"><thead><tr><th>Image</th><th>Status</th><th>D</th><th>R²</th><th>Auto ROI</th></tr></thead><tbody>
        {items.map((item) => {
          const insight = item.result ? buildBoxCountInsight(item.result) : null
          return <tr key={item.id}><td>{item.file.name}</td><td>{item.state}{item.error ? ` — ${item.error}` : ''}</td><td>{item.result?.fractalDimension.toFixed(4) ?? '—'}</td><td>{insight?.fitR2.toFixed(4) ?? '—'}</td><td>{item.result ? `${item.result.roi.x}, ${item.result.roi.y}, ${item.result.roi.size}px` : 'centered full image'}</td></tr>
        })}
      </tbody></table></div> : null}
    </section>
  )
}
