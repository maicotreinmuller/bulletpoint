"use client"

/**
 * Hook React que registra um handler na pilha de back enquanto `active` for true.
 * Quando o usuário pressiona voltar, `onBack` é chamado e o evento é consumido.
 *
 * Uso:
 *   useBack(isSelectMode, () => { setSelectMode(false); setSelectedIds(new Set()) })
 *   useBack(!!menuNote, () => setMenuNote(null))
 */

import { useEffect } from "react"
import { pushBack, popBack } from "./use-back-handler"

export function useBack(active: boolean, onBack: () => void) {
  useEffect(() => {
    if (!active) return
    const id = pushBack(() => {
      onBack()
      return true
    })
    return () => popBack(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
}
