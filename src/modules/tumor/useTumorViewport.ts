import { useCallback, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'

type PanOffset = { x: number; y: number }
type Point = { x: number; y: number }

type DragState = {
  pointerId: number
  start: Point
  startPan: PanOffset
}

type PinchState = {
  pointerIds: [number, number]
  startDistance: number
  startZoom: number
  startPan: PanOffset
  startMidpoint: Point
  viewportCenter: Point
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function useTumorViewport(file: File | null) {
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState<PanOffset>({ x: 0, y: 0 })
  const dragStateRef = useRef<DragState | null>(null)
  const pinchStateRef = useRef<PinchState | null>(null)
  const pointerPositionsRef = useRef(new Map<number, Point>())

  const resetViewport = useCallback(() => {
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
    dragStateRef.current = null
    pinchStateRef.current = null
    pointerPositionsRef.current.clear()
  }, [])

  const clampZoom = useCallback((value: number) => clamp(Number(value.toFixed(2)), 0.5, 2.5), [])

  const adjustZoom = useCallback(
    (delta: number) => {
      setZoomLevel((current) => clampZoom(current + delta))
    },
    [clampZoom],
  )

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      if (!file) {
        return
      }

      event.preventDefault()
      const delta = event.deltaY > 0 ? -0.1 : 0.1
      setZoomLevel((current) => clampZoom(current + delta))
    },
    [clampZoom, file],
  )

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!file) {
        return
      }

      const viewport = event.currentTarget
      pointerPositionsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      viewport.setPointerCapture(event.pointerId)

      const pointerIds = Array.from(pointerPositionsRef.current.keys())
      if (pointerIds.length === 1) {
        dragStateRef.current = {
          pointerId: event.pointerId,
          start: { x: event.clientX, y: event.clientY },
          startPan: panOffset,
        }
        pinchStateRef.current = null
        return
      }

      if (pointerIds.length >= 2) {
        const [pointerIdA, pointerIdB] = pointerIds.slice(-2) as [number, number]
        const pointerA = pointerPositionsRef.current.get(pointerIdA)
        const pointerB = pointerPositionsRef.current.get(pointerIdB)
        if (!pointerA || !pointerB) {
          return
        }

        const distance = Math.hypot(pointerB.x - pointerA.x, pointerB.y - pointerA.y)
        if (distance <= 0) {
          return
        }

        const rect = viewport.getBoundingClientRect()
        dragStateRef.current = null
        pinchStateRef.current = {
          pointerIds: [pointerIdA, pointerIdB],
          startDistance: distance,
          startZoom: zoomLevel,
          startPan: panOffset,
          startMidpoint: { x: (pointerA.x + pointerB.x) / 2, y: (pointerA.y + pointerB.y) / 2 },
          viewportCenter: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        }
      }
    },
    [file, panOffset, zoomLevel],
  )

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pointerPositionsRef.current.has(event.pointerId)) {
        return
      }

      pointerPositionsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

      const pinchState = pinchStateRef.current
      if (pinchState && pinchState.pointerIds.includes(event.pointerId)) {
        const [pointerIdA, pointerIdB] = pinchState.pointerIds
        const pointerA = pointerPositionsRef.current.get(pointerIdA)
        const pointerB = pointerPositionsRef.current.get(pointerIdB)
        if (!pointerA || !pointerB) {
          return
        }

        const currentDistance = Math.hypot(pointerB.x - pointerA.x, pointerB.y - pointerA.y)
        if (currentDistance <= 0) {
          return
        }

        const nextZoom = clampZoom(pinchState.startZoom * (currentDistance / pinchState.startDistance))
        const nextMidpoint = {
          x: (pointerA.x + pointerB.x) / 2,
          y: (pointerA.y + pointerB.y) / 2,
        }
        const scaleRatio = nextZoom / pinchState.startZoom
        const nextPanX =
          nextMidpoint.x -
          pinchState.viewportCenter.x -
          (pinchState.startMidpoint.x - pinchState.viewportCenter.x - pinchState.startPan.x) * scaleRatio
        const nextPanY =
          nextMidpoint.y -
          pinchState.viewportCenter.y -
          (pinchState.startMidpoint.y - pinchState.viewportCenter.y - pinchState.startPan.y) * scaleRatio

        setZoomLevel(nextZoom)
        setPanOffset({ x: nextPanX, y: nextPanY })
        return
      }

      const dragState = dragStateRef.current
      if (!dragState || dragState.pointerId !== event.pointerId || pointerPositionsRef.current.size > 1) {
        return
      }

      const nextPanX = dragState.startPan.x + (event.clientX - dragState.start.x)
      const nextPanY = dragState.startPan.y + (event.clientY - dragState.start.y)
      setPanOffset({ x: nextPanX, y: nextPanY })
    },
    [clampZoom],
  )

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      pointerPositionsRef.current.delete(event.pointerId)

      if (dragStateRef.current?.pointerId === event.pointerId) {
        dragStateRef.current = null
      }

      if (pinchStateRef.current?.pointerIds.includes(event.pointerId)) {
        pinchStateRef.current = null
      }

      if (pointerPositionsRef.current.size === 0) {
        dragStateRef.current = null
        pinchStateRef.current = null
        return
      }

      if (pointerPositionsRef.current.size === 1 && zoomLevel > 1) {
        const [remainingPointerId, remainingPointer] = Array.from(pointerPositionsRef.current.entries())[0]
        dragStateRef.current = {
          pointerId: remainingPointerId,
          start: remainingPointer,
          startPan: panOffset,
        }
      }
    },
    [panOffset, zoomLevel],
  )

  const zoomTransform = `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomLevel})`

  return {
    adjustZoom,
    canPan: zoomLevel > 1,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    panOffset,
    resetViewport,
    zoomLevel,
    zoomTransform,
  }
}
