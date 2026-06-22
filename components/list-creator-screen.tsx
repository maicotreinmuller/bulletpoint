"use client"

import { useRef, useState } from "react"
import { Reorder, useDragControls } from "framer-motion"
import { ChevronLeft, GripVertical, ListChecks, Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface Option {
  id: string
  text: string
}

interface Props {
  /** Volta para a tela de chat sem criar a lista. */
  onBack: () => void
  /** Cria a lista com os itens informados (e um título opcional). */
  onCreate: (items: string[], title: string) => void
}

function uid() {
  return Math.random().toString(36).slice(2)
}

const MAX_ITEMS = 30

/**
 * Tela dedicada (em tela cheia) para montar uma lista antes de enviá-la
 * como nota de checklist. Inspirada no fluxo de "Enquete" do WhatsApp:
 * campos de item que vão surgindo conforme o usuário digita.
 */
export function ListCreatorScreen({ onBack, onCreate }: Props) {
  const [title, setTitle] = useState("")
  const [options, setOptions] = useState<Option[]>([
    { id: uid(), text: "" },
    { id: uid(), text: "" },
  ])
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({})

  const filled = options.map((o) => o.text.trim()).filter(Boolean)
  const canCreate = filled.length > 0

  function updateOption(id: string, text: string) {
    setOptions((prev) => {
      const next = prev.map((o) => (o.id === id ? { ...o, text } : o))
      // Acrescenta um campo vazio ao preencher o último (estilo enquete).
      const last = next[next.length - 1]
      if (last.text.trim() && next.length < MAX_ITEMS) {
        next.push({ id: uid(), text: "" })
      }
      return next
    })
  }

  function removeOption(id: string) {
    setOptions((prev) => {
      const next = prev.filter((o) => o.id !== id)
      return next.length === 0 ? [{ id: uid(), text: "" }] : next
    })
  }

  function addOption() {
    setOptions((prev) => {
      if (prev.length >= MAX_ITEMS) return prev
      const opt = { id: uid(), text: "" }
      requestAnimationFrame(() => inputsRef.current[opt.id]?.focus())
      return [...prev, opt]
    })
  }

  function focusNext(index: number) {
    const next = options[index + 1]
    if (next) {
      inputsRef.current[next.id]?.focus()
    } else if (options.length < MAX_ITEMS) {
      addOption()
    }
  }

  function handleCreate() {
    if (!canCreate) return
    onCreate(filled, title.trim())
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Cabeçalho */}
      <header className="z-10 flex shrink-0 items-center gap-2 border-b border-border bg-background/90 px-2 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-md">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="no-tap-highlight flex h-10 w-10 items-center justify-center rounded-full text-foreground active:bg-secondary"
        >
          <ChevronLeft size={26} />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <ListChecks size={18} />
          </span>
          <h1 className="truncate text-base font-semibold leading-tight">Nova lista</h1>
        </div>
      </header>

      {/* Corpo rolável */}
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Título da lista
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Compras da semana (opcional)"
              className="h-12 rounded-2xl text-base"
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Itens
            </p>
            <Reorder.Group axis="y" values={options} onReorder={setOptions} className="space-y-2">
              {options.map((opt, i) => (
                <OptionRow
                  key={opt.id}
                  option={opt}
                  index={i}
                  canRemove={options.length > 1}
                  inputRef={(el) => {
                    inputsRef.current[opt.id] = el
                  }}
                  onChange={(text) => updateOption(opt.id, text)}
                  onEnter={() => focusNext(i)}
                  onRemove={() => removeOption(opt.id)}
                />
              ))}
            </Reorder.Group>

            {options.length < MAX_ITEMS && (
              <button
                onClick={addOption}
                className="mt-2 flex w-full items-center gap-2 rounded-2xl border border-dashed border-border px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors active:bg-secondary"
              >
                <Plus size={18} />
                Adicionar item
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé fixo */}
      <div className="shrink-0 border-t border-border bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <div className="mx-auto w-full max-w-md">
          <Button
            onClick={handleCreate}
            disabled={!canCreate}
            className="h-12 w-full rounded-2xl text-base"
          >
            {canCreate
              ? `Criar lista (${filled.length} ${filled.length === 1 ? "item" : "itens"})`
              : "Criar lista"}
          </Button>
        </div>
      </div>
    </div>
  )
}

interface OptionRowProps {
  option: Option
  index: number
  canRemove: boolean
  inputRef: (el: HTMLInputElement | null) => void
  onChange: (text: string) => void
  onEnter: () => void
  onRemove: () => void
}

function OptionRow({ option, index, canRemove, inputRef, onChange, onEnter, onRemove }: OptionRowProps) {
  const controls = useDragControls()

  return (
    <Reorder.Item
      value={option}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      whileDrag={{ scale: 1.02 }}
      className="flex touch-none items-center gap-1.5 rounded-2xl bg-muted px-2 py-1.5"
    >
      <button
        type="button"
        aria-label={`Reordenar item ${index + 1}`}
        onPointerDown={(e) => controls.start(e)}
        className="no-tap-highlight flex h-8 w-7 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical size={18} />
      </button>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border text-[11px] font-semibold text-muted-foreground">
        {index + 1}
      </span>
      <input
        ref={inputRef}
        value={option.text}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            onEnter()
          }
        }}
        placeholder={`Item ${index + 1}`}
        aria-label={`Item ${index + 1} da lista`}
        className="h-9 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
      />
      {canRemove && (
        <button
          onClick={onRemove}
          aria-label={`Remover item ${index + 1}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-secondary"
        >
          <X size={16} />
        </button>
      )}
    </Reorder.Item>
  )
}
