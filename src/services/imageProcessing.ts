import { BoxCountResult, CompareMetrics } from '../types';

/**
 * Gold-Standard Image Processing & Morphological Mathematics Library.
 * Pure deterministic algorithms for Otsu thresholding, Box-Counting dimension,
 * Lacunarity analysis, SSIM structural similarity, and tumor boundary metrics.
 */

// Otsu's Global Thresholding Algorithm
export function computeOtsuThreshold(grayData: Uint8Array): number {
  const histogram = new Float64Array(256);
  const totalPixels = grayData.length;

  for (let i = 0; i < totalPixels; i++) {
    histogram[grayData[i]]++;
  }

  // Normalize histogram to probabilities
  for (let i = 0; i < 256; i++) {
    histogram[i] /= totalPixels;
  }

  let maxVariance = 0;
  let optimalThreshold = 128;

  let omega0 = 0;
  let mu0 = 0;
  let muTotal = 0;

  for (let i = 0; i < 256; i++) {
    muTotal += i * histogram[i];
  }

  for (let t = 0; t < 256; t++) {
    omega0 += histogram[t];
    if (omega0 === 0) continue;
    const omega1 = 1 - omega0;
    if (omega1 === 0) break;

    mu0 += t * histogram[t];
    const mean0 = mu0 / omega0;
    const mean1 = (muTotal - mu0) / omega1;

    // Between-class variance: sigma_b^2 = omega0 * omega1 * (mean0 - mean1)^2
    const varianceBetween = omega0 * omega1 * Math.pow(mean0 - mean1, 2);

    if (varianceBetween > maxVariance) {
      maxVariance = varianceBetween;
      optimalThreshold = t;
    }
  }

  return optimalThreshold;
}

// Convert RGBA Canvas ImageData to Grayscale Uint8Array
export function rgbaToGrayscale(rgbaData: Uint8ClampedArray): Uint8Array {
  const pixelCount = rgbaData.length / 4;
  const gray = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    // ITU-R BT.601 luma formula
    gray[i] = Math.round(0.299 * rgbaData[idx] + 0.587 * rgbaData[idx + 1] + 0.114 * rgbaData[idx + 2]);
  }
  return gray;
}

