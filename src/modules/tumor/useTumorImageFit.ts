import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties, SyntheticEvent } from 'react'

type Size = {
  width: number
  height: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function useTumorImageFit() {
  const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(null)
  const [containerSize, setContainerSize] = useState<Size | null>(null)
  const [imageSize, setImageSize] = useState<Size | null>(null)

  useEffect(() => {
    const element = containerNode
    if (!element) {
      return
    }

    const updateSize = () => {
      const rect = element.getBoundingClientRect()
      setContainerSize((current) => {
        const next = { width: Math.round(rect.width), height: Math.round(rect.height) }
        if (current?.width === next.width && current?.height === next.height) {
          return current
        }
        return next
      })
    }

    updateSize()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize)
      return () => window.removeEventListener('resize', updateSize)
    }

    const observer = new ResizeObserver(updateSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [containerNode])

  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerNode(node)
  }, [])

  const onImageLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget
    const nextSize = {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    }
    setImageSize((current) =>
      current?.width === nextSize.width && current?.height === nextSize.height ? current : nextSize,
    )
  }, [])

  const fitSize = useMemo(() => {
    if (!containerSize || !imageSize || imageSize.width <= 0 || imageSize.height <= 0) {
      return null
    }

    const scale = clamp(Math.min(containerSize.width / imageSize.width, containerSize.height / imageSize.height), 0.05, 20)
    return {
      width: Math.max(1, Math.round(imageSize.width * scale)),
      height: Math.max(1, Math.round(imageSize.height * scale)),
    }
  }, [containerSize, imageSize])

  const imageStyle = useMemo<CSSProperties>(() => {
    if (!fitSize) {
      return {
        display: 'block',
        width: 'auto',
        height: 'auto',
      }
    }

    return {
      display: 'block',
      width: `${fitSize.width}px`,
      height: `${fitSize.height}px`,
    }
  }, [fitSize])

  return {
    fitSize,
    imageStyle,
    onImageLoad,
    setContainerRef,
  }
}
