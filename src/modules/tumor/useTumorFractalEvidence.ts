import { useEffect, useState } from 'react'
import { buildCompareImageVisuals } from '../compare/compareVisuals'

type FractalEvidence = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  message: string
  source: { fractalDimension: number; fitR2: number } | null
  crop: { fractalDimension: number; fitR2: number } | null
  delta: number | null
}

const makeIdleState = (): FractalEvidence => ({
  status: 'idle',
  message: 'Select an image to measure fractal complexity.',
  source: null,
  crop: null,
  delta: null,
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
          setEvidence({
            status: 'ready',
            message: 'Whole-scan fractal complexity is ready. Run detection to compare it with the tumor candidate crop.',
            source: { fractalDimension: sourceAnalysis.fractalDimension, fitR2: sourceAnalysis.fitR2 },
            crop: null,
            delta: null,
          })
          return
        }

        const cropFile = await dataUrlToFile(cropImageUrl, 'tumor-crop.png')
        const cropAnalysis = await buildCompareImageVisuals(cropFile)
        if (!active) {
          return
        }

        const delta = Number((cropAnalysis.fractalDimension - sourceAnalysis.fractalDimension).toFixed(4))
        setEvidence({
          status: 'ready',
          message: 'Fractal comparison is ready. The candidate crop and whole scan can now be read side by side.',
          source: { fractalDimension: sourceAnalysis.fractalDimension, fitR2: sourceAnalysis.fitR2 },
          crop: { fractalDimension: cropAnalysis.fractalDimension, fitR2: cropAnalysis.fitR2 },
          delta,
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
