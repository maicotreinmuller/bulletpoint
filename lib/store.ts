"use client"

import { useSyncExternalStore } from "react"
import {
  dbDeleteGroup,
  dbDeleteNote,
  dbDeleteTopic,
  dbGetGroups,
  dbGetNotes,
  dbGetTopics,
  dbPutGroup,
  dbPutNote,
  dbPutTopic,
} from "./db"
import type {
  ChecklistItem,
  Group,
  GroupWithTopics,
  Note,
  Topic,
  TopicWithMeta,
} from "./types"

/**
 * Store reativo central (camada de estado / "ViewModel" da aplicação).
 *
 * - Mantém uma cópia em memória das entidades para reatividade instantânea.
 * - Persiste cada mutação no IndexedDB (offline-first).
 * - Notifica componentes inscritos via padrão pub/sub
 *   consumido por `useSyncExternalStore`.
 */

interface State {
  groups: Group[]
  topics: Topic[]
  notes: Note[]
  loaded: boolean
}

let state: State = { groups: [], topics: [], notes: [], loaded: false }
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function setState(patch: Partial<State>) {
  state = { ...state, ...patch }
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

const SERVER_SNAPSHOT: State = { groups: [], topics: [], notes: [], loaded: false }
function getServerSnapshot() {
  return SERVER_SNAPSHOT
}

function uid() {
  return crypto.randomUUID()
}

/* ------------------------- Normalização ------------------------- */

/** Garante campos novos em registros antigos (migração leve em runtime). */
function normalizeTopic(t: Topic): Topic {
  return {
    ...t,
    groupId: t.groupId ?? null,
    pinned: t.pinned ?? false,
    order: t.order ?? t.createdAt,
    archived: t.archived ?? false,
    favorite: t.favorite ?? false,
  }
}

function normalizeNote(n: Note): Note {
  return { ...n, archived: n.archived ?? false }
}

function normalizeGroup(g: Group): Group {
  return {
    ...g,
    archived: g.archived ?? false,
    favorite: g.favorite ?? false,
    order: g.order ?? g.createdAt,
  }
}

/* --------------------------- Carregamento --------------------------- */

let loadStarted = false
export async function loadStore() {
  if (loadStarted) return
  loadStarted = true
  const [groups, topics, notes] = await Promise.all([
    dbGetGroups(),
    dbGetTopics(),
    dbGetNotes(),
  ])
  setState({
    groups: groups.map(normalizeGroup),
    topics: topics.map(normalizeTopic),
    notes: notes.map(normalizeNote),
    loaded: true,
  })
}

/* ------------------------------ Grupos ------------------------------ */

export async function createGroup(title: string, icon: string, color: string) {
  const now = Date.now()
  const group: Group = {
    id: uid(),
    title: title.trim() || "Novo grupo",
    icon,
    color,
    order: now,
    archived: false,
    favorite: false,
    createdAt: now,
    updatedAt: now,
  }
  setState({ groups: [...state.groups, group] })
  await dbPutGroup(group)
  return group
}

/**
 * Reordena grupos a partir de uma lista de ids na ordem desejada.
 * Atribui `order` sequencial; usado pelo drag and drop das abas.
 */
export async function reorderGroups(orderedIds: string[]) {
  const orderMap = new Map(orderedIds.map((id, index) => [id, index]))
  const changed: Group[] = []
  const groups = state.groups.map((g) => {
    if (!orderMap.has(g.id)) return g
    const order = orderMap.get(g.id)!
    if (g.order === order) return g
    const updated = { ...g, order }
    changed.push(updated)
    return updated
  })
  if (changed.length === 0) return
  setState({ groups })
  await Promise.all(changed.map((g) => dbPutGroup(g)))
}

export async function updateGroup(
  id: string,
  patch: Partial<Pick<Group, "title" | "icon" | "color">>,
) {
  const group = state.groups.find((g) => g.id === id)
  if (!group) return
  const updated: Group = { ...group, ...patch, updatedAt: Date.now() }
  setState({ groups: state.groups.map((g) => (g.id === id ? updated : g)) })
  await dbPutGroup(updated)
}

export async function archiveGroup(id: string, archived: boolean) {
  const group = state.groups.find((g) => g.id === id)
  if (!group) return
  const updated: Group = { ...group, archived, updatedAt: Date.now() }
  setState({ groups: state.groups.map((g) => (g.id === id ? updated : g)) })
  await dbPutGroup(updated)
}

/** Alterna o estado de favorito de um grupo. */
export async function toggleGroupFavorite(id: string) {
  const group = state.groups.find((g) => g.id === id)
  if (!group) return
  const updated: Group = { ...group, favorite: !group.favorite, updatedAt: Date.now() }
  setState({ groups: state.groups.map((g) => (g.id === id ? updated : g)) })
  await dbPutGroup(updated)
}

/** Desagrupa: remove o grupo, mantendo os topicos soltos na lista principal. */
export async function ungroup(id: string) {
  const detached = state.topics
    .filter((t) => t.groupId === id)
    .map((t) => ({ ...t, groupId: null, updatedAt: Date.now() }))
  setState({
    groups: state.groups.filter((g) => g.id !== id),
    topics: state.topics.map((t) => (t.groupId === id ? { ...t, groupId: null } : t)),
  })
  await Promise.all(detached.map((t) => dbPutTopic(t)))
  await dbDeleteGroup(id)
}

/** Exclui um grupo e TODO o conteudo dentro dele (topicos e notas). */
export async function deleteGroupAndContents(id: string) {
  const topicIds = state.topics.filter((t) => t.groupId === id).map((t) => t.id)
  setState({
    groups: state.groups.filter((g) => g.id !== id),
    topics: state.topics.filter((t) => t.groupId !== id),
    notes: state.notes.filter((n) => !topicIds.includes(n.topicId)),
  })
  await dbDeleteGroup(id)
  // Notas sao excluidas em cascata pelo dbDeleteTopic
  await Promise.all(topicIds.map((tid) => dbDeleteTopic(tid)))
}

/** Limpa todo o conteudo (notas) de um topico, mantendo o topico vazio. */
export async function clearTopicContent(id: string) {
  const notesToDelete = state.notes.filter((n) => n.topicId === id)
  setState({
    notes: state.notes.filter((n) => n.topicId !== id),
  })
  await Promise.all(notesToDelete.map((n) => dbDeleteNote(n.id)))
}

/* ------------------------------ Tópicos ------------------------------ */

export async function createTopic(
  title: string,
  icon: string,
  color: string,
  groupId: string | null = null,
) {
  const now = Date.now()
  const topic: Topic = {
    id: uid(),
    title: title.trim() || "Sem título",
    icon,
    color,
    groupId,
    pinned: false,
    order: now,
    archived: false,
    favorite: false,
    createdAt: now,
    updatedAt: now,
  }
  setState({ topics: [...state.topics, topic] })
  await dbPutTopic(topic)
  return topic
}

/** Alterna o estado de fixado (pin) de um tópico. */
export async function toggleTopicPin(id: string) {
  const topic = state.topics.find((t) => t.id === id)
  if (!topic) return
  const updated: Topic = { ...topic, pinned: !topic.pinned, updatedAt: Date.now() }
  setState({ topics: state.topics.map((t) => (t.id === id ? updated : t)) })
  await dbPutTopic(updated)
}

/**
 * Reordena tópicos a partir de uma lista de ids na ordem desejada.
 * Atribui `order` sequencial; usado pelo drag and drop da lista inicial.
 */
export async function reorderTopics(orderedIds: string[]) {
  const orderMap = new Map(orderedIds.map((id, index) => [id, index]))
  const changed: Topic[] = []
  const topics = state.topics.map((t) => {
    if (!orderMap.has(t.id)) return t
    const order = orderMap.get(t.id)!
    if (t.order === order) return t
    const updated = { ...t, order }
    changed.push(updated)
    return updated
  })
  if (changed.length === 0) return
  setState({ topics })
  await Promise.all(changed.map((t) => dbPutTopic(t)))
}

export async function updateTopic(
  id: string,
  patch: Partial<Pick<Topic, "title" | "icon" | "color" | "groupId">>,
) {
  const topic = state.topics.find((t) => t.id === id)
  if (!topic) return
  const updated: Topic = { ...topic, ...patch, updatedAt: Date.now() }
  setState({ topics: state.topics.map((t) => (t.id === id ? updated : t)) })
  await dbPutTopic(updated)
}

export async function archiveTopic(id: string, archived: boolean) {
  const topic = state.topics.find((t) => t.id === id)
  if (!topic) return
  const updated: Topic = { ...topic, archived, updatedAt: Date.now() }
  setState({ topics: state.topics.map((t) => (t.id === id ? updated : t)) })
  await dbPutTopic(updated)
}

/** Alterna o estado de favorito de um topico. */
export async function toggleTopicFavorite(id: string) {
  const topic = state.topics.find((t) => t.id === id)
  if (!topic) return
  const updated: Topic = { ...topic, favorite: !topic.favorite, updatedAt: Date.now() }
  setState({ topics: state.topics.map((t) => (t.id === id ? updated : t)) })
  await dbPutTopic(updated)
}

/** Agrupa topicos selecionados em um novo grupo. */
export async function groupSelectedTopics(groupTitle: string, groupIcon: string, groupColor: string, topicIds: string[]) {
  const now = Date.now()
  const group: Group = {
    id: uid(),
    title: groupTitle.trim() || "Novo grupo",
    icon: groupIcon,
    color: groupColor,
    order: now,
    archived: false,
    favorite: false,
    createdAt: now,
    updatedAt: now,
  }
  const updatedTopics = state.topics.map((t) =>
    topicIds.includes(t.id) ? { ...t, groupId: group.id, updatedAt: now } : t
  )
  setState({
    groups: [...state.groups, group],
    topics: updatedTopics,
  })
  await dbPutGroup(group)
  await Promise.all(
    updatedTopics
      .filter((t) => topicIds.includes(t.id))
      .map((t) => dbPutTopic(t))
  )
  return group
}

export async function deleteTopic(id: string) {
  setState({
    topics: state.topics.filter((t) => t.id !== id),
    notes: state.notes.filter((n) => n.topicId !== id),
  })
  await dbDeleteTopic(id)
}

/* ------------------------------ Notas ------------------------------ */

export async function addNote(topicId: string, text: string) {
  const trimmed = text.trim()
  if (!trimmed) return
  const now = Date.now()
  const note: Note = {
    id: uid(),
    topicId,
    kind: "text",
    text: trimmed,
    items: [],
    pinned: false,
    archived: false,
    createdAt: now,
    updatedAt: now,
  }
  setState({ notes: [...state.notes, note] })
  await dbPutNote(note)
  await touchTopic(topicId)
}

/** Cria diretamente uma nota do tipo checklist a partir de uma lista de itens. */
export async function addChecklistNote(topicId: string, items: string[], title = "") {
  const clean = items.map((i) => i.trim()).filter(Boolean)
  if (clean.length === 0) return
  const now = Date.now()
  const note: Note = {
    id: uid(),
    topicId,
    kind: "checklist",
    text: title.trim(),
    items: clean.map((text) => ({ id: uid(), text, done: false })),
    pinned: false,
    archived: false,
    createdAt: now,
    updatedAt: now,
  }
  setState({ notes: [...state.notes, note] })
  await dbPutNote(note)
  await touchTopic(topicId)
}

export async function updateNoteText(id: string, text: string) {
  const note = state.notes.find((n) => n.id === id)
  if (!note) return
  const updated: Note = { ...note, text: text.trim(), updatedAt: Date.now() }
  setState({ notes: state.notes.map((n) => (n.id === id ? updated : n)) })
  await dbPutNote(updated)
}

export async function deleteNote(id: string) {
  setState({ notes: state.notes.filter((n) => n.id !== id) })
  await dbDeleteNote(id)
}

export async function archiveNote(id: string, archived: boolean) {
  const note = state.notes.find((n) => n.id === id)
  if (!note) return
  const updated: Note = { ...note, archived, pinned: archived ? false : note.pinned, updatedAt: Date.now() }
  setState({ notes: state.notes.map((n) => (n.id === id ? updated : n)) })
  await dbPutNote(updated)
}

export async function togglePin(id: string) {
  const note = state.notes.find((n) => n.id === id)
  if (!note) return
  const updated: Note = { ...note, pinned: !note.pinned, updatedAt: Date.now() }
  setState({ notes: state.notes.map((n) => (n.id === id ? updated : n)) })
  await dbPutNote(updated)
}

/** Converte uma nota de texto em checklist (cada linha vira um item). */
export async function convertToChecklist(id: string) {
  const note = state.notes.find((n) => n.id === id)
  if (!note || note.kind === "checklist") return
  const items: ChecklistItem[] = note.text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ id: uid(), text: line, done: false }))
  if (items.length === 0) {
    items.push({ id: uid(), text: note.text || "Novo item", done: false })
  }
  const updated: Note = {
    ...note,
    kind: "checklist",
    items,
    text: "",
    updatedAt: Date.now(),
  }
  setState({ notes: state.notes.map((n) => (n.id === id ? updated : n)) })
  await dbPutNote(updated)
}

