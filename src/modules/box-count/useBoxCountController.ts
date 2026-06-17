import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useOverlayPreference } from '../../core/hooks/useOverlayPreference'
import { api } from '../../core/services/api'
import type { BoxCountRoiDraft, BoxCountRoiInput } from './types'
import { buildBoxCountInsight } from './analysisInsights'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

interface BoxCountSample {
  id: string
  createdAt: string
  roi: BoxCountRoiInput
  fractalDimension: number
  elapsedSeconds: number
  fitR2: number
  complexityLabel: string
}

export function useBoxCountController() {
  const [file, setFile] = useState<File | null>(null)
  const [roi, setRoi] = useState<BoxCountRoiInput>({ x: 120, y: 120, size: 128 })
  const [hasPlacedRoi, setHasPlacedRoi] = useState(false)
  const [loadedImageUrl, setLoadedImageUrl] = useState('')
  const [roiDraft, setRoiDraft] = useState<BoxCountRoiDraft | null>(null)
  const [samples, setSamples] = useState<BoxCountSample[]>([])
  const [autoAnalyzeOnPlacement, setAutoAnalyzeOnPlacement] = useState(true)
  const [interactionImageBounds, setInteractionImageBounds] = useState<{ width: number; height: number } | null>(null)
  const [showOverlays, setShowOverlays] = useOverlayPreference('box-count.overlay.visible')

  const analyzeMutation = useMutation({
    mutationFn: async (values: BoxCountRoiInput) => {
      if (!file) {
        throw new Error('Upload an image before running analysis.')
      }
      return api.analyzeBoxCount(file, values)
    },
  })

  const sourcePreviewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file])

  useEffect(() => {
    return () => {
      if (sourcePreviewUrl) {
        URL.revokeObjectURL(sourcePreviewUrl)
      }
    }
  }, [sourcePreviewUrl])

  const displayImageUrl = useMemo(() => {
    return analyzeMutation.data?.previewUrl || sourcePreviewUrl
  }, [analyzeMutation.data?.previewUrl, sourcePreviewUrl])

  const onFileChange = (nextFile: File | null) => {
    setFile(nextFile)
    setRoi({ x: 120, y: 120, size: 128 })
    setHasPlacedRoi(false)
    setLoadedImageUrl('')
    setRoiDraft(null)
    setInteractionImageBounds(null)
    setSamples([])
    analyzeMutation.reset()
  }

  const runAnalysis = async (values: BoxCountRoiInput) => {
    await analyzeMutation.mutateAsync(values)
  }

  const markImageLoaded = () => {
    if (!displayImageUrl) {
      return
    }

    setLoadedImageUrl(displayImageUrl)
  }

  const setRoiAndClamp = (nextRoi: BoxCountRoiInput, bounds?: { width: number; height: number } | null) => {
    if (!bounds) {
      setRoi({
        x: Math.max(0, Math.round(nextRoi.x)),
        y: Math.max(0, Math.round(nextRoi.y)),
        size: clamp(Math.round(nextRoi.size), 16, 1024),
      })
      return
    }

    const size = clamp(Math.round(nextRoi.size), 16, Math.max(16, Math.min(bounds.width, bounds.height)))
    const x = clamp(Math.round(nextRoi.x), 0, Math.max(0, bounds.width - size))
    const y = clamp(Math.round(nextRoi.y), 0, Math.max(0, bounds.height - size))

    setRoi({ x, y, size })
  }

  const getRoiBounds = (imageWidth: number, imageHeight: number, roiSize: number) => {
    const maxX = Math.max(0, imageWidth - roiSize)
    const maxY = Math.max(0, imageHeight - roiSize)

    return {
      roiSize,
      maxX,
      maxY,
    }
  }

  const setRoiAnchorFromImage = async (x: number, y: number, imageWidth: number, imageHeight: number) => {
    setInteractionImageBounds({ width: imageWidth, height: imageHeight })
    const { maxX, maxY } = getRoiBounds(imageWidth, imageHeight, roi.size)
    const nextRoi = {
      ...roi,
      x: clamp(Math.round(x), 0, maxX),
      y: clamp(Math.round(y), 0, maxY),
    }
    setRoi(nextRoi)
    setHasPlacedRoi(true)
    setRoiDraft(null)
    if (autoAnalyzeOnPlacement && file) {
      await runAnalysis(nextRoi)
    }
  }

  const updateRoiDraftFromDrag = (startX: number, startY: number, currentX: number, currentY: number, imageWidth: number, imageHeight: number) => {
    const dx = currentX - startX
    const dy = currentY - startY
    const side = Math.max(1, Math.round(Math.max(Math.abs(dx), Math.abs(dy))))
    const rawX = dx >= 0 ? startX : startX - side
    const rawY = dy >= 0 ? startY : startY - side

    const boundedSide = Math.max(1, Math.min(side, imageWidth, imageHeight))
    const boundedX = clamp(Math.round(rawX), 0, Math.max(0, imageWidth - boundedSide))
    const boundedY = clamp(Math.round(rawY), 0, Math.max(0, imageHeight - boundedSide))

    setRoiDraft({
      x: boundedX,
      y: boundedY,
      size: boundedSide,
    })
  }

  const commitRoiDraft = async (draft: BoxCountRoiDraft, imageWidth: number, imageHeight: number) => {
    setInteractionImageBounds({ width: imageWidth, height: imageHeight })
    const maxSize = Math.max(16, Math.min(imageWidth - draft.x, imageHeight - draft.y))
    const nextSize = clamp(Math.round(draft.size), 16, maxSize)
    const maxX = Math.max(0, imageWidth - nextSize)
    const maxY = Math.max(0, imageHeight - nextSize)

    const nextRoi = {
      x: clamp(Math.round(draft.x), 0, maxX),
      y: clamp(Math.round(draft.y), 0, maxY),
      size: nextSize,
    }
    setRoi(nextRoi)
    setHasPlacedRoi(true)
    setRoiDraft(null)
    if (autoAnalyzeOnPlacement && file) {
      await runAnalysis(nextRoi)
    }
  }

  const onRoiChange = (patch: Partial<BoxCountRoiInput>) => {
    const next = { ...roi, ...patch }
    setRoiAndClamp(next, interactionImageBounds)
  }

  const insight = useMemo(() => buildBoxCountInsight(analyzeMutation.data), [analyzeMutation.data])

  const addCurrentSample = () => {
    if (!analyzeMutation.data || !insight) {
      return
    }

    const sample: BoxCountSample = {
      id: `sample_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      roi: { ...analyzeMutation.data.roi },
      fractalDimension: analyzeMutation.data.fractalDimension,
      elapsedSeconds: analyzeMutation.data.elapsedSeconds,
      fitR2: insight.fitR2,
      complexityLabel: insight.complexityLabel,
    }

    setSamples((prev) => [sample, ...prev].slice(0, 20))
  }

  const applySampleRoi = (sample: BoxCountSample) => {
    setRoiAndClamp(sample.roi, interactionImageBounds)
    setHasPlacedRoi(true)
  }

  const clearSamples = () => {
    setSamples([])
  }

  const exportSamplesCsv = () => {
    if (!samples.length) {
      return ''
    }

    const header = ['timestamp', 'roi_x', 'roi_y', 'roi_size', 'fractal_dimension', 'elapsed_seconds', 'fit_r2', 'complexity_label']
    const rows = samples.map((sample) => [
      sample.createdAt,
      sample.roi.x,
      sample.roi.y,
      sample.roi.size,
      sample.fractalDimension,
      sample.elapsedSeconds,
      sample.fitR2,
      sample.complexityLabel,
    ])

    return [header.join(','), ...rows.map((row) => row.join(','))].join('\n')
  }

  const labChecklist = {
    uploadedImage: !!file,
    placedRoi: hasPlacedRoi,
    ranAnalysis: !!analyzeMutation.data,
    collectedSamples: samples.length >= 3,
    stableFitObserved: samples.some((sample) => sample.fitR2 >= 0.9),
  }

  const isDisplayLoading = analyzeMutation.isPending || (!!displayImageUrl && loadedImageUrl !== displayImageUrl)

  return {
    file,
    roi,
    hasPlacedRoi,
    onFileChange,
    onRoiChange,
    onSubmit: async () => {
      await runAnalysis(roi)
    },
    result: analyzeMutation.data,
    insight,
    error: analyzeMutation.error instanceof Error ? analyzeMutation.error.message : '',
    samples,
    addCurrentSample,
    clearSamples,
    applySampleRoi,
    exportSamplesCsv,
    labChecklist,
    sourcePreviewUrl,
    displayImageUrl,
    isSubmitting: analyzeMutation.isPending,
    isDisplayLoading,
    canSubmit: !!file && !analyzeMutation.isPending,
    autoAnalyzeOnPlacement,
    setAutoAnalyzeOnPlacement,
    roiDraft,
    showOverlays,
    setShowOverlays,
    markImageLoaded,
    setRoiAnchorFromImage,
    updateRoiDraftFromDrag,
    commitRoiDraft,
    clearRoiDraft: () => setRoiDraft(null),
  }
}
