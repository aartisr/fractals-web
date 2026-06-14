/**
 * research-analysis.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Research-grade fractal analysis tools for educational exploration.
 *
 * Implements techniques from academic fractal analysis literature:
 * - Box-counting fractal dimension (Hausdorff dimension approximation)
 * - Lacunarity and gap analysis
 * - Self-similarity metrics
 * - Iteration depth to color mapping analysis
 */

// ── Fractal Dimension Analysis ─────────────────────────────────────────────

/** Result of box-counting fractal dimension analysis. */
export type FractalDimensionResult = {
  estimatedDimension: number
  confidence: number // 0-1, how reliable the estimate is
  boxSizes: number[]
  boxCounts: number[]
  correlationCoefficient: number // R² value of linear fit
}

/**
 * Estimates fractal dimension using box-counting method.
 * This is the standard academic approach from fractal geometry.
 *
 * @param pixelData - ImageData from canvas (RGBA format)
 * @param threshold - Color intensity threshold (0-255) to count as "fractal"
 * @returns Estimated Hausdorff dimension and statistical measures
 */
export const estimateFractalDimension = (
  pixelData: ImageData,
  threshold = 128,
): FractalDimensionResult => {
  const width = pixelData.width
  const height = pixelData.height
  const data = pixelData.data

  // Define box sizes: powers of 2 from 2 to min(width, height) / 2
  const maxBoxSize = Math.min(width, height) / 2
  const boxSizes: number[] = []
  const boxCounts: number[] = []

  for (let size = 2; size <= maxBoxSize; size *= 2) {
    boxSizes.push(size)
    let count = 0
    const boxesPerRow = Math.ceil(width / size)
    const boxesPerCol = Math.ceil(height / size)

    // Count boxes containing fractal pixels
    for (let by = 0; by < boxesPerCol; by++) {
      for (let bx = 0; bx < boxesPerRow; bx++) {
        const x0 = bx * size
        const y0 = by * size
        const x1 = Math.min(x0 + size, width)
        const y1 = Math.min(y0 + size, height)

        let hasPixel = false
        for (let y = y0; y < y1 && !hasPixel; y++) {
          for (let x = x0; x < x1 && !hasPixel; x++) {
            const idx = (y * width + x) * 4
            // Sum RGB channels; high values indicate fractal region
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
            if (brightness >= threshold) {
              hasPixel = true
            }
          }
        }
        if (hasPixel) count++
      }
    }
    boxCounts.push(count)
  }

  // Linear regression: log(count) vs log(1/size)
  // Slope approximates -D (fractal dimension)
  const n = boxSizes.length
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0,
    sumY2 = 0

  for (let i = 0; i < n; i++) {
    const x = Math.log(1 / boxSizes[i])
    const y = Math.log(boxCounts[i])
    sumX += x
    sumY += y
    sumXY += x * y
    sumX2 += x * x
    sumY2 += y * y
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  // R² value indicates goodness of fit
  const yMean = sumY / n
  const ssTotal = sumY2 - (n * yMean * yMean)
  const ssResidual = boxCounts.reduce((sum, count, i) => {
    const predictedY = slope * Math.log(1 / boxSizes[i]) + intercept
    return sum + Math.pow(Math.log(count) - predictedY, 2)
  }, 0)
  const r2 = 1 - ssResidual / ssTotal

  return {
    estimatedDimension: -slope,
    confidence: Math.min(1, r2),
    boxSizes,
    boxCounts,
    correlationCoefficient: r2,
  }
}

// ── Lacunarity Analysis ────────────────────────────────────────────────────

/** Lacunarity measures gap sizes and spacing uniformity in fractals. */
export type LacunarityResult = {
  lacunarity: number // Gap uniformity measure (higher = more irregular)
  gapSizeDistribution: number[] // Histogram of gap sizes
  averageGapSize: number
  gapUniformity: number // 0-1, higher = more uniform gaps
}

/**
 * Analyzes lacunarity: the size and distribution of gaps in the fractal.
 * Fractals with similar structures at different scales show consistent lacunarity.
 */
export const analyzeLacunarity = (pixelData: ImageData): LacunarityResult => {
  const width = pixelData.width
  const height = pixelData.height
  const data = pixelData.data
  const threshold = 200

  const gapSizes: number[] = []
  const gapDistribution: number[] = new Array(Math.max(width, height)).fill(0)

  // Horizontal gap analysis
  for (let y = 0; y < height; y += 8) {
    let gapSize = 0
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
      if (brightness >= threshold) {
        if (gapSize > 0) {
          gapSizes.push(gapSize)
          if (gapSize < gapDistribution.length) gapDistribution[gapSize]++
        }
        gapSize = 0
      } else {
        gapSize++
      }
    }
  }

  const avgGap = gapSizes.length > 0 ? gapSizes.reduce((a, b) => a + b) / gapSizes.length : 0
  const variance =
    gapSizes.length > 0
      ? gapSizes.reduce((sum, g) => sum + Math.pow(g - avgGap, 2), 0) / gapSizes.length
      : 0

  // Lacunarity = variance / mean² (higher = more irregular)
  const lacunarity = avgGap > 0 ? variance / (avgGap * avgGap) : 0

  // Uniformity: 1 - coefficient of variation
  const uniformity = Math.max(0, 1 - Math.sqrt(variance) / (avgGap + 1))

  return {
    lacunarity,
    gapSizeDistribution: gapDistribution.slice(0, 128),
    averageGapSize: avgGap,
    gapUniformity: uniformity,
  }
}

