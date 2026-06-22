/**
 * Modelagem de dados do app (camada de domínio).
 *
 * Hierarquia:
 *   Group (1) ──< Topic (N) ──< Note (N)
 *
 * - Um Group ("Tópico Grupo") agrega vários Topics.
 * - Um Topic pode pertencer a um Group (groupId) ou ficar solto (groupId = null).
 * - Um Topic possui muitas Notes (Note.topicId).
 */

/** Itens de um checklist dentro de uma nota. */
export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

/** Tipos de conteúdo que um balão de nota pode assumir. */
export type NoteKind = "text" | "checklist"

/** Entidade Nota — uma "mensagem" dentro de um tópico/chat. */
export interface Note {
  id: string
  topicId: string // FK -> Topic.id
  kind: NoteKind
  /** Conteúdo textual (usado quando kind === "text"). */
  text: string
  /** Itens do checklist (usado quando kind === "checklist"). */
  items: ChecklistItem[]
  pinned: boolean
  /** Quando true, a nota fica recolhida na seção de arquivadas. */
  archived: boolean
  createdAt: number
  updatedAt: number
}

/** Entidade Tópico — equivalente a uma "conversa" na lista do Telegram. */
export interface Topic {
  id: string
  title: string
  /** Nome do ícone (chave do nosso catálogo de ícones Lucide). */
  icon: string
  /** Cor de destaque do avatar do tópico (chave do catálogo de cores). */
  color: string
  /** Grupo ao qual o tópico pertence (null = solto na raiz). */
  groupId: string | null
  /** Quando true, o tópico fica fixado no topo da lista. */
  pinned: boolean
  /** Posição manual na lista (ordenação por drag and drop). */
  order: number
  /** Quando true, o tópico fica na seção de arquivados. */
  archived: boolean
  /** Quando true, o tópico aparece na aba Favoritos. */
  favorite: boolean
  createdAt: number
  updatedAt: number
}

/** Entidade Grupo — agrupa vários tópicos ("Tópico Grupo"). */
export interface Group {
  id: string
  title: string
  icon: string
  color: string
  /** Posição manual na lista (ordenação por drag and drop). */
  order: number
  /** Quando true, o grupo (e a forma como aparece) fica arquivado. */
  archived: boolean
  /** Quando true, o grupo aparece na aba Favoritos. */
  favorite: boolean
  createdAt: number
  updatedAt: number
}

/** Tópico enriquecido com dados derivados para a lista inicial. */
export interface TopicWithMeta extends Topic {
  lastNotePreview: string
  lastNoteAt: number | null
  noteCount: number
}

/** Grupo enriquecido com seus tópicos resolvidos. */
export interface GroupWithTopics extends Group {
  topics: TopicWithMeta[]
  topicCount: number
  lastActivityAt: number | null
}