/** Converte um checklist de volta para nota de texto. */
export async function convertToText(id: string) {
  const note = state.notes.find((n) => n.id === id)
  if (!note || note.kind === "text") return
  const text = note.items.map((i) => i.text).join("\n")
  const updated: Note = { ...note, kind: "text", text, items: [], updatedAt: Date.now() }
  setState({ notes: state.notes.map((n) => (n.id === id ? updated : n)) })
  await dbPutNote(updated)
}

export async function toggleChecklistItem(noteId: string, itemId: string) {
  const note = state.notes.find((n) => n.id === noteId)
  if (!note) return
  const items = note.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i))
  const updated: Note = { ...note, items, updatedAt: Date.now() }
  setState({ notes: state.notes.map((n) => (n.id === noteId ? updated : n)) })
  await dbPutNote(updated)
}

export async function addChecklistItem(noteId: string, text: string) {
  const note = state.notes.find((n) => n.id === noteId)
  if (!note || !text.trim()) return
  const items = [...note.items, { id: uid(), text: text.trim(), done: false }]
  const updated: Note = { ...note, items, updatedAt: Date.now() }
  setState({ notes: state.notes.map((n) => (n.id === noteId ? updated : n)) })
  await dbPutNote(updated)
}

export async function updateChecklistItem(noteId: string, itemId: string, text: string) {
  const note = state.notes.find((n) => n.id === noteId)
  if (!note) return
  const items = note.items
    .map((i) => (i.id === itemId ? { ...i, text: text.trim() } : i))
    .filter((i) => i.text.length > 0)
  const updated: Note = { ...note, items, updatedAt: Date.now() }
  setState({ notes: state.notes.map((n) => (n.id === noteId ? updated : n)) })
  await dbPutNote(updated)
}