// ── Self-Similarity Metric ────────────────────────────────────────────────

/**
 * Quantifies self-similarity by comparing regions at different scales.
 * Returns a score 0-1 where 1 = perfect self-similarity.
 */
export const measureSelfSimilarity = (pixelData: ImageData): number => {
  const width = pixelData.width
  const height = pixelData.height
  const data = pixelData.data

  // Compare full image with 2x downsampled version
  const fullHash = computeImageHash(pixelData)

  // Create half-resolution version
  const halfWidth = Math.floor(width / 2)
  const halfHeight = Math.floor(height / 2)
  const halfData = new Uint8ClampedArray(halfWidth * halfHeight * 4)

  for (let y = 0; y < halfHeight; y++) {
    for (let x = 0; x < halfWidth; x++) {
      const srcIdx = ((y * 2) * width + x * 2) * 4
      const dstIdx = (y * halfWidth + x) * 4
      // Simple average of 2x2 block
      halfData[dstIdx] = (data[srcIdx] + data[srcIdx + 4] + data[srcIdx + width * 4] + data[srcIdx + width * 4 + 4]) / 4
      halfData[dstIdx + 1] = (data[srcIdx + 1] + data[srcIdx + 5] + data[srcIdx + width * 4 + 1] + data[srcIdx + width * 4 + 5]) / 4
      halfData[dstIdx + 2] = (data[srcIdx + 2] + data[srcIdx + 6] + data[srcIdx + width * 4 + 2] + data[srcIdx + width * 4 + 6]) / 4
      halfData[dstIdx + 3] = 255
    }
  }

  const halfImageData = new ImageData(halfData, halfWidth, halfHeight)
  const halfHash = computeImageHash(halfImageData)

  // Compare hashes (Hamming distance)
  let differences = 0
  for (let i = 0; i < Math.min(fullHash.length, halfHash.length); i++) {
    differences += Math.abs(fullHash[i] - halfHash[i])
  }

  return Math.max(0, 1 - differences / (256 * 10))
}

/** Compute a simple statistical hash of image content. */
const computeImageHash = (imageData: ImageData): number[] => {
  const data = imageData.data
  const histogram = new Array(256).fill(0)

  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
    histogram[Math.floor(brightness)]++
  }

  return histogram
}

// ── Iteration Complexity Analysis ──────────────────────────────────────────

export type IterationAnalysis = {
  colorTransitionPoints: number[] // Iteration values where color palette transitions
  complexityGrowth: number // Rate of detail increase with iterations
  estimatedOptimalIterations: number // Suggested max iterations for this viewport
}

/**
 * Analyzes how iteration depth affects color distribution.
 * Helps determine optimal iteration counts for rendering.
 */
export const analyzeIterationComplexity = (pixelData: ImageData): IterationAnalysis => {
  const data = pixelData.data
  const colorBuckets = new Array(256).fill(0)

  for (let i = 0; i < data.length; i += 4) {
    const hue = (Math.atan2(data[i + 1], data[i]) * 180) / Math.PI + 180
    colorBuckets[Math.floor(hue)]++
  }

  // Find peaks in color distribution (iteration transition points)
  const transitions: number[] = []
  for (let i = 1; i < colorBuckets.length - 1; i++) {
    if (colorBuckets[i] > colorBuckets[i - 1] && colorBuckets[i] > colorBuckets[i + 1]) {
      transitions.push(i)
    }
  }

  // Estimate complexity growth
  const nonzero = colorBuckets.filter((v) => v > 0).length
  const complexityGrowth = nonzero / 256

  return {
    colorTransitionPoints: transitions.slice(0, 8),
    complexityGrowth,
    estimatedOptimalIterations: Math.round(256 * (1 + complexityGrowth)),
  }
}

// ── Research Summary ───────────────────────────────────────────────────────

export type FractalResearchSummary = {
  dimension: FractalDimensionResult
  lacunarity: LacunarityResult
  selfSimilarity: number
  iteration: IterationAnalysis
  recommendations: string[]
}

export const generateResearchSummary = (pixelData: ImageData): FractalResearchSummary => {
  const dimension = estimateFractalDimension(pixelData)
  const lacunarity = analyzeLacunarity(pixelData)
  const selfSimilarity = measureSelfSimilarity(pixelData)
  const iteration = analyzeIterationComplexity(pixelData)

  const recommendations: string[] = []

  if (dimension.confidence < 0.7) {
    recommendations.push('Low confidence in dimension estimate; try refining the zoom level.')
  }
  if (dimension.estimatedDimension < 1.3 || dimension.estimatedDimension > 2.0) {
    recommendations.push(`Unusual dimension (${dimension.estimatedDimension.toFixed(2)}); verify fractal type.`)
  }
  if (lacunarity.lacunarity > 1.5) {
    recommendations.push('High lacunarity suggests irregular gap distribution; explore different regions.')
  }
  if (selfSimilarity < 0.5) {
    recommendations.push('Low self-similarity detected; may indicate edge of fractal basin.')
  }
  if (iteration.complexityGrowth > 0.8) {
    recommendations.push('High color complexity; consider increasing iteration depth for finer detail.')
  }

  return {
    dimension,
    lacunarity,
    selfSimilarity,
    iteration,
    recommendations,
  }
}
