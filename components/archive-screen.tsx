"use client"

import { motion } from "framer-motion"
import { ArchiveRestore, ChevronLeft, Trash2, Archive } from "lucide-react"
import { TopicAvatar } from "@/components/topic-avatar"
import {
  archiveGroup,
  archiveTopic,
  deleteGroupAndContents,
  deleteTopic,
  useArchived,
} from "@/lib/store"
import type { Group, TopicWithMeta } from "@/lib/types"

interface Props {
  onBack: () => void
  onOpenTopic: (id: string) => void
}

/** Tela dedicada aos itens arquivados (grupos e tópicos). */
export function ArchiveScreen({ onBack, onOpenTopic }: Props) {
  const { groups, topics } = useArchived()
  const isEmpty = groups.length === 0 && topics.length === 0

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="z-10 flex items-center gap-2 border-b border-border bg-background/90 px-2 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-md">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="no-tap-highlight flex h-10 w-10 items-center justify-center rounded-full text-foreground active:bg-secondary"
        >
          <ChevronLeft size={26} />
        </button>
        <h1 className="text-base font-semibold">Arquivados</h1>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-3 py-4">
        {isEmpty ? (
          <EmptyArchive />
        ) : (
          <div className="mx-auto flex max-w-md flex-col gap-6">
            {groups.length > 0 && (
              <section>
                <SectionLabel>Grupos</SectionLabel>
                <ul className="flex flex-col gap-1">
                  {groups.map((g) => (
                    <GroupArchiveRow key={g.id} group={g} />
                  ))}
                </ul>
              </section>
            )}

            {topics.length > 0 && (
              <section>
                <SectionLabel>Tópicos</SectionLabel>
                <ul className="flex flex-col gap-1">
                  {topics.map((t) => (
                    <TopicArchiveRow key={t.id} topic={t} onOpen={() => onOpenTopic(t.id)} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  )
}

function GroupArchiveRow({ group }: { group: Group }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
      <TopicAvatar icon={group.icon} color={group.color} />
      <div className="min-w-0 flex-1">
        <span className="truncate text-[15px] font-semibold">{group.title}</span>
        <p className="text-sm text-muted-foreground">Grupo arquivado</p>
      </div>
      <RowActions
        onRestore={() => archiveGroup(group.id, false)}
        onDelete={() => deleteGroupAndContents(group.id)}
      />
    </li>
  )
}

function TopicArchiveRow({ topic, onOpen }: { topic: TopicWithMeta; onOpen: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
      <button onClick={onOpen} className="no-tap-highlight flex min-w-0 flex-1 items-center gap-3 text-left">
        <TopicAvatar icon={topic.icon} color={topic.color} />
        <div className="min-w-0">
          <span className="truncate text-[15px] font-semibold">{topic.title}</span>
          <p className="truncate text-sm text-muted-foreground">{topic.lastNotePreview}</p>
        </div>
      </button>
      <RowActions
        onRestore={() => archiveTopic(topic.id, false)}
        onDelete={() => deleteTopic(topic.id)}
      />
    </li>
  )
}

function RowActions({ onRestore, onDelete }: { onRestore: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onRestore}
        aria-label="Desarquivar"
        className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground active:bg-secondary"
      >
        <ArchiveRestore size={20} />
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onDelete}
        aria-label="Excluir definitivamente"
        className="flex h-10 w-10 items-center justify-center rounded-full text-destructive active:bg-secondary"
      >
        <Trash2 size={20} />
      </motion.button>
    </div>
  )
}

function EmptyArchive() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-accent text-accent-foreground">
        <Archive size={34} />
      </div>
      <h2 className="text-lg font-semibold">Nada arquivado</h2>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground text-pretty">
        Grupos e tópicos arquivados aparecem aqui. Voce pode restaura-los a qualquer momento.
      </p>
    </div>
  )
}