export async function deleteChecklistItem(noteId: string, itemId: string) {
  const note = state.notes.find((n) => n.id === noteId)
  if (!note) return
  const items = note.items.filter((i) => i.id !== itemId)
  const updated: Note = { ...note, items, updatedAt: Date.now() }
  setState({ notes: state.notes.map((n) => (n.id === noteId ? updated : n)) })
  await dbPutNote(updated)
}

async function touchTopic(topicId: string) {
  const topic = state.topics.find((t) => t.id === topicId)
  if (!topic) return
  const updated = { ...topic, updatedAt: Date.now() }
  setState({ topics: state.topics.map((t) => (t.id === topicId ? updated : t)) })
  await dbPutTopic(updated)
}

/* ------------------------------ Hooks ------------------------------ */

export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** Constrói o TopicWithMeta de um tópico a partir das notas em memória. */
function buildTopicMeta(topic: Topic, notes: Note[]): TopicWithMeta {
  const own = notes.filter((n) => n.topicId === topic.id && !n.archived)
  const last = own.reduce<Note | null>((acc, n) => {
    if (!acc || n.createdAt > acc.createdAt) return n
    return acc
  }, null)
  return {
    ...topic,
    noteCount: own.length,
    lastNoteAt: last ? last.createdAt : null,
    lastNotePreview: last ? previewOf(last) : "Toque para começar a anotar",
  }
}

