"use client"

/**
 * Bottom sheet para criar ou editar um tópico ou grupo.
 *
 * Fluxo:
 * - Criar: abre direto no step "customize" (nome + ícone + cor em uma etapa só)
 * - Editar: abre direto no step "customize" com dados preenchidos
 *
 * Implementação:
 * - Modal próprio com position:fixed — não conflita com teclado virtual no Android/iOS
 * - Sem Vaul/Drawer: não há ResizeObserver nem gesture listeners que briguem com o
 *   resize do viewport quando o teclado abre
 * - Estado separado da animação: reset ocorre antes da animação de entrada, sem flickering
 * - Foco seguro via requestAnimationFrame duplo após transição
 * - "Voltar" não existe mais (step único de criação)
 * - Scroll interno funciona no iOS com -webkit-overflow-scrolling
 * - Botão salvar fixo na base, sempre visível acima do teclado
 */

import { useEffect, useRef, useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { TopicAvatar } from "@/components/topic-avatar"
import { COLOR_KEYS, COLORS, ICON_KEYS, getIcon } from "@/lib/catalog"
import { useGroups } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Check, FolderClosed, X } from "lucide-react"
import type { Group, Topic } from "@/lib/types"

interface SubmitData {
  title: string
  icon: string
  color: string
  groupId: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant?: "topic" | "group"
  topic?: Topic | null
  group?: Group | null
  defaultGroupId?: string | null
  onSubmit: (data: SubmitData) => void
}

export function TopicEditorSheet({
  open,
  onOpenChange,
  variant = "topic",
  topic,
  group,
  defaultGroupId = null,
  onSubmit,
}: Props) {
  const isGroup = variant === "group"
  const groups = useGroups()
  const entity = isGroup ? group : topic

  // Controle de animação separado do estado `open` para permitir animação de saída
  const [visible, setVisible] = useState(false)
  const [animateIn, setAnimateIn] = useState(false)

  const [title, setTitle] = useState("")
  const [icon, setIcon] = useState(isGroup ? "folder" : "notebook")
  const [color, setColor] = useState("blue")
  const [groupId, setGroupId] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const isEditing = Boolean(entity)

  // Abre: carrega dados → monta no DOM → anima entrada
  useEffect(() => {
    if (open) {
      // Carrega estado antes de animar (evita flickering)
      setTitle(entity?.title ?? "")
      setIcon(entity?.icon ?? (isGroup ? "folder" : "notebook"))
      setColor(entity?.color ?? "blue")
      setGroupId((isGroup ? null : topic?.groupId) ?? defaultGroupId)

      setVisible(true)
      // Animação de entrada no próximo frame (garante que o DOM já montou)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true))
      })
    } else {
      // Anima saída, depois desmonta
      setAnimateIn(false)
      const t = setTimeout(() => setVisible(false), 280)
      return () => clearTimeout(t)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Foca o input de título após a animação de entrada
  useEffect(() => {
    if (!animateIn) return
    // Delay mínimo para o teclado não brigar com a animação CSS
    const t = setTimeout(() => inputRef.current?.focus(), 160)
    return () => clearTimeout(t)
  }, [animateIn])

  const close = useCallback(() => onOpenChange(false), [onOpenChange])

  function commitAndClose() {
    const t = title.trim()
    if (!t) return
    onSubmit({ title: t, icon, color, groupId: isGroup ? null : groupId })
    close()
  }

  if (!visible) return null

  const heading = isGroup
    ? isEditing ? "Editar grupo" : "Novo grupo"
    : isEditing ? "Editar tópico" : "Novo tópico"

  const backdropClass = cn(
    "fixed inset-0 z-50 bg-black/40 transition-opacity duration-250",
    animateIn ? "opacity-100" : "opacity-0"
  )

  const sheetClass = cn(
    "fixed inset-x-0 bottom-0 z-50 flex max-h-[92svh] flex-col rounded-t-2xl bg-background shadow-2xl",
    "transition-transform duration-280 ease-[cubic-bezier(0.32,0.72,0,1)]",
    animateIn ? "translate-y-0" : "translate-y-full"
  )

  return (
    <>
      {/* Backdrop */}
      <div className={backdropClass} onClick={close} aria-hidden />

      {/* Sheet */}
      <div className={sheetClass} role="dialog" aria-modal aria-label={heading}>
        {/* Alça de drag visual */}
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25" />

        {/* Cabeçalho fixo */}
        <div className="shrink-0 px-4 py-3">
          <div className="flex items-center gap-2">
            <TopicAvatar icon={icon} color={color} size="sm" />
            <h2 className="flex-1 text-base font-semibold">{heading}</h2>
            <button
              onClick={close}
              aria-label="Fechar"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground active:bg-secondary"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Corpo rolável — scroll quando o teclado reduz o viewport */}
        <div
          className="no-scrollbar flex-1 overflow-y-auto px-4 pb-2"
          style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          <div className="space-y-5 pb-2">
            {/* Campo de nome — sempre visível na única etapa */}
            <Input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isGroup ? "Ex: Casa, Faculdade..." : "Ex: Supermercado, Ideias..."}
              className="h-12 rounded-2xl text-base"
              onKeyDown={(e) => { if (e.key === "Enter") commitAndClose() }}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />

            {/* Seletor de grupo (só para tópicos) */}
            {!isGroup && groups.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Grupo
                </p>
                <div className="flex flex-wrap gap-2">
                  <GroupChip label="Sem grupo" active={groupId === null} onClick={() => setGroupId(null)} />
                  {groups.map((g) => (
                    <GroupChip
                      key={g.id}
                      label={g.title}
                      active={groupId === g.id}
                      onClick={() => setGroupId(g.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Ícones */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Ícone
              </p>
              <div className="grid grid-cols-8 gap-2">
                {ICON_KEYS.map((key) => {
                  const Icon = getIcon(key)
                  const active = key === icon
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setIcon(key)}
                      aria-label={`Ícone ${key}`}
                      aria-pressed={active}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-xl border transition-colors",
                        active
                          ? "border-primary bg-accent text-accent-foreground"
                          : "border-transparent bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon size={20} />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Cores */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Cor
              </p>
              <div className="grid grid-cols-6 gap-3">
                {COLOR_KEYS.map((key) => {
                  const active = key === color
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setColor(key)}
                      aria-label={`Cor ${key}`}
                      aria-pressed={active}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full shadow-sm ring-offset-2 ring-offset-background transition",
                        COLORS[key].bg,
                        active && "ring-2 ring-foreground/40",
                      )}
                    >
                      {active && <Check size={18} className={COLORS[key].fg} />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Botão fixo na base — fica acima do teclado */}
        <div className="shrink-0 border-t border-border bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <Button
            onClick={commitAndClose}
            disabled={!title.trim()}
            className="h-12 w-full rounded-2xl text-base"
          >
            {isEditing ? "Salvar alterações" : isGroup ? "Criar grupo" : "Criar tópico"}
          </Button>
        </div>
      </div>
    </>
  )
}

function GroupChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-accent text-accent-foreground"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      <FolderClosed size={15} />
      <span className="max-w-[120px] truncate">{label}</span>
    </button>
  )
}
