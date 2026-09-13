import { useState } from 'react'
import { getSampleImages, sampleImageToFile } from '../utils/sampleImageLoader'
import type { SampleImageItem } from '../types'
import { CheckCircle2, AlertCircle, Database, BookOpen } from 'lucide-react'

interface SampleImageSelectorProps {
  category: 'box-counting' | 'compare' | 'tumor'
  onSelect: (sample: SampleImageItem, file: File, secondFile?: File) => void
  selectedId?: string
  label?: string
}

export function SampleImageSelector({
  category,
  onSelect,
  selectedId,
  label = 'Authentic Clinical & Scientific Sample Datasets',
}: SampleImageSelectorProps) {
  const allSamples = getSampleImages(category)
  const [organFilter, setOrganFilter] = useState<'all' | 'brain' | 'heart' | 'eye' | 'dental' | 'liver' | 'fractal'>('all')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const samples = organFilter === 'all' 
    ? allSamples 
    : allSamples.filter(s => s.organ === organFilter || (organFilter === 'fractal' && s.organ === 'geology'))

  const handleChoose = async (sample: SampleImageItem) => {
    try {
      setLoadingId(sample.id)
      const primaryFile = await sampleImageToFile(sample, false)
      let secondaryFile: File | undefined
      if (sample.secondUrl) {
        secondaryFile = await sampleImageToFile(sample, true)
      }
      onSelect(sample, primaryFile, secondaryFile)
    } catch (err) {
      console.error('Failed to load sample image:', err)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="edu-note mb-4" style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0, 119, 182, 0.22)', borderRadius: '12px', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <p className="edu-note-title" style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--signal-deep)' }}>
            {label}
          </p>
          <span style={{ fontSize: '0.72rem', color: 'var(--ink-500)' }}>
            Real clinical scans and neuroimaging benchmarks from OpenNeuro, OASIS Brains, Brain Image Library (BIL), TCIA / Mindscan, and Tufts Dental Archive
          </span>
        </div>
        
        {/* Organ Filter Chips */}
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {(['all', 'brain', 'heart', 'eye', 'dental', 'liver', 'fractal'] as const).map(org => (
            <button
              key={org}
              type="button"
              onClick={() => setOrganFilter(org)}
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                textTransform: 'capitalize',
                padding: '2px 8px',
                borderRadius: '6px',
                border: organFilter === org ? '1px solid #0284c7' : '1px solid rgba(16, 33, 48, 0.15)',
                background: organFilter === org ? '#0284c7' : 'rgba(241, 245, 249, 0.8)',
                color: organFilter === org ? '#ffffff' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {org === 'all' ? 'All Organs' : org}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.55rem', marginTop: '0.6rem' }}>
        {samples.map((sample) => {
          const isSelected = selectedId === sample.id
          const isLoading = loadingId === sample.id
          const isNormal = sample.condition === 'normal'

          return (
            <button
              key={sample.id}
              type="button"
              onClick={() => handleChoose(sample)}
              disabled={isLoading}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '0.5rem',
                borderRadius: '8px',
                border: isSelected
                  ? '2px solid var(--signal)'
                  : '1px solid rgba(16, 33, 48, 0.15)',
                background: isSelected ? 'rgba(0, 119, 182, 0.08)' : 'rgba(255, 255, 255, 0.95)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              title={`${sample.title} — Source: ${sample.sourceProject}`}
            >
              <div
                style={{
                  width: '100%',
                  height: '92px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  background: '#04070c',
                  marginBottom: '0.4rem',
                  position: 'relative',
                }}
              >
                <img
                  src={sample.url}
                  alt={sample.title}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  loading="lazy"
                />
                
                {/* Condition Badge (Normal vs Diseased) */}
                {sample.condition && sample.condition !== 'benchmark' && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: '2px',
                      background: isNormal ? 'rgba(22, 163, 74, 0.9)' : 'rgba(225, 29, 72, 0.9)',
                      color: '#ffffff',
                      fontSize: '0.58rem',
                      fontWeight: 700,
                      padding: '1px 4px',
                      borderRadius: '3px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {isNormal ? '✓ Normal' : '⚠ Diseased'}
                  </span>
                )}

                {sample.theoreticalDimension && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                      background: 'rgba(0,0,0,0.75)',
                      color: '#38bdf8',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.62rem',
                      padding: '1px 3px',
                      borderRadius: '3px',
                    }}
                  >
                    D={sample.theoreticalDimension}
                  </span>
                )}
              </div>
              <strong style={{ fontSize: '0.73rem', color: 'var(--ink-900)', lineHeight: 1.2, marginBottom: '2px' }}>
                {sample.title}
              </strong>
              <span style={{ fontSize: '0.64rem', color: 'var(--ink-500)', lineHeight: 1.1 }}>
                {sample.subCategory ?? (sample.category === 'tumor' ? sample.clinicalMetadata?.plane : 'Benchmark')}
              </span>
              <span style={{ fontSize: '0.58rem', color: '#0284c7', marginTop: '3px', fontStyle: 'italic' }}>
                {sample.sourceProject ? sample.sourceProject.split('(')[0] : 'Open Benchmark'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
