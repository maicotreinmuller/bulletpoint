"use client"

/**
 * Hook de navegação principal do app.
 * Inicializa o sistema de back handler e gerencia a tela ativa (lista vs chat).
 */

import { useEffect, useRef, useState } from "react"
import { pushBack, popBack } from "./use-back-handler"

export function useAppNav() {
  const [activeTopic, setActiveTopic] = useState<string | null>(null)
  const backId = useRef<number | null>(null)

  // Quando entra em um tópico, registra um handler de back para sair dele
  useEffect(() => {
    if (activeTopic) {
      const id = pushBack(() => {
        setActiveTopic(null)
        return true
      })
      backId.current = id
      return () => popBack(id)
    }
  }, [activeTopic])

  function openTopic(id: string) {
    setActiveTopic(id)
  }

  function closeTopic() {
    setActiveTopic(null)
  }

  return { activeTopic, openTopic, closeTopic }
}
