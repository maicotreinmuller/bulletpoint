"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Archive, ArchiveRestore, ChevronLeft, ChevronRight, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { TopicAvatar } from "@/components/topic-avatar"
import { NoteBubble } from "@/components/note-bubble"
import { NoteInput } from "@/components/note-input"
import { ListCreatorScreen } from "@/components/list-creator-screen"
import { NoteContextSheet } from "@/components/note-context-sheet"
import { TopicEditorSheet } from "@/components/topic-editor-sheet"
import { useBack } from "@/lib/use-back"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  addChecklistNote,
  addNote,
  archiveNote,
  archiveTopic,
  convertToChecklist,
  convertToText,
  deleteNote,
  deleteTopic,
  togglePin,
  updateTopic,
  useArchivedNotes,
  useNotes,
  useTopic,
} from "@/lib/store"
import { dayKey, formatDateDivider } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Note } from "@/lib/types"

interface Props {
  topicId: string
  onBack: () => void
}

/** Tela interna estilo chat: feed de notas + input fixo na base. */
export function ChatScreen({ topicId, onBack }: Props) {
  const topic = useTopic(topicId)
  const notes = useNotes(topicId)
  const archivedNotes = useArchivedNotes(topicId)
  const [menuNote, setMenuNote] = useState<Note | null>(null)
  const [topicMenu, setTopicMenu] = useState(false)
  const [editingTopic, setEditingTopic] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [creatingList, setCreatingList] = useState(false)

  // Back handlers: cancela a ação ativa mais recente ao pressionar voltar
  useBack(creatingList, () => setCreatingList(false))
  useBack(!!menuNote, () => setMenuNote(null))
  useBack(topicMenu, () => setTopicMenu(false))
  useBack(editingTopic, () => setEditingTopic(false))

  // Swipe da borda esquerda para voltar
  const [swipeX, setSwipeX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const swipeStartX = useRef(0)
  const swipeStartY = useRef(0)
  const swipeLocked = useRef<"h" | "v" | null>(null)
  const swipeActive = useRef(false)
  const EDGE_ZONE = 28 // px da borda onde o gesto inicia
  const BACK_THRESHOLD = 80

  function onSwipePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse") return
    if (e.clientX > EDGE_ZONE) return
    swipeActive.current = true
    swipeStartX.current = e.clientX
    swipeStartY.current = e.clientY
    swipeLocked.current = null
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onSwipePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!swipeActive.current) return
    const dx = e.clientX - swipeStartX.current
    const dy = e.clientY - swipeStartY.current
    if (!swipeLocked.current) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return
      swipeLocked.current = Math.abs(dy) > Math.abs(dx) * 1.3 ? "v" : "h"
    }
    if (swipeLocked.current === "v") { swipeActive.current = false; return }
    e.preventDefault()
    if (dx > 0) { setSwiping(true); setSwipeX(Math.min(dx, 200)) }
  }

  function onSwipePointerUp() {
    if (!swipeActive.current) return
    swipeActive.current = false
    if (swipeX >= BACK_THRESHOLD) {
      onBack()
    } else {
      setSwipeX(0)
    }
    setSwiping(false)
  }

  const scrollRef = useRef<HTMLDivElement>(null)
  const prevCount = useRef(notes.length)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (notes.length >= prevCount.current) {
      el.scrollTop = el.scrollHeight
    }
    prevCount.current = notes.length
  }, [notes.length])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!topic) return null

  const pinned = notes.filter((n) => n.pinned)
  const regular = notes.filter((n) => !n.pinned)

  return (
    <div
      className="relative flex h-full flex-col"
      style={{
        transform: swipeX > 0 ? `translateX(${swipeX}px)` : undefined,
        transition: swiping ? "none" : "transform 0.22s cubic-bezier(0.32,0.72,0,1)",
        opacity: swipeX > 0 ? Math.max(0.6, 1 - swipeX / 300) : 1,
      }}
      onPointerDown={onSwipePointerDown}
      onPointerMove={onSwipePointerMove}
      onPointerUp={onSwipePointerUp}
      onPointerCancel={onSwipePointerUp}
    >
      {/* Cabeçalho */}
      <header className="z-10 flex items-center gap-2 border-b border-border bg-background/90 px-2 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-md">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="no-tap-highlight flex h-10 w-10 items-center justify-center rounded-full text-foreground active:bg-secondary"
        >
          <ChevronLeft size={26} />
        </button>
        <button
          onClick={() => setEditingTopic(true)}
          className="no-tap-highlight flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-left"
        >
          <TopicAvatar icon={topic.icon} color={topic.color} size="sm" />
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold leading-tight">{topic.title}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {notes.length} {notes.length === 1 ? "nota" : "notas"}
            </p>
          </div>
        </button>
        <button
          onClick={() => setTopicMenu(true)}
          aria-label="Opções do tópico"
          className="no-tap-highlight flex h-10 w-10 items-center justify-center rounded-full text-foreground active:bg-secondary"
        >
          <MoreVertical size={22} />
        </button>
      </header>

      {/* Feed */}
      <div ref={scrollRef} className="no-scrollbar chat-pattern flex-1 overflow-y-auto px-3 py-4">
        <div className="mx-auto flex max-w-md flex-col gap-2">
          {notes.length === 0 && <ChatEmpty />}

          {pinned.length > 0 && (
            <>
              <Divider label="Fixadas" />
              {pinned.map((note) => (
                <NoteBubble key={note.id} note={note} onLongPress={setMenuNote} />
              ))}
              {regular.length > 0 && <Divider label="Notas" />}
            </>
          )}

          {regular.map((note, i) => {
            const showDate =
              i === 0 || dayKey(note.createdAt) !== dayKey(regular[i - 1].createdAt)
            return (
              <div key={note.id} className="flex flex-col gap-2">
                {showDate && pinned.length === 0 && (
                  <Divider label={formatDateDivider(note.createdAt)} />
                )}
                <NoteBubble note={note} onLongPress={setMenuNote} />
              </div>
            )
          })}

          {archivedNotes.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="no-tap-highlight mx-auto flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1 text-xs font-medium text-foreground/70 backdrop-blur-sm"
              >
                <Archive size={13} />
                {archivedNotes.length} {archivedNotes.length === 1 ? "arquivada" : "arquivadas"}
                <motion.span animate={{ rotate: showArchived ? 90 : 0 }} transition={{ duration: 0.18 }}>
                  <ChevronRight size={13} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {showArchived && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                    className="flex flex-col gap-2 overflow-hidden pt-2 opacity-80"
                  >
                    {archivedNotes.map((note) => (
                      <NoteBubble key={note.id} note={note} onLongPress={setMenuNote} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <NoteInput
        onSend={(text) => addNote(topicId, text)}
        onCreateList={() => setCreatingList(true)}
      />

      {/* Tela dedicada de criação de lista (overlay deslizante) */}
      <AnimatePresence>
        {creatingList && (
          <motion.div
            key="list-creator"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0 z-30 bg-background"
          >
            <ListCreatorScreen
              onBack={() => setCreatingList(false)}
              onCreate={(items, title) => {
                addChecklistNote(topicId, items, title)
                setCreatingList(false)
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menu de contexto da nota (clique longo) */}
      <NoteContextSheet
        note={menuNote}
        onOpenChange={(open) => !open && setMenuNote(null)}
        onEdit={() => {
          // Fecha o sheet; a edição inline é acionada pelo clique no balão.
          // Para checklist, o usuário edita itens diretamente.
          setMenuNote(null)
        }}
        onTogglePin={() => {
          if (menuNote) togglePin(menuNote.id)
          setMenuNote(null)
        }}
        onConvert={() => {
          if (menuNote) {
            if (menuNote.kind === "text") convertToChecklist(menuNote.id)
            else convertToText(menuNote.id)
          }
          setMenuNote(null)
        }}
        onCopy={() => {
          if (menuNote) {
            const text =
              menuNote.kind === "text"
                ? menuNote.text
                : menuNote.items.map((i) => `${i.done ? "[x]" : "[ ]"} ${i.text}`).join("\n")
            navigator.clipboard?.writeText(text)
          }
          setMenuNote(null)
        }}
        onArchive={() => {
          if (menuNote) archiveNote(menuNote.id, !menuNote.archived)
          setMenuNote(null)
        }}
        onDelete={() => {
          if (menuNote) deleteNote(menuNote.id)
          setMenuNote(null)
        }}
      />

      {/* Menu do tópico */}
      <Drawer open={topicMenu} onOpenChange={setTopicMenu}>
        <DrawerContent className="no-tap-highlight">
          <div className="mx-auto w-full max-w-md pb-2">
            <DrawerHeader>
              <DrawerTitle className="text-left text-sm font-normal text-muted-foreground">
                {topic.title}
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-2 pb-2">
              <TopicAction
                icon={<Pencil size={20} />}
                label="Editar tópico"
                onClick={() => {
                  setTopicMenu(false)
                  setEditingTopic(true)
                }}
              />
              <TopicAction
                icon={topic.archived ? <ArchiveRestore size={20} /> : <Archive size={20} />}
                label={topic.archived ? "Desarquivar tópico" : "Arquivar tópico"}
                onClick={() => {
                  setTopicMenu(false)
                  archiveTopic(topicId, !topic.archived)
                  if (!topic.archived) onBack()
                }}
              />
              <TopicAction
                icon={<Trash2 size={20} />}
                label="Excluir tópico"
                destructive
                onClick={() => {
                  setTopicMenu(false)
                  deleteTopic(topicId)
                  onBack()
                }}
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <TopicEditorSheet
        open={editingTopic}
        onOpenChange={setEditingTopic}
        topic={topic}
        onSubmit={({ title, icon, color, groupId }) =>
          updateTopic(topicId, { title, icon, color, groupId })
        }
      />
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="my-1 flex justify-center">
      <span className="rounded-full bg-foreground/10 px-3 py-1 text-xs font-medium text-foreground/70 backdrop-blur-sm">
        {label}
      </span>
    </div>
  )
}

function ChatEmpty() {
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <div className="rounded-2xl bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm text-pretty">
        Nenhuma nota ainda. Escreva abaixo para adicionar a primeira.
      </div>
    </div>
  )
}

function TopicAction({
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