/** Ordenação dos tópicos: fixados primeiro, depois pela ordem manual. */
function sortTopics(a: TopicWithMeta, b: TopicWithMeta) {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
  return a.order - b.order
}

/**
 * Árvore da tela inicial: grupos (não arquivados) com seus tópicos
 * (não arquivados) + tópicos soltos (sem grupo).
 */
export function useTopicsTree(): { groups: GroupWithTopics[]; ungrouped: TopicWithMeta[] } {
  const s = useStore()
  const metas = s.topics
    .filter((t) => !t.archived)
    .map((t) => buildTopicMeta(t, s.notes))

  const groups: GroupWithTopics[] = s.groups
    .filter((g) => !g.archived)
    .map((g) => {
      const topics = metas.filter((t) => t.groupId === g.id).sort(sortTopics)
      const lastActivityAt = topics.reduce<number | null>((acc, t) => {
        const at = t.lastNoteAt ?? t.updatedAt
        return acc === null || at > acc ? at : acc
      }, null)
      return {
        ...g,
        topics,
        topicCount: topics.length,
        lastActivityAt: lastActivityAt ?? g.updatedAt,
      }
    })
    .sort((a, b) => a.order - b.order)

  const ungrouped = metas
    .filter((t) => !t.groupId || !s.groups.some((g) => g.id === t.groupId && !g.archived))
    .sort(sortTopics)

  return { groups, ungrouped }
}

