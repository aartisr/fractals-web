import { useEffect, useState } from 'react'
import { buildCompareImageVisuals } from '../compare/compareVisuals'
import { combineFractalQuality, type FractalQualityAssessment } from '../compare/fractalQuality'

type FractalEvidence = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  message: string
  source: { fractalDimension: number; fitR2: number; quality: FractalQualityAssessment } | null
  crop: { fractalDimension: number; fitR2: number; quality: FractalQualityAssessment } | null
  delta: number | null
  quality: FractalQualityAssessment | null
}

const makeIdleState = (): FractalEvidence => ({
  status: 'idle',
  message: 'Select an image to measure fractal complexity.',
  source: null,
  crop: null,
  delta: null,
  quality: null,
})

const dataUrlToFile = async (dataUrl: string, filename: string) => {
  const blob = await (await fetch(dataUrl)).blob()
  return new File([blob], filename, { type: blob.type || 'image/png' })
}

export function useTumorFractalEvidence(file: File | null, cropImageUrl: string | undefined) {
  const [evidence, setEvidence] = useState<FractalEvidence>(() => makeIdleState())

  useEffect(() => {
    let active = true

    if (!file) {
      queueMicrotask(() => {
        if (active) {
          setEvidence(makeIdleState())
        }
      })
      return () => {
        active = false
      }
    }

    queueMicrotask(() => {
      if (active) {
        setEvidence({
          status: 'loading',
          message: cropImageUrl
            ? 'Measuring whole-scan and candidate-crop complexity...'
            : 'Measuring whole-scan complexity...',
          source: null,
          crop: null,
          delta: null,
          quality: null,
        })
      }
    })

    const run = async () => {
      try {
        const sourceAnalysis = await buildCompareImageVisuals(file)
        if (!active) {
          return
        }

        if (!cropImageUrl) {
          const quality = sourceAnalysis.quality
          setEvidence({
            status: 'ready',
            message:
              quality.level === 'unreliable'
                ? 'Whole-scan fractal estimate is unstable, so it should be treated as low confidence.'
                : 'Whole-scan fractal complexity is ready. Run detection to compare it with the tumor candidate crop.',
            source: {
              fractalDimension: sourceAnalysis.fractalDimension,
              fitR2: sourceAnalysis.fitR2,
              quality,
            },
            crop: null,
            delta: null,
            quality,
          })
          return
        }

        const cropFile = await dataUrlToFile(cropImageUrl, 'tumor-crop.png')
        const cropAnalysis = await buildCompareImageVisuals(cropFile)
        if (!active) {
          return
        }

        const delta = Number((cropAnalysis.fractalDimension - sourceAnalysis.fractalDimension).toFixed(4))
        const comparisonQuality = combineFractalQuality([sourceAnalysis.quality, cropAnalysis.quality])
        setEvidence({
          status: 'ready',
          message:
            comparisonQuality?.level === 'unreliable'
              ? 'Fractal comparison is unstable, so the result is being withheld as low confidence.'
              : 'Fractal comparison is ready. The candidate crop and whole scan can now be read side by side.',
          source: {
            fractalDimension: sourceAnalysis.fractalDimension,
            fitR2: sourceAnalysis.fitR2,
            quality: sourceAnalysis.quality,
          },
          crop: {
            fractalDimension: cropAnalysis.fractalDimension,
            fitR2: cropAnalysis.fitR2,
            quality: cropAnalysis.quality,
          },
          delta: comparisonQuality?.level === 'unreliable' ? null : delta,
          quality: comparisonQuality,
        })
      } catch (error) {
        if (!active) {
          return
        }

        setEvidence({
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to measure fractal complexity.',
          source: null,
          crop: null,
          delta: null,
          quality: null,
        })
      }
    }

    void run()

    return () => {
      active = false
    }
  }, [cropImageUrl, file])

  return evidence
}
