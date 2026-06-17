import type { BoxCountResult } from '../../core/services/contracts'

export interface BoxCountRoiInput {
  x: number
  y: number
  size: number
}

export interface BoxCountRoiDraft {
  x: number
  y: number
  size: number
}

export interface BoxCountDisplayState {
  file: File | null
  sourcePreviewUrl: string
  result: BoxCountResult | undefined
  displayImageUrl: string
  isSubmitting: boolean
  isDisplayLoading: boolean
  canSubmit: boolean
  showOverlays: boolean
  roiDraft: BoxCountRoiDraft | null
}
