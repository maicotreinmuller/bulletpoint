"use client"

import { useRef, useState } from "react"
import { motion } from "framer-motion"
import { ArrowUp, ListChecks } from "lucide-react"

interface Props {
  onSend: (text: string) => void
  /** Abre a tela dedicada de criação de lista. */
  onCreateList: () => void
}

/**
 * Campo de input fixo na base (estilo Telegram).
 * - O envio de texto é a ação principal (textarea que cresce).
 * - Um botão dedicado abre uma tela exclusiva para montar uma lista.
 */
export function NoteInput({ onSend, onCreateList }: Props) {
  const [value, setValue] = useState("")
  const ref = useRef<HTMLTextAreaElement>(null)

  const hasText = value.trim().length > 0

  function autoGrow() {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }

  function sendText() {
    if (!hasText) return
    onSend(value)
    setValue("")
    requestAnimationFrame(() => {
      if (ref.current) ref.current.style.height = "auto"
    })
  }

  return (
    <div className="border-t border-border bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-end gap-2">
          {/* Botão dedicado para criar lista (abre tela exclusiva) */}
          <button
            onClick={onCreateList}
            aria-label="Adicionar lista"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors active:bg-secondary"
          >
            <ListChecks size={20} />
          </button>

          <div className="flex flex-1 items-end rounded-3xl bg-muted px-4 py-2.5">
            <textarea
              ref={ref}
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                autoGrow()
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendText()
                }
              }}
              rows={1}
              placeholder="Escreva uma nota..."
              aria-label="Escreva uma nota"
              className="no-scrollbar max-h-[140px] w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Enviar */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={sendText}
            disabled={!hasText}
            aria-label="Enviar nota"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-opacity disabled:opacity-40"
          >
            <ArrowUp size={22} strokeWidth={2.6} />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