/** Itens arquivados (grupos e tópicos) para a seção de Arquivados. */
export function useArchived(): { groups: Group[]; topics: TopicWithMeta[] } {
  const s = useStore()
  const groups = s.groups.filter((g) => g.archived).sort((a, b) => a.order - b.order)
  const topics = s.topics
    .filter((t) => t.archived)
    .map((t) => buildTopicMeta(t, s.notes))
    .sort(sortTopics)
  return { groups, topics }
}

/** Total de itens arquivados (para o badge no cabeçalho). */
export function useArchivedCount(): number {
  const s = useStore()
  return s.groups.filter((g) => g.archived).length + s.topics.filter((t) => t.archived).length
}

/** Hook para contar favoritos. */
export function useFavoriteCount(): number {
  const { groups, topics } = useStore()
  return groups.filter((g) => g.favorite && !g.archived).length +
    topics.filter((t) => t.favorite && !t.archived).length
}

/** Hook para listar todos os favoritos (grupos + topicos). */
export function useFavorites(): { groups: Group[]; topics: TopicWithMeta[] } {
  const { groups, topics, notes } = useStore()
  const favGroups = groups
    .filter((g) => g.favorite && !g.archived)
    .sort((a, b) => a.order - b.order)
  const favTopics = topics
    .filter((t) => t.favorite && !t.archived)
    .map((t) => buildTopicMeta(t, notes))
    .sort(sortTopics)
  return { groups: favGroups, topics: favTopics }
}

/** Lista simples de grupos não arquivados (para selects). */
export function useGroups(): Group[] {
  const s = useStore()
  return s.groups
    .filter((g) => !g.archived)
    .sort((a, b) => a.title.localeCompare(b.title))
}

