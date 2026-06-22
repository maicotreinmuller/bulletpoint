"use client"

import { useCallback, useRef } from "react"

interface Options {
  onLongPress: () => void
  onClick?: () => void
  delay?: number
}

/**
 * Hook para distinguir clique simples de clique longo (toque prolongado),
 * funcionando com mouse e toque. Usado nos balões de nota.
 */
export function useLongPress({ onLongPress, onClick, delay = 450 }: Options) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggered = useRef(false)
  const startPos = useRef<{ x: number; y: number } | null>(null)

  const start = useCallback(
    (e: React.PointerEvent) => {
      // Ignora cliques secundários do mouse.
      if (e.pointerType === "mouse" && e.button !== 0) return
      triggered.current = false
      startPos.current = { x: e.clientX, y: e.clientY }
      timer.current = setTimeout(() => {
        triggered.current = true
        if (navigator.vibrate) navigator.vibrate(15)
        onLongPress()
      }, delay)
    },
    [onLongPress, delay],
  )

  const clear = useCallback(
    (e: React.PointerEvent, allowClick = true) => {
      if (timer.current) {
        clearTimeout(timer.current)
        timer.current = null
      }
      if (allowClick && !triggered.current && onClick) {
        onClick()
      }
      triggered.current = false
    },
    [onClick],
  )

  const move = useCallback((e: React.PointerEvent) => {
    if (!startPos.current || !timer.current) return
    const dx = Math.abs(e.clientX - startPos.current.x)
    const dy = Math.abs(e.clientY - startPos.current.y)
    // Cancela o long-press se o usuário arrastar/rolar.
    if (dx > 10 || dy > 10) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  return {
    onPointerDown: start,
    onPointerUp: (e: React.PointerEvent) => clear(e, true),
    onPointerLeave: (e: React.PointerEvent) => clear(e, false),
    onPointerMove: move,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  }
}
