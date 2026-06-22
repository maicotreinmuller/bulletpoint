"use client"

/**
 * Hook para gestos de swipe horizontal em itens de lista.
 *
 * - Swipe para a ESQUERDA revela ações destrutivas (Excluir, Arquivar).
 * - Swipe para a DIREITA revela ações positivas (Fixar, Favorito).
 * - Snap automático: se o usuário soltar no meio, volta ou avança para a posição de snap.
 * - Cancela se detectar scroll vertical (dy > dx * 1.5).
 * - Vibração tátil ao passar do threshold de snap.
 */

import { useCallback, useRef, useState } from "react"

export type SwipeDirection = "left" | "right" | "none"

interface SwipeConfig {
  /** Quanto revelar em px ao dar snap lateral. Default: 88 */
  snapWidth?: number
  /** Distância mínima em px para acionar o snap. Default: 44 */
  threshold?: number
  /** Distância máxima permitida (evita arrastar para longe). Default: snapWidth */
  maxDrag?: number
  onSnapLeft?: () => void
  onSnapRight?: () => void
  onClose?: () => void
}

interface SwipeState {
  x: number
  snapped: SwipeDirection
  dragging: boolean
}

export function useSwipeActions({
  snapWidth = 88,
  threshold = 44,
  maxDrag,
  onSnapLeft,
  onSnapRight,
  onClose,
}: SwipeConfig = {}) {
  const limit = maxDrag ?? snapWidth
  const [state, setState] = useState<SwipeState>({ x: 0, snapped: "none", dragging: false })

  const startX = useRef(0)
  const startY = useRef(0)
  const startOffset = useRef(0)
  const locked = useRef<"h" | "v" | null>(null)
  const vibrated = useRef(false)
  const active = useRef(false)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return
    active.current = true
    startX.current = e.clientX
    startY.current = e.clientY
    startOffset.current = state.snapped === "left" ? -snapWidth : state.snapped === "right" ? snapWidth : 0
    locked.current = null
    vibrated.current = false
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [state.snapped, snapWidth])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!active.current) return
    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current

    // Detecta direção predominante no início do gesto
    if (!locked.current) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return
      locked.current = Math.abs(dy) > Math.abs(dx) * 1.2 ? "v" : "h"
    }
    if (locked.current === "v") return

    e.preventDefault()

    const raw = startOffset.current + dx
    const clamped = Math.max(-limit, Math.min(limit, raw))

    // Vibração ao cruzar o threshold
    if (!vibrated.current && Math.abs(clamped) >= threshold) {
      if (navigator.vibrate) navigator.vibrate(8)
      vibrated.current = true
    }
    if (Math.abs(clamped) < threshold * 0.5) vibrated.current = false

    setState({ x: clamped, snapped: "none", dragging: true })
  }, [limit, threshold])

  const onPointerUp = useCallback(() => {
    if (!active.current) return
    active.current = false

    setState((prev) => {
      const abs = Math.abs(prev.x)
      const dir = prev.x < 0 ? "left" : "right"

      if (abs >= threshold) {
        // Snap
        const snapX = dir === "left" ? -snapWidth : snapWidth
        if (dir === "left" && prev.snapped !== "left") onSnapLeft?.()
        if (dir === "right" && prev.snapped !== "right") onSnapRight?.()
        return { x: snapX, snapped: dir, dragging: false }
      } else {
        // Volta para fechado
        if (prev.snapped !== "none") onClose?.()
        return { x: 0, snapped: "none", dragging: false }
      }
    })
  }, [threshold, snapWidth, onSnapLeft, onSnapRight, onClose])

  const close = useCallback(() => {
    setState({ x: 0, snapped: "none", dragging: false })
  }, [])

  return {
    x: state.x,
    snapped: state.snapped,
    dragging: state.dragging,
    close,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  }
}