export function useTopic(topicId: string | null): Topic | null {
  const s = useStore()
  if (!topicId) return null
  return s.topics.find((t) => t.id === topicId) ?? null
}

/** Notas ativas de um tópico, fixadas primeiro e depois cronológicas. */
export function useNotes(topicId: string | null): Note[] {
  const s = useStore()
  if (!topicId) return []
  return s.notes
    .filter((n) => n.topicId === topicId && !n.archived)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return a.createdAt - b.createdAt
    })
}

/** Notas arquivadas de um tópico (cronológicas). */
export function useArchivedNotes(topicId: string | null): Note[] {
  const s = useStore()
  if (!topicId) return []
  return s.notes
    .filter((n) => n.topicId === topicId && n.archived)
    .sort((a, b) => a.createdAt - b.createdAt)
}

function previewOf(note: Note): string {
  if (note.kind === "checklist") {
    const done = note.items.filter((i) => i.done).length
    return `Lista · ${done}/${note.items.length} concluídos`
  }
  return note.text.replace(/\n/g, " ")
}

/* --------------------------- Dados iniciais --------------------------- */

async function seed() {
  const now = Date.now()
  const groupId = uid()
  const group: Group = {
    id: groupId,
    title: "Casa",
    icon: "home",
    color: "teal",
    order: now,
    archived: false,
    favorite: false,
    createdAt: now,
    updatedAt: now,
  }
  await dbPutGroup(group)

  const examples: {
    topic: Omit<Topic, "createdAt" | "updatedAt" | "pinned" | "order" | "favorite">
      & { favorite?: boolean }
    notes: string[]
    checklist?: string[]
  }[] = [
    {
      topic: {
        id: uid(),
        title: "Supermercado",
        icon: "cart",
        color: "green",
        groupId,
        archived: false,
      },
      notes: [],
      checklist: ["Café", "Leite", "Pão integral", "Ovos", "Frutas"],
    },
    {
      topic: {
        id: uid(),
        title: "Tarefas da Casa",
        icon: "home",
        color: "cyan",
        groupId,
        archived: false,
      },
      notes: [],
      checklist: ["Pagar conta de luz", "Trocar lâmpada da sala", "Regar as plantas"],
    },
    {
      topic: {
        id: uid(),
        title: "Ideias de Projetos",
        icon: "idea",
        color: "amber",
        groupId: null,
        archived: false,
      },
      notes: [
        "App de notas estilo chat (esse aqui!)",
        "Player de podcast com transcrição automática",
        "Extensão para resumir artigos longos",
      ],
    },
    {
      topic: {
        id: uid(),
        title: "Trabalho",
        icon: "work",
        color: "blue",
        groupId: null,
        archived: false,
      },
      notes: ["Revisar PR da equipe", "Preparar slides da retro de sexta"],
    },
  ]

  const groups: Group[] = [group]
  const topics: Topic[] = []
  const notes: Note[] = []
  let t = now

  for (const ex of examples) {
    const topic: Topic = { ...ex.topic, favorite: ex.topic.favorite ?? false, pinned: false, order: t, createdAt: t, updatedAt: t }
    topics.push(topic)
    await dbPutTopic(topic)

    for (const text of ex.notes) {
      t += 1000
      const note: Note = {
        id: uid(),
        topicId: topic.id,
        kind: "text",
        text,
        items: [],
        pinned: false,
        archived: false,
        createdAt: t,
        updatedAt: t,
      }
      notes.push(note)
      await dbPutNote(note)
    }

    if (ex.checklist) {
      t += 1000
      const note: Note = {
        id: uid(),
        topicId: topic.id,
        kind: "checklist",
        text: "",
        items: ex.checklist.map((line, i) => ({ id: uid(), text: line, done: i >= 3 })),
        pinned: false,
        archived: false,
        createdAt: t,
        updatedAt: t,
      }
      notes.push(note)
      await dbPutNote(note)
    }
  }

  setState({ groups, topics, notes, loaded: true })
}
