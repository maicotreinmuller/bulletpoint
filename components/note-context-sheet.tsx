"use client"

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Pencil, Pin, PinOff, ListChecks, Type, Copy, Trash2, Archive, ArchiveRestore } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Note } from "@/lib/types"

interface Props {
  note: Note | null
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  onTogglePin: () => void
  onConvert: () => void
  onCopy: () => void
  onArchive: () => void
  onDelete: () => void
}

/** Bottom sheet de ações exibido no clique longo de um balão de nota. */
export function NoteContextSheet({
  note,
  onOpenChange,
  onEdit,
  onTogglePin,
  onConvert,
  onCopy,
  onArchive,
  onDelete,
}: Props) {
  const isChecklist = note?.kind === "checklist"
  const isArchived = note?.archived ?? false

  return (
    <Drawer open={Boolean(note)} onOpenChange={onOpenChange}>
      <DrawerContent className="no-tap-highlight">
        <div className="mx-auto w-full max-w-md pb-2">
          <DrawerHeader>
            <DrawerTitle className="text-left text-sm font-normal text-muted-foreground">
              {isChecklist ? "Ações da lista" : "Ações da nota"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-2 pb-2">
            <Action icon={<Pencil size={20} />} label="Editar" onClick={onEdit} />
            <Action
              icon={note?.pinned ? <PinOff size={20} /> : <Pin size={20} />}
              label={note?.pinned ? "Desafixar" : "Fixar no topo"}
              onClick={onTogglePin}
            />
            <Action
              icon={isChecklist ? <Type size={20} /> : <ListChecks size={20} />}
              label={isChecklist ? "Transformar em texto" : "Transformar em checklist"}
              onClick={onConvert}
            />
            <Action icon={<Copy size={20} />} label="Copiar" onClick={onCopy} />
            <Action
              icon={isArchived ? <ArchiveRestore size={20} /> : <Archive size={20} />}
              label={isArchived ? "Desarquivar" : "Arquivar"}
              onClick={onArchive}
            />
            <Action
              icon={<Trash2 size={20} />}
              label="Excluir"
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
      <span className={cn(destructive ? "text-destructive" : "text-muted-foreground")}>
        {icon}
      </span>
      {label}
    </button>
  )
}
