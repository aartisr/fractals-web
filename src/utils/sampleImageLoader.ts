import { SAMPLE_IMAGES } from '../data/sampleImages'
import type { SampleImageItem } from '../types'

export function getSampleImages(category?: 'box-counting' | 'compare' | 'tumor' | 'fractal' | 'all'): SampleImageItem[] {
  if (!category || category === 'all') return SAMPLE_IMAGES
  if (category === 'box-counting') {
    // Return all images suitable for single-image box-counting analysis (clinical organs + benchmarks)
    return SAMPLE_IMAGES.filter((img) => img.category === 'tumor' || img.category === 'box-counting')
  }
  return SAMPLE_IMAGES.filter((img) => img.category === category)
}

export async function sampleImageToFile(sample: SampleImageItem, isSecond = false): Promise<File> {
  const url = isSecond && sample.secondUrl ? sample.secondUrl : sample.url
  const response = await fetch(url)
  const blob = await response.blob()
  const name = `${sample.id}${isSecond ? '-pair' : ''}.png`
  return new File([blob], name, { type: 'image/png' })
}

export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return new File([blob], filename, { type: 'image/png' })
}