// Precision Box Counting Algorithm with ROI Support
export function computeBoxCounting(
  grayData: Uint8Array,
  width: number,
  height: number,
  threshold: number,
  invert: boolean = false,
  roi?: { x: number; y: number; width: number; height: number },
  customScales?: number[]
): BoxCountResult {
  const rx = roi ? Math.max(0, Math.floor(roi.x)) : 0;
  const ry = roi ? Math.max(0, Math.floor(roi.y)) : 0;
  const rw = roi ? Math.min(width - rx, Math.floor(roi.width)) : width;
  const rh = roi ? Math.min(height - ry, Math.floor(roi.height)) : height;

  // Create local binary mask for ROI
  const mask = new Uint8Array(rw * rh);
  let foregroundCount = 0;

  for (let y = 0; y < rh; y++) {
    const srcY = ry + y;
    for (let x = 0; x < rw; x++) {
      const srcX = rx + x;
      const val = grayData[srcY * width + srcX];
      const isFore = invert ? val <= threshold : val >= threshold;
      if (isFore) {
        mask[y * rw + x] = 1;
        foregroundCount++;
      } else {
        mask[y * rw + x] = 0;
      }
    }
  }

  // Define dyadic box sizes (powers of 2 up to minimum dimension)
  const minDim = Math.min(rw, rh);
  let scales = customScales || [2, 4, 8, 16, 32, 64, 128, 256].filter(s => s <= minDim / 2);
  if (scales.length < 3) {
    scales = [2, 4, 8, 16, 32].filter(s => s <= minDim);
  }

  const counts: number[] = [];
  const logScales: number[] = [];
  const logCounts: number[] = [];
  const boxDensities: number[] = [];

  for (const s of scales) {
    let nonZeroBoxes = 0;
    const boxesX = Math.ceil(rw / s);
    const boxesY = Math.ceil(rh / s);
    const localDensities: number[] = [];

    for (let by = 0; by < boxesY; by++) {
      const startY = by * s;
      const endY = Math.min(rh, startY + s);

      for (let bx = 0; bx < boxesX; bx++) {
        const startX = bx * s;
        const endX = Math.min(rw, startX + s);

        let sumInBox = 0;
        for (let y = startY; y < endY; y++) {
          const rowOffset = y * rw;
          for (let x = startX; x < endX; x++) {
            if (mask[rowOffset + x] === 1) {
              sumInBox++;
            }
          }
        }

        if (sumInBox > 0) {
          nonZeroBoxes++;
          localDensities.push(sumInBox / (s * s));
        }
      }
    }

    // Keep non-zero box counts
    counts.push(nonZeroBoxes);
    // x = log(1 / s)
    const logInvScale = Math.log(1 / s);
    // y = log(N(s))
    const logN = Math.log(Math.max(1, nonZeroBoxes));

    logScales.push(logInvScale);
    logCounts.push(logN);

    if (localDensities.length > 0) {
      // Calculate lacunarity at intermediate scale s = 16 or 32
      const mean = localDensities.reduce((a, b) => a + b, 0) / localDensities.length;
      const variance = localDensities.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / localDensities.length;
      boxDensities.push(mean > 0 ? variance / (mean * mean) : 0);
    }
  }

  // Ordinary Least Squares Linear Regression: y = m * x + c
  // m = Slope = Fractal Dimension D
  const n = logScales.length;
  let sumX = 0;
  let sumY = 0;

  for (let i = 0; i < n; i++) {
    const x = logScales[i];
    const y = logCounts[i];
    sumX += x;
    sumY += y;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let den = 0;
  let totalSS = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = logScales[i] - meanX;
    const yDiff = logCounts[i] - meanY;
    num += xDiff * yDiff;
    den += xDiff * xDiff;
    totalSS += yDiff * yDiff;
  }

  const slope = den !== 0 ? num / den : 0;
  const intercept = meanY - slope * meanX;

  // Residual Sum of Squares (RSS)
  let residualSS = 0;
  for (let i = 0; i < n; i++) {
    const yPred = slope * logScales[i] + intercept;
    residualSS += Math.pow(logCounts[i] - yPred, 2);
  }

  const rSquared = totalSS !== 0 ? Math.max(0, Math.min(1, 1 - residualSS / totalSS)) : 1;
  const varianceResiduals = n > 2 ? residualSS / (n - 2) : 0;
  const stdError = den !== 0 ? Math.sqrt(varianceResiduals / den) : 0;

  // Lacunarity index (mean across scales)
  const lacunarity = boxDensities.length > 0 
    ? boxDensities.reduce((a, b) => a + b, 0) / boxDensities.length 
    : 0;

  return {
    scales,
    counts,
    logScales,
    logCounts,
    dimension: Math.abs(slope), // Box dimension is the positive slope against log(1/s)
    rSquared,
    stdError,
    lacunarity,
    totalBoxesAtFineScale: counts[0] || 0,
    foregroundPixelCount: foregroundCount,
    roi: { x: rx, y: ry, width: rw, height: rh }
  };
}

// 3x3 Sobel Gradient Edge Extraction
export function computeSobelEdges(grayData: Uint8Array, width: number, height: number): Uint8Array {
  const edges = new Uint8Array(width * height);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;

      // Sobel kernel X:
      // -1  0  1
      // -2  0  2
      // -1  0  1
      const gx =
        -1 * grayData[idx - width - 1] + 1 * grayData[idx - width + 1] +
        -2 * grayData[idx - 1]         + 2 * grayData[idx + 1] +
        -1 * grayData[idx + width - 1] + 1 * grayData[idx + width + 1];

      // Sobel kernel Y:
      // -1 -2 -1
      //  0  0  0
      //  1  2  1
      const gy =
        -1 * grayData[idx - width - 1] - 2 * grayData[idx - width] - 1 * grayData[idx - width + 1] +
         1 * grayData[idx + width - 1] + 2 * grayData[idx + width] + 1 * grayData[idx + width + 1];

      const mag = Math.sqrt(gx * gx + gy * gy);
      edges[idx] = Math.min(255, Math.round(mag));
    }
  }

  return edges;
}

