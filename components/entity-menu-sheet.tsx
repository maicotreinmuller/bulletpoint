"use client"

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Archive, ArchiveRestore, Pencil, Pin, PinOff, Plus, Trash2, Ungroup, Eraser, SquareCheck as CheckSquare, Heart } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: "group" | "topic"
  title: string
  archived: boolean
  favorited: boolean
  onEdit: () => void
  onToggleArchive: () => void
  onDelete: () => void
  /** Apenas para grupos: criar um tópico ja dentro do grupo. */
  onAddTopic?: () => void
  /** Apenas para grupos: desagrupar (remove grupo, mantem tópicos). */
  onUngroup?: () => void
  /** Apenas para tópicos: limpar todo o conteúdo. */
  onClearContent?: () => void
  /** Apenas para tópicos: estado de fixado. */
  pinned?: boolean
  /** Apenas para tópicos: alternar fixado no topo. */
  onTogglePin?: () => void
  /** Alternar favorito. */
  onToggleFavorite: () => void
  /** Inicia modo de selecao multipla. */
  onSelect?: () => void
}

/** Bottom sheet de acoes para um grupo ou tópico. */
export function EntityMenuSheet({
  open,
  onOpenChange,
  kind,
  title,
  archived,
  favorited,
  onEdit,
  onToggleArchive,
  onDelete,
  onAddTopic,
  onUngroup,
  onClearContent,
  pinned,
  onTogglePin,
  onToggleFavorite,
  onSelect,
}: Props) {
  const label = kind === "group" ? "grupo" : "tópico"

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="no-tap-highlight">
        <div className="mx-auto w-full max-w-md pb-2">
          <DrawerHeader>
            <DrawerTitle className="truncate text-left text-sm font-normal text-muted-foreground">
              {title}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-2 pb-2">
            {kind === "group" && onAddTopic && (
              <Action icon={<Plus size={20} />} label="Adicionar tópico ao grupo" onClick={onAddTopic} />
            )}
            {kind === "topic" && onTogglePin && (
              <Action
                icon={pinned ? <PinOff size={20} /> : <Pin size={20} />}
                label={pinned ? "Desafixar do topo" : "Fixar no topo"}
                onClick={onTogglePin}
              />
            )}
            <Action
              icon={<Heart size={20} className={favorited ? "fill-rose-500 text-rose-500" : ""} />}
              label={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              onClick={onToggleFavorite}
            />
            <Action icon={<Pencil size={20} />} label={`Editar ${label}`} onClick={onEdit} />
            {onSelect && (
              <Action
                icon={<CheckSquare size={20} />}
                label="Selecionar"
                onClick={onSelect}
              />
            )}
            {kind === "topic" && onClearContent && (
              <Action
                icon={<Eraser size={20} />}
                label="Limpar conteúdo"
                onClick={onClearContent}
              />
            )}
            <Action
              icon={archived ? <ArchiveRestore size={20} /> : <Archive size={20} />}
              label={archived ? "Desarquivar" : "Arquivar"}
              onClick={onToggleArchive}
            />
            {kind === "group" && onUngroup && (
              <Action
                icon={<Ungroup size={20} />}
                label="Desagrupar"
                onClick={onUngroup}
              />
            )}
            <Action
              icon={<Trash2 size={20} />}
              label={kind === "group" ? "Excluir grupo e tópicos" : `Excluir ${label}`}
              destructive
              onClick={onDelete}
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function Action({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-left text-[15px] font-medium transition-colors active:bg-secondary",
        destructive ? "text-destructive" : "text-foreground",
      )}
    >
      <span className={cn(destructive ? "text-destructive" : "text-muted-foreground")}>{icon}</span>
      {label}
    </button>
  )
}
