"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Pin, Plus } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { useLongPress } from "@/lib/use-long-press"
import { formatTime } from "@/lib/format"
import {
  addChecklistItem,
  toggleChecklistItem,
  updateChecklistItem,
  updateNoteText,
} from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Note } from "@/lib/types"

interface Props {
  note: Note
  onLongPress: (note: Note) => void
}

/** Balão de nota no feed do chat — renderiza texto ou checklist. */
export function NoteBubble({ note, onLongPress }: Props) {
  const [editing, setEditing] = useState(false)

  const longPress = useLongPress({
    onLongPress: () => onLongPress(note),
    onClick: () => {
      if (note.kind === "text") setEditing(true)
    },
  })

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 32 }}
      className="flex w-full justify-end"
    >
      <div
        className={cn(
          "no-tap-highlight relative max-w-[82%] select-none rounded-2xl rounded-br-md bg-bubble-sent px-3.5 py-2.5 text-bubble-sent-foreground shadow-sm",
          note.pinned && "ring-1 ring-primary/40",
        )}
        {...(editing ? {} : longPress)}
      >
        {note.pinned && (
          <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-primary">
            <Pin size={14} className="fill-current" />
          </span>
        )}

        {note.kind === "text" ? (
          editing ? (
            <TextEditor note={note} onDone={() => setEditing(false)} />
          ) : (
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
              {note.text}
            </p>
          )
        ) : (
          <ChecklistView note={note} />
        )}

        <div className="mt-1 flex items-center justify-end gap-1">
          {note.updatedAt !== note.createdAt && (
            <span className="text-[10px] text-bubble-sent-foreground/60">editado</span>
          )}
          <span className="text-[10px] text-bubble-sent-foreground/60">
            {formatTime(note.createdAt)}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

/** Edição inline de uma nota de texto. */
function TextEditor({ note, onDone }: { note: Note; onDone: () => void }) {
  const [value, setValue] = useState(note.text)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el) {
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
      el.style.height = "auto"
      el.style.height = `${el.scrollHeight}px`
    }
  }, [])

  function commit() {
    const v = value.trim()
    if (v && v !== note.text) updateNoteText(note.id, v)
    onDone()
  }

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        setValue(e.target.value)
        e.target.style.height = "auto"
        e.target.style.height = `${e.target.scrollHeight}px`
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          commit()
        }
        if (e.key === "Escape") onDone()
      }}
      rows={1}
      className="w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none"
    />
  )
}

/** Renderiza os itens de um checklist com checkboxes funcionais. */
function ChecklistView({ note }: { note: Note }) {
  const [adding, setAdding] = useState("")
  const total = note.items.length
  const done = note.items.filter((i) => i.done).length

return (
    <div className="min-w-[200px] space-y-1.5 py-0.5">
      {note.text && (
        <p className="text-[15px] font-semibold leading-snug">{note.text}</p>
      )}

      {note.items.map((item) => (
        <ChecklistRow key={item.id} noteId={note.id} item={item} />
      ))}

      <div className="flex items-center gap-2 pt-1">
        <Plus size={16} className="text-bubble-sent-foreground/50" />
        <input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              addChecklistItem(note.id, adding)
              setAdding("")
            }
          }}
          onBlur={() => {
            if (adding.trim()) addChecklistItem(note.id, adding)
            setAdding("")
          }}
          placeholder="Adicionar item"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-bubble-sent-foreground/40"
        />
      </div>

      {total > 0 && (
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bubble-sent-foreground/10">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${(done / total) * 100}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <span className="shrink-0 text-[11px] text-bubble-sent-foreground/60">
              {done}/{total}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function ChecklistRow({
  noteId,
  item,
}: {
  noteId: string
  item: { id: string; text: string; done: boolean }
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(item.text)

  return (
    <div className="flex items-start gap-2.5">
      <Checkbox
        checked={item.done}
        onCheckedChange={() => toggleChecklistItem(noteId, item.id)}
        className="mt-0.5 size-[18px] rounded-md border-bubble-sent-foreground/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
        aria-label={item.text}
      />
      {editing ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            updateChecklistItem(noteId, item.id, value)
            setEditing(false)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateChecklistItem(noteId, item.id, value)
              setEditing(false)
            }
          }}
          className="flex-1 bg-transparent text-sm outline-none"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className={cn(
            "flex-1 break-words text-left text-sm leading-snug",
            item.done && "text-bubble-sent-foreground/50 line-through",
          )}
        >
          {item.text}
        </button>
      )}
    </div>
  )
}