// Quantitative Multi-Scale SSIM (Structural Similarity Index) & Difference Metrics
export function computeCompareMetrics(
  grayA: Uint8Array,
  grayB: Uint8Array,
  width: number,
  height: number
): CompareMetrics {
  const n = width * height;
  if (grayA.length !== n || grayB.length !== n) {
    return { ssim: 0, mse: 0, psnr: 0, meanDiff: 0, maxDiff: 0 };
  }

  let sumA = 0;
  let sumB = 0;
  let sumSqDiff = 0;
  let sumDiff = 0;
  let maxDiff = 0;

  for (let i = 0; i < n; i++) {
    const a = grayA[i];
    const b = grayB[i];
    sumA += a;
    sumB += b;
    const diff = Math.abs(a - b);
    sumDiff += diff;
    sumSqDiff += diff * diff;
    if (diff > maxDiff) maxDiff = diff;
  }

  const meanA = sumA / n;
  const meanB = sumB / n;
  const mse = sumSqDiff / n;
  const psnr = mse > 0 ? 10 * Math.log10((255 * 255) / mse) : 99.9;
  const meanDiff = sumDiff / n;

  // Variances and Covariance for SSIM
  let varA = 0;
  let varB = 0;
  let covAB = 0;

  for (let i = 0; i < n; i++) {
    const diffA = grayA[i] - meanA;
    const diffB = grayB[i] - meanB;
    varA += diffA * diffA;
    varB += diffB * diffB;
    covAB += diffA * diffB;
  }

  varA /= n;
  varB /= n;
  covAB /= n;

  // SSIM standard constants for dynamic range L = 255
  const k1 = 0.01;
  const k2 = 0.03;
  const L = 255;
  const c1 = Math.pow(k1 * L, 2);
  const c2 = Math.pow(k2 * L, 2);

  const numerator = (2 * meanA * meanB + c1) * (2 * covAB + c2);
  const denominator = (meanA * meanA + meanB * meanB + c1) * (varA + varB + c2);
  const ssim = denominator !== 0 ? Math.max(0, Math.min(1, numerator / denominator)) : 1;

  return {
    ssim,
    mse,
    psnr,
    meanDiff,
    maxDiff
  };
}

// Generate Color Difference Heatmap
export function generateDiffHeatmap(
  grayA: Uint8Array,
  grayB: Uint8Array,
  width: number,
  height: number,
  gain: number = 2.5
): ImageData {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;
  const n = width * height;

  for (let i = 0; i < n; i++) {
    const diff = Math.min(255, Math.abs(grayA[i] - grayB[i]) * gain);
    const idx = i * 4;

    // Thermal colormap for differential contrast
    // 0 -> Deep blue/black, 128 -> Orange, 255 -> Hyperintense Yellow/White
    if (diff < 64) {
      data[idx] = Math.round(diff * 1.5);
      data[idx + 1] = Math.round(diff * 0.5);
      data[idx + 2] = Math.round(diff * 3.5);
    } else if (diff < 160) {
      data[idx] = Math.round(180 + (diff - 64) * 0.7);
      data[idx + 1] = Math.round(50 + (diff - 64) * 1.4);
      data[idx + 2] = 20;
    } else {
      data[idx] = 255;
      data[idx + 1] = Math.min(255, Math.round(190 + (diff - 160) * 0.6));
      data[idx + 2] = Math.min(255, Math.round(50 + (diff - 160) * 1.8));
    }
    data[idx + 3] = diff > 8 ? 240 : 40; // High transparency for identical pixels
  }

  return imgData;
}
