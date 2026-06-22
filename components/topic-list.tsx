"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, Reorder, useDragControls } from "framer-motion"
import { Plus, Search, NotebookPen, ChevronRight, Archive, FolderPlus, Pin, GripVertical, Settings, Check, X, Trash2, Heart, FolderOpen, ArchiveRestore, MoreVertical } from "lucide-react"

import { useRouter } from "next/navigation"
import { TopicAvatar } from "@/components/topic-avatar"
import { TopicEditorSheet } from "@/components/topic-editor-sheet"
import { EntityMenuSheet } from "@/components/entity-menu-sheet"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import {
  archiveGroup,
  archiveTopic,
  createGroup,
  createTopic,
  deleteTopic,
  deleteGroupAndContents,
  ungroup,
  clearTopicContent,
  reorderTopics,
  reorderGroups,
  toggleTopicPin,
  toggleTopicFavorite,
  toggleGroupFavorite,
  groupSelectedTopics,
  updateGroup,
  updateTopic,
  useArchivedCount,
  useFavoriteCount,
  useTopicsTree,
  useFavorites,
  useArchived,
} from "@/lib/store"
import { useLongPress } from "@/lib/use-long-press"
import { useBack } from "@/lib/use-back"
import { formatListTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Group, GroupWithTopics, Topic, TopicWithMeta } from "@/lib/types"

type Tab = "all" | "archived" | "groups" | "topics" | "favorites"

interface Props {
  onOpenTopic: (id: string) => void
}

type Editor =
  | { mode: "create-topic"; groupId: string | null }
  | { mode: "edit-topic"; topic: Topic }
  | { mode: "create-group" }
  | { mode: "edit-group"; group: Group }
  | null

type Selected =
  | { kind: "group"; entity: Group }
  | { kind: "topic"; entity: TopicWithMeta }
  | null

/** Tela principal com sistema de TABs. */
export function TopicList({ onOpenTopic }: Props) {
  const { groups, ungrouped } = useTopicsTree()
  const favorites = useFavorites()
  const archived = useArchived()
  const archivedCount = useArchivedCount()
  const favoriteCount = useFavoriteCount()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<Tab>("all")
  const [query, setQuery] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editor, setEditor] = useState<Editor>(null)
  const [selected, setSelected] = useState<Selected>(null)
  const [fabOpen, setFabOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // Selecao multipla
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [grouping, setGrouping] = useState(false)

  const q = query.trim().toLowerCase()
  const allTopics = [...groups.flatMap((g) => g.topics), ...ungrouped]
  const searchResults = q ? allTopics.filter((t) => t.title.toLowerCase().includes(q)) : []

  // Back handlers: cancela a ação ativa mais recente ao pressionar voltar
  useBack(selectMode, () => { setSelectMode(false); setSelectedIds(new Set()) })
  useBack(!!query, () => setQuery(""))
  useBack(grouping, () => setGrouping(false))
  useBack(fabOpen, () => setFabOpen(false))
  useBack(menuOpen, () => setMenuOpen(false))
  useBack(selected !== null, () => setSelected(null))
  useBack(editor !== null, () => setEditor(null))

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleArchiveSelected() {
    selectedIds.forEach((id) => {
      const isGroup = groups.some((g) => g.id === id)
      if (isGroup) archiveGroup(id, true)
      else archiveTopic(id, true)
    })
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  function handleUnarchiveSelected() {
    selectedIds.forEach((id) => {
      const isGroup = archived.groups.some((g) => g.id === id)
      if (isGroup) archiveGroup(id, false)
      else archiveTopic(id, false)
    })
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  function handleDeleteSelected() {
    selectedIds.forEach((id) => {
      const isGroup = activeTab === "archived"
        ? archived.groups.some((g) => g.id === id)
        : groups.some((g) => g.id === id)
      if (isGroup) deleteGroupAndContents(id)
      else deleteTopic(id)
    })
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  function handleGroupSelected() {
    setGrouping(true)
  }

  function onCreateGroupFromSelection(title: string, icon: string, color: string) {
    const topicIds = Array.from(selectedIds).filter((id) =>
      allTopics.some((t) => t.id === id)
    )
    groupSelectedTopics(title, icon, color, topicIds)
    setSelectMode(false)
    setSelectedIds(new Set())
    setGrouping(false)
    setActiveTab("groups")
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "all", label: "Todos" },
    { key: "favorites", label: "Favoritos", count: favoriteCount },
    { key: "groups", label: "Grupos" },
    { key: "topics", label: "Tópicos" },
    { key: "archived", label: "Arquivados", count: archivedCount },
  ]

  const isEmpty = groups.length === 0 && ungrouped.length === 0

  return (
    <>
      <div className="flex h-full flex-col bg-background">
        {/* Cabecalho */}
        <header className="sticky top-0 z-10 border-b border-border bg-background/90 px-3 pb-2 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight">Bullet Point</h1>
            {selectMode ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selectedIds.size}</span>
                <button
                  onClick={() => { setSelectMode(false); setSelectedIds(new Set()) }}
                  aria-label="Cancelar selecao"
                  className="no-tap-highlight flex h-9 w-9 items-center justify-center rounded-full text-foreground active:bg-secondary"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setMenuOpen(true)}
                aria-label="Menu"
                className="no-tap-highlight flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground active:bg-secondary"
              >
                <MoreVertical size={20} />
              </button>
            )}
          </div>
          <div className="relative mt-2">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="h-10 rounded-full border-transparent bg-muted pl-9 text-sm"
            />
          </div>

          {/* TABs */}
          {!selectMode && (
            <div className="mt-2 flex gap-1 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "relative shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {tab.label}
                  {tab.count ? (
                    <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px]">
                      {tab.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Conteudo da aba ativa */}
        <div className="no-scrollbar flex-1 overflow-y-auto px-2 pb-4">
          {isEmpty ? (
            <EmptyState onCreate={() => setEditor({ mode: "create-topic", groupId: null })} />
          ) : q ? (
            searchResults.length === 0 ? (
              <NoResults />
            ) : (
              <ul className="py-2">
                {searchResults.map((topic, i) => (
                  <TopicRow
                    key={topic.id}
                    topic={topic}
                    index={i}
                    onClick={() => {
                      if (selectMode) toggleSelection(topic.id)
                      else onOpenTopic(topic.id)
                    }}
                    onMenu={() => setSelected({ kind: "topic", entity: topic })}
                    selectMode={selectMode}
                    selected={selectedIds.has(topic.id)}
                    onEnterSelectMode={() => setSelectMode(true)}
                  />
                ))}
              </ul>
            )
          ) : activeTab === "all" ? (
            <AllTab
              groups={groups}
              ungrouped={ungrouped}
              expanded={expanded}
              onToggleExpand={toggleExpand}
              onOpenTopic={onOpenTopic}
              onGroupMenu={(g) => setSelected({ kind: "group", entity: g })}
              onTopicMenu={(t) => setSelected({ kind: "topic", entity: t })}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelection}
              onEnterSelectMode={() => setSelectMode(true)}
            />
          ) : activeTab === "groups" ? (
            <GroupsTab
              groups={groups}
              expanded={expanded}
              onToggleExpand={toggleExpand}
              onOpenTopic={onOpenTopic}
              onGroupMenu={(g) => setSelected({ kind: "group", entity: g })}
              onTopicMenu={(t) => setSelected({ kind: "topic", entity: t })}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelection}
              onEnterSelectMode={() => setSelectMode(true)}
            />
          ) : activeTab === "topics" ? (
            <TopicsTab
              topics={ungrouped}
              onOpenTopic={onOpenTopic}
              onTopicMenu={(t) => setSelected({ kind: "topic", entity: t })}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelection}
              onEnterSelectMode={() => setSelectMode(true)}
            />
          ) : activeTab === "favorites" ? (
            <FavoritesTab
              groups={favorites.groups}
              topics={favorites.topics}
              onOpenTopic={onOpenTopic}
              onGroupMenu={(g) => setSelected({ kind: "group", entity: g })}
              onTopicMenu={(t) => setSelected({ kind: "topic", entity: t })}
            />
          ) : activeTab === "archived" ? (
            <ArchivedTab
              groups={archived.groups}
              topics={archived.topics}
              onOpenTopic={onOpenTopic}
              onGroupMenu={(g) => setSelected({ kind: "group", entity: g })}
              onTopicMenu={(t) => setSelected({ kind: "topic", entity: t })}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelection}
              onEnterSelectMode={() => setSelectMode(true)}
            />
          ) : null}
        </div>

        {/* Barra de acoes em massa */}
        {selectMode && (
          <div className="shrink-0 border-t border-border bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
            <div className="mx-auto flex max-w-md gap-2">
              {activeTab === "archived" ? (
                <>
                  <button
                    onClick={handleUnarchiveSelected}
                    disabled={selectedIds.size === 0}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent py-2.5 text-xs font-medium text-accent-foreground transition-colors active:bg-accent/80 disabled:opacity-40"
                  >
                    <ArchiveRestore size={16} />
                    Desarquivar
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    disabled={selectedIds.size === 0}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-destructive/10 py-2.5 text-xs font-medium text-destructive transition-colors active:bg-destructive/20 disabled:opacity-40"
                  >
                    <Trash2 size={16} />
                    Excluir
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleArchiveSelected}
                    disabled={selectedIds.size === 0}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-muted py-2.5 text-xs font-medium text-foreground transition-colors active:bg-secondary disabled:opacity-40"
                  >
                    <Archive size={16} />
                    Arquivar
                  </button>
                  <button
                    onClick={handleGroupSelected}
                    disabled={selectedIds.size < 2}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent py-2.5 text-xs font-medium text-accent-foreground transition-colors active:bg-accent/80 disabled:opacity-40"
                  >
                    <FolderPlus size={16} />
                    Agrupar
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    disabled={selectedIds.size === 0}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-destructive/10 py-2.5 text-xs font-medium text-destructive transition-colors active:bg-destructive/20 disabled:opacity-40"
                  >
                    <Trash2 size={16} />
                    Excluir
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* FAB */}
        {!selectMode && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setFabOpen(true)}
            aria-label="Criar"
            className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
          >
            <Plus size={22} strokeWidth={2.5} />
          </motion.button>
        )}
      </div>

      {/* Drawer de agrupamento rapido */}
      <Drawer open={grouping} onOpenChange={setGrouping}>
        <DrawerContent className="no-tap-highlight">
          <div className="mx-auto w-full max-w-md pb-4">
            <DrawerHeader>
              <DrawerTitle className="text-left text-sm font-normal text-muted-foreground">
                Novo grupo com {selectedIds.size} itens
              </DrawerTitle>
            </DrawerHeader>
            <QuickGroupForm
              onSubmit={onCreateGroupFromSelection}
              onCancel={() => { setGrouping(false); setSelectMode(false); setSelectedIds(new Set()) }}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Menu de 3 pontos do topo */}
      <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
        <DrawerContent className="no-tap-highlight">
          <div className="mx-auto w-full max-w-md pb-2">
            <DrawerHeader>
              <DrawerTitle className="text-left text-sm font-normal text-muted-foreground">
                Menu
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-2 pb-2">
              <CreateAction
                icon={<FolderPlus size={20} />}
                label="Novo grupo"
                description="Reune vários tópicos"
                onClick={() => {
                  setMenuOpen(false)
                  setEditor({ mode: "create-group" })
                }}
              />
              <CreateAction
                icon={<NotebookPen size={20} />}
                label="Novo tópico"
                description="Uma tópico para suas notas e listas"
                onClick={() => {
                  setMenuOpen(false)
                  setEditor({ mode: "create-topic", groupId: null })
                }}
              />
              <CreateAction
                icon={<Settings size={20} />}
                label="Configurações"
                description="Personalize seu Bullet Point"
                onClick={() => {
                  setMenuOpen(false)
                  router.push("/settings")
                }}
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Menu criar do FAB */}
      <Drawer open={fabOpen} onOpenChange={setFabOpen}>
        <DrawerContent className="no-tap-highlight">
          <div className="mx-auto w-full max-w-md pb-2">
            <DrawerHeader>
              <DrawerTitle className="text-left text-sm font-normal text-muted-foreground">
                Criar novo
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-2 pb-2">
              <CreateAction
                icon={<NotebookPen size={20} />}
                label="Novo tópico"
                description="Uma tópico para suas notas e listas"
                onClick={() => {
                  setFabOpen(false)
                  setEditor({ mode: "create-topic", groupId: null })
                }}
              />
              <CreateAction
                icon={<FolderPlus size={20} />}
                label="Novo grupo"
                description="Reune vários tópicos"
                onClick={() => {
                  setFabOpen(false)
                  setEditor({ mode: "create-group" })
                }}
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Menu de contexto - oculto em modo de selecao */}
      <EntityMenuSheet
        open={selected !== null && !selectMode}
        onOpenChange={(open) => !open && setSelected(null)}
        kind={selected?.kind ?? "topic"}
        title={selected?.entity.title ?? ""}
        archived={selected?.entity.archived ?? false}
        favorited={selected?.entity.favorite ?? false}
        pinned={selected?.kind === "topic" ? (selected.entity as TopicWithMeta).pinned ?? false : false}
        onTogglePin={
          selected?.kind === "topic"
            ? () => {
                toggleTopicPin(selected.entity.id)
                setSelected(null)
              }
            : undefined
        }
        onToggleFavorite={() => {
          if (!selected) return
          if (selected.kind === "group") toggleGroupFavorite(selected.entity.id)
          else toggleTopicFavorite(selected.entity.id)
          setSelected(null)
        }}
        onAddTopic={
          selected?.kind === "group"
            ? () => {
                const gid = selected.entity.id
                setSelected(null)
                setEditor({ mode: "create-topic", groupId: gid })
              }
            : undefined
        }
        onEdit={() => {
          if (!selected) return
          if (selected.kind === "group") setEditor({ mode: "edit-group", group: selected.entity })
          else setEditor({ mode: "edit-topic", topic: selected.entity })
          setSelected(null)
        }}
        onToggleArchive={() => {
          if (!selected) return
          if (selected.kind === "group") archiveGroup(selected.entity.id, !selected.entity.archived)
          else archiveTopic(selected.entity.id, !selected.entity.archived)
          setSelected(null)
        }}
        onDelete={() => {
          if (!selected) return
          if (selected.kind === "group") deleteGroupAndContents(selected.entity.id)
          else deleteTopic(selected.entity.id)
          setSelected(null)
        }}
        onUngroup={
          selected?.kind === "group"
            ? () => {
                ungroup(selected.entity.id)
                setSelected(null)
              }
            : undefined
        }
        onClearContent={
          selected?.kind === "topic"
            ? () => {
                clearTopicContent(selected.entity.id)
                setSelected(null)
              }
            : undefined
        }
        onSelect={
          selected
            ? () => {
                setSelectMode(true)
                setSelectedIds(new Set([selected.entity.id]))
                setSelected(null)
              }
            : undefined
        }
      />

      {/* Editor */}
      <TopicEditorSheet
        open={editor !== null}
        onOpenChange={(open) => !open && setEditor(null)}
        variant={editor?.mode === "create-group" || editor?.mode === "edit-group" ? "group" : "topic"}
        topic={editor?.mode === "edit-topic" ? editor.topic : null}
        group={editor?.mode === "edit-group" ? editor.group : null}
        defaultGroupId={editor?.mode === "create-topic" ? editor.groupId : null}
        onSubmit={({ title, icon, color, groupId }) => {
          if (!editor) return
          switch (editor.mode) {
            case "create-topic":
              createTopic(title, icon, color, groupId)
              break
            case "edit-topic":
              updateTopic(editor.topic.id, { title, icon, color, groupId })
              break
            case "create-group":
              createGroup(title, icon, color)
              break
            case "edit-group":
              updateGroup(editor.group.id, { title, icon, color })
              break
          }
        }}
      />
    </>
  )
}

/* ------------------------------ TAB: Todos ------------------------------ */

function AllTab({
  groups,
  ungrouped,
  expanded,
  onToggleExpand,
  onOpenTopic,
  onGroupMenu,
  onTopicMenu,
  selectMode,
  selectedIds,
  onToggleSelect,
  onEnterSelectMode,
}: {
  groups: GroupWithTopics[]
  ungrouped: TopicWithMeta[]
  expanded: Set<string>
  onToggleExpand: (id: string) => void
  onOpenTopic: (id: string) => void
  onGroupMenu: (g: GroupWithTopics) => void
  onTopicMenu: (t: TopicWithMeta) => void
  selectMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onEnterSelectMode: () => void
}) {
  if (groups.length === 0 && ungrouped.length === 0) {
    return <EmptyState onCreate={() => {}} />
  }

  return (
    <div className="py-2">
      {groups.length > 0 && (
        <>
          <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Grupos</p>
          <SortableGroupList
            groups={groups}
            expanded={expanded}
            onToggleExpand={onToggleExpand}
            onOpenTopic={onOpenTopic}
            onGroupMenu={onGroupMenu}
            onTopicMenu={onTopicMenu}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onEnterSelectMode={onEnterSelectMode}
          />
        </>
      )}
      {ungrouped.length > 0 && (
        <>
          <p className="mb-1 mt-3 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tópicos</p>
          <SortableTopicList
            topics={ungrouped}
            onOpenTopic={onOpenTopic}
            onTopicMenu={onTopicMenu}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onEnterSelectMode={onEnterSelectMode}
          />
        </>
      )}
    </div>
  )
}

/* ------------------------------ TAB: Grupos ------------------------------ */

function GroupsTab({
  groups,
  expanded,
  onToggleExpand,
  onOpenTopic,
  onGroupMenu,
  onTopicMenu,
  selectMode,
  selectedIds,
  onToggleSelect,
  onEnterSelectMode,
}: {
  groups: GroupWithTopics[]
  expanded: Set<string>
  onToggleExpand: (id: string) => void
  onOpenTopic: (id: string) => void
  onGroupMenu: (g: GroupWithTopics) => void
  onTopicMenu: (t: TopicWithMeta) => void
  selectMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onEnterSelectMode: () => void
}) {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FolderOpen size={40} className="mb-3 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Nenhum grupo criado ainda.</p>
      </div>
    )
  }

  return (
    <div className="py-2">
      <SortableGroupList
        groups={groups}
        expanded={expanded}
        onToggleExpand={onToggleExpand}
        onOpenTopic={onOpenTopic}
        onGroupMenu={onGroupMenu}
        onTopicMenu={onTopicMenu}
        selectMode={selectMode}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onEnterSelectMode={onEnterSelectMode}
      />
    </div>
  )
}

/* ------------------------------ TAB: Tópicos ------------------------------ */

function TopicsTab({
  topics,
  onOpenTopic,
  onTopicMenu,
  selectMode,
  selectedIds,
  onToggleSelect,
  onEnterSelectMode,
}: {
  topics: TopicWithMeta[]
  onOpenTopic: (id: string) => void
  onTopicMenu: (t: TopicWithMeta) => void
  selectMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onEnterSelectMode: () => void
}) {
  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <NotebookPen size={40} className="mb-3 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Nenhum tópico criado ainda.</p>
      </div>
    )
  }

  return (
    <SortableTopicList
      topics={topics}
      onOpenTopic={onOpenTopic}
      onTopicMenu={onTopicMenu}
      selectMode={selectMode}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onEnterSelectMode={onEnterSelectMode}
    />
  )
}

/* ------------------------------ TAB: Favoritos ------------------------------ */

function FavoritesTab({
  groups,
  topics,
  onOpenTopic,
  onGroupMenu,
  onTopicMenu,
}: {
  groups: Group[]
  topics: TopicWithMeta[]
  onOpenTopic: (id: string) => void
  onGroupMenu: (g: Group) => void
  onTopicMenu: (t: TopicWithMeta) => void
}) {
  if (groups.length === 0 && topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Heart size={40} className="mb-3 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Nenhum favorito ainda.</p>
        <p className="text-xs text-muted-foreground/60">Toque e segure em um item para favorita-lo.</p>
      </div>
    )
  }

  return (
    <div className="py-2">
      {groups.length > 0 && (
        <>
          <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Grupos</p>
          <SortableSimpleGroupList groups={groups} onGroupMenu={onGroupMenu} />
        </>
      )}
      {topics.length > 0 && (
        <>
          <p className="mb-1 mt-3 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tópicos</p>
          <SortableTopicList
            topics={topics}
            onOpenTopic={onOpenTopic}
            onTopicMenu={onTopicMenu}
            selectMode={false}
            selectedIds={new Set()}
            onToggleSelect={() => {}}
          />
        </>
      )}
    </div>
  )
}

/* ----------------------- Lista simples de grupos arrastavel ----------------------- */

function SortableSimpleGroupList({
  groups,
  onGroupMenu,
}: {
  groups: Group[]
  onGroupMenu: (g: Group) => void
}) {
  const [ids, setIds] = useState<string[]>(() => groups.map((g) => g.id))

  useEffect(() => {
    const incoming = groups.map((g) => g.id)
    setIds((prev) =>
      prev.length === incoming.length && prev.every((id, i) => id === incoming[i])
        ? prev
        : incoming,
    )
  }, [groups])

  const byId = new Map(groups.map((g) => [g.id, g]))

  return (
    <Reorder.Group
      as="div"
      axis="y"
      values={ids}
      onReorder={(next) => {
        setIds(next)
        reorderGroups(next)
      }}
    >
      {ids.map((id) => {
        const group = byId.get(id)
        if (!group) return null
        return <SortableSimpleGroupRow key={id} group={group} onMenu={() => onGroupMenu(group)} />
      })}
    </Reorder.Group>
  )
}

function SortableSimpleGroupRow({ group, onMenu }: { group: Group; onMenu: () => void }) {
  const controls = useDragControls()
  return (
    <Reorder.Item
      value={group.id}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-1 rounded-2xl pr-1 active:bg-secondary"
    >
      <button
        onClick={onMenu}
        className="no-tap-highlight flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 text-left"
      >
        <TopicAvatar icon={group.icon} color={group.color} size="sm" />
        <span className="truncate text-[15px] font-semibold">{group.title}</span>
      </button>
      <button
        onPointerDown={(e) => controls.start(e)}
        aria-label={`Reordenar ${group.title}`}
        className="no-tap-highlight flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground/60 active:cursor-grabbing"
      >
        <GripVertical size={18} />
      </button>
      <MenuButton onClick={onMenu} label={`Opções do grupo ${group.title}`} />
    </Reorder.Item>
  )
}

/* ------------------------------ TAB: Arquivados ------------------------------ */

function ArchivedTab({
  groups,
  topics,
  onOpenTopic,
  onGroupMenu,
  onTopicMenu,
  selectMode,
  selectedIds,
  onToggleSelect,
  onEnterSelectMode,
}: {
  groups: Group[]
  topics: TopicWithMeta[]
  onOpenTopic: (id: string) => void
  onGroupMenu: (g: Group) => void
  onTopicMenu: (t: TopicWithMeta) => void
  selectMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onEnterSelectMode: () => void
}) {
  const isEmpty = groups.length === 0 && topics.length === 0

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Archive size={40} className="mb-3 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Nada arquivado.</p>
        <p className="text-xs text-muted-foreground/60">Grupos e tópicos arquivados aparecem aqui.</p>
      </div>
    )
  }

  return (
    <div className="py-2">
      {groups.length > 0 && (
        <>
          <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Grupos</p>
          <SortableArchivedGroupList
            groups={groups}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onGroupMenu={onGroupMenu}
          />
        </>
      )}
      {topics.length > 0 && (
        <>
          <p className="mb-1 mt-3 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tópicos</p>
          <SortableArchivedTopicList
            topics={topics}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onOpenTopic={onOpenTopic}
            onTopicMenu={onTopicMenu}
          />
        </>
      )}
    </div>
  )
}

function SortableArchivedGroupList({
  groups,
  selectMode,
  selectedIds,
  onToggleSelect,
  onGroupMenu,
}: {
  groups: Group[]
  selectMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onGroupMenu: (g: Group) => void
}) {
  const [ids, setIds] = useState<string[]>(() => groups.map((g) => g.id))

  useEffect(() => {
    const incoming = groups.map((g) => g.id)
    setIds((prev) =>
      prev.length === incoming.length && prev.every((id, i) => id === incoming[i])
        ? prev
        : incoming,
    )
  }, [groups])

  const byId = new Map(groups.map((g) => [g.id, g]))

  return (
    <Reorder.Group
      as="div"
      axis="y"
      values={ids}
      onReorder={(next) => {
        setIds(next)
        reorderGroups(next)
      }}
    >
      {ids.map((id) => {
        const group = byId.get(id)
        if (!group) return null
        return (
          <ArchivedGroupRow
            key={id}
            group={group}
            selectMode={selectMode}
            selected={selectedIds.has(id)}
            onToggleSelect={() => onToggleSelect(id)}
            onMenu={() => onGroupMenu(group)}
          />
        )
      })}
    </Reorder.Group>
  )
}

function SortableArchivedTopicList({
  topics,
  selectMode,
  selectedIds,
  onToggleSelect,
  onOpenTopic,
  onTopicMenu,
}: {
  topics: TopicWithMeta[]
  selectMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onOpenTopic: (id: string) => void
  onTopicMenu: (t: TopicWithMeta) => void
}) {
  const [ids, setIds] = useState<string[]>(() => topics.map((t) => t.id))

  useEffect(() => {
    const incoming = topics.map((t) => t.id)
    setIds((prev) =>
      prev.length === incoming.length && prev.every((id, i) => id === incoming[i])
        ? prev
        : incoming,
    )
  }, [topics])

  const byId = new Map(topics.map((t) => [t.id, t]))

  return (
    <Reorder.Group
      as="div"
      axis="y"
      values={ids}
      onReorder={(next) => {
        setIds(next)
        reorderTopics(next)
      }}
    >
      {ids.map((id) => {
        const topic = byId.get(id)
        if (!topic) return null
        return (
          <ArchivedTopicRow
            key={id}
            topic={topic}
            selectMode={selectMode}
            selected={selectedIds.has(id)}
            onToggleSelect={() => onToggleSelect(id)}
            onOpen={() => onOpenTopic(id)}
            onMenu={() => onTopicMenu(topic)}
          />
        )
      })}
    </Reorder.Group>
  )
}

function ArchivedGroupRow({
  group,
  selectMode,
  selected,
  onToggleSelect,
  onMenu,
}: {
  group: Group
  selectMode: boolean
  selected: boolean
  onToggleSelect: () => void
  onMenu: () => void
}) {
  const controls = useDragControls()
  return (
    <Reorder.Item
      value={group.id}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-1 rounded-2xl pr-1 active:bg-secondary"
    >
      {selectMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/30 bg-transparent"
          )}
        >
          {selected && <Check size={14} />}
        </button>
      )}
      <button
        onClick={() => {
          if (selectMode) onToggleSelect()
          else onMenu()
        }}
        className="no-tap-highlight flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 text-left"
      >
        <TopicAvatar icon={group.icon} color={group.color} size="sm" />
        <div className="min-w-0 flex-1">
          <span className="truncate text-[15px] font-semibold">{group.title}</span>
          <p className="text-sm text-muted-foreground">Grupo arquivado</p>
        </div>
      </button>
      {!selectMode && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            onPointerDown={(e) => controls.start(e)}
            aria-label={`Reordenar ${group.title}`}
            className="no-tap-highlight flex h-9 w-7 cursor-grab touch-none items-center justify-center text-muted-foreground/60 active:cursor-grabbing"
          >
            <GripVertical size={18} />
          </button>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => archiveGroup(group.id, false)}
            aria-label="Desarquivar"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground active:bg-secondary"
          >
            <ArchiveRestore size={18} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => deleteGroupAndContents(group.id)}
            aria-label="Excluir definitivamente"
            className="flex h-9 w-9 items-center justify-center rounded-full text-destructive active:bg-secondary"
          >
            <Trash2 size={18} />
          </motion.button>
        </div>
      )}
    </Reorder.Item>
  )
}

function ArchivedTopicRow({
  topic,
  selectMode,
  selected,
  onToggleSelect,
  onOpen,
  onMenu,
}: {
  topic: TopicWithMeta
  selectMode: boolean
  selected: boolean
  onToggleSelect: () => void
  onOpen: () => void
  onMenu: () => void
}) {
  const controls = useDragControls()
  return (
    <Reorder.Item
      value={topic.id}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-1 rounded-2xl pr-1 active:bg-secondary"
    >
      {selectMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/30 bg-transparent"
          )}
        >
          {selected && <Check size={14} />}
        </button>
      )}
      <button
        onClick={() => {
          if (selectMode) onToggleSelect()
          else onOpen()
        }}
        className="no-tap-highlight flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 text-left"
      >
        <TopicAvatar icon={topic.icon} color={topic.color} size="sm" />
        <div className="min-w-0 flex-1">
          <span className="truncate text-[15px] font-semibold">{topic.title}</span>
          <p className="truncate text-sm text-muted-foreground">{topic.lastNotePreview}</p>
        </div>
      </button>
      {!selectMode && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            onPointerDown={(e) => controls.start(e)}
            aria-label={`Reordenar ${topic.title}`}
            className="no-tap-highlight flex h-9 w-7 cursor-grab touch-none items-center justify-center text-muted-foreground/60 active:cursor-grabbing"
          >
            <GripVertical size={18} />
          </button>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => archiveTopic(topic.id, false)}
            aria-label="Desarquivar"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground active:bg-secondary"
          >
            <ArchiveRestore size={18} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => deleteTopic(topic.id)}
            aria-label="Excluir definitivamente"
            className="flex h-9 w-9 items-center justify-center rounded-full text-destructive active:bg-secondary"
          >
            <Trash2 size={18} />
          </motion.button>
        </div>
      )}
    </Reorder.Item>
  )
}

/* ------------------------------ Grupo ------------------------------ */

function GroupBlock({
  group,
  index,
  open,
  onToggle,
  onOpenTopic,
  onGroupMenu,
  onTopicMenu,
  selectMode,
  selected,
  onToggleSelect,
  onEnterSelectMode,
}: {
  group: GroupWithTopics
  index: number
  open: boolean
  onToggle: () => void
  onOpenTopic: (id: string) => void
  onGroupMenu: () => void
  onTopicMenu: (t: TopicWithMeta) => void
  selectMode: boolean
  selected: boolean
  onToggleSelect: () => void
  onEnterSelectMode?: () => void
}) {
  const controls = useDragControls()
  const longPress = useLongPress({
    onLongPress: () => {
      if (!selectMode && onEnterSelectMode) {
        onEnterSelectMode()
        onToggleSelect()
      }
    },
    onClick: onToggle,
  })

  return (
    <Reorder.Item
      value={group.id}
      dragListener={false}
      dragControls={controls}
      className="mb-1"
    >
      <div className="flex items-center gap-1 rounded-2xl pr-1 transition-colors active:bg-secondary">
        {selectMode && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/30 bg-transparent"
            )}
          >
            {selected && <Check size={14} />}
          </button>
        )}
        <button
          {...longPress}
          className="no-tap-highlight flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 text-left"
        >
          <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.18 }} className="text-muted-foreground">
            <ChevronRight size={18} />
          </motion.span>
          <TopicAvatar icon={group.icon} color={group.color} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="flex items-center gap-1.5 truncate">
                {group.favorite && <Heart size={12} className="shrink-0 fill-current text-rose-500" />}
                <span className="truncate text-[15px] font-semibold">{group.title}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatListTime(group.lastActivityAt)}
              </span>
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {group.topicCount === 0
                ? "Grupo vazio"
                : `${group.topicCount} ${group.topicCount === 1 ? "tópico" : "tópicos"}`}
            </p>
          </div>
        </button>
        {!selectMode && (
          <button
            onPointerDown={(e) => controls.start(e)}
            aria-label={`Reordenar ${group.title}`}
            className="no-tap-highlight flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground/60 active:cursor-grabbing"
          >
            <GripVertical size={18} />
          </button>
        )}
        {!selectMode && <MenuButton onClick={onGroupMenu} label={`Opções do grupo ${group.title}`} />}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden pl-6"
          >
            {group.topics.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum tópico neste grupo.</p>
            ) : (
              <SortableTopicList
                topics={group.topics}
                nested
                onOpenTopic={onOpenTopic}
                onTopicMenu={onTopicMenu}
                selectMode={selectMode}
                selectedIds={new Set()}
                onToggleSelect={() => {}}
                onEnterSelectMode={onEnterSelectMode}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  )
}

/* ----------------------- Lista de grupos arrastavel ----------------------- */

function SortableGroupList({
  groups,
  expanded,
  onToggleExpand,
  onOpenTopic,
  onGroupMenu,
  onTopicMenu,
  selectMode,
  selectedIds,
  onToggleSelect,
  onEnterSelectMode,
}: {
  groups: GroupWithTopics[]
  expanded: Set<string>
  onToggleExpand: (id: string) => void
  onOpenTopic: (id: string) => void
  onGroupMenu: (g: GroupWithTopics) => void
  onTopicMenu: (t: TopicWithMeta) => void
  selectMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onEnterSelectMode: () => void
}) {
  const [ids, setIds] = useState<string[]>(() => groups.map((g) => g.id))

  useEffect(() => {
    const incoming = groups.map((g) => g.id)
    setIds((prev) =>
      prev.length === incoming.length && prev.every((id, i) => id === incoming[i])
        ? prev
        : incoming,
    )
  }, [groups])

  const byId = new Map(groups.map((g) => [g.id, g]))

  return (
    <Reorder.Group
      as="div"
      axis="y"
      values={ids}
      onReorder={(next) => {
        setIds(next)
        reorderGroups(next)
      }}
    >
      {ids.map((id, i) => {
        const group = byId.get(id)
        if (!group) return null
        return (
          <GroupBlock
            key={id}
            group={group}
            index={i}
            open={expanded.has(group.id)}
            onToggle={() => onToggleExpand(group.id)}
            onOpenTopic={onOpenTopic}
            onGroupMenu={() => onGroupMenu(group)}
            onTopicMenu={onTopicMenu}
            selectMode={selectMode}
            selected={selectedIds.has(group.id)}
            onToggleSelect={() => onToggleSelect(group.id)}
            onEnterSelectMode={onEnterSelectMode}
          />
        )
      })}
    </Reorder.Group>
  )
}

/* ------------------------------ Tópico ------------------------------ */

function TopicRow({
  topic,
  index,
  onClick,
  onMenu,
  nested,
  selectMode,
  selected,
  onEnterSelectMode,
}: {
  topic: TopicWithMeta
  index: number
  onClick: () => void
  onMenu: () => void
  nested?: boolean
  selectMode: boolean
  selected: boolean
  onEnterSelectMode?: () => void
}) {
  const longPress = useLongPress({
    onLongPress: () => {
      if (!selectMode && onEnterSelectMode) {
        onEnterSelectMode()
        onClick()
      }
    },
    onClick,
  })

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.2) }}
      className="rounded-2xl"
    >
      <div className="flex items-center gap-1 rounded-2xl bg-background pr-1 transition-colors active:bg-secondary">
        {selectMode && (
          <button
            onClick={(e) => { e.stopPropagation(); onClick() }}
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/30 bg-transparent"
            )}
          >
            {selected && <Check size={14} />}
          </button>
        )}
        <button
          {...longPress}
          className="no-tap-highlight flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 text-left"
        >
          <TopicAvatar icon={topic.icon} color={topic.color} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                {topic.pinned && <Pin size={13} className="shrink-0 fill-current text-primary" />}
                {topic.favorite && <Heart size={12} className="shrink-0 fill-current text-rose-500" />}
                <span className="truncate text-[15px] font-semibold">{topic.title}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatListTime(topic.lastNoteAt)}
              </span>
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{topic.lastNotePreview}</p>
          </div>
        </button>
        {!selectMode && <MenuButton onClick={onMenu} label={`Opções do tópico ${topic.title}`} />}
      </div>
    </motion.li>
  )
}

/* ----------------------- Lista arrastavel ----------------------- */

function SortableTopicList({
  topics,
  onOpenTopic,
  onTopicMenu,
  nested,
  selectMode,
  selectedIds,
  onToggleSelect,
  onEnterSelectMode,
}: {
  topics: TopicWithMeta[]
  onOpenTopic: (id: string) => void
  onTopicMenu: (t: TopicWithMeta) => void
  nested?: boolean
  selectMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onEnterSelectMode?: () => void
}) {
  const [ids, setIds] = useState<string[]>(() => topics.map((t) => t.id))

  useEffect(() => {
    const incoming = topics.map((t) => t.id)
    setIds((prev) =>
      prev.length === incoming.length && prev.every((id, i) => id === incoming[i])
        ? prev
        : incoming,
    )
  }, [topics])

  const byId = new Map(topics.map((t) => [t.id, t]))

  return (
    <Reorder.Group
      as="ul"
      axis="y"
      values={ids}
      onReorder={(next) => {
        setIds(next)
        reorderTopics(next)
      }}
    >
      {ids.map((id) => {
        const topic = byId.get(id)
        if (!topic) return null
        return (
          <SortableTopicRow
            key={id}
            topic={topic}
            nested={nested}
            onClick={() => onOpenTopic(id)}
            onMenu={() => onTopicMenu(topic)}
            selectMode={selectMode}
            selected={selectedIds.has(id)}
            onToggleSelect={() => onToggleSelect(id)}
            onEnterSelectMode={onEnterSelectMode}
          />
        )
      })}
    </Reorder.Group>
  )
}

function SortableTopicRow({
  topic,
  onClick,
  onMenu,
  nested,
  selectMode,
  selected,
  onToggleSelect,
  onEnterSelectMode,
}: {
  topic: TopicWithMeta
  onClick: () => void
  onMenu: () => void
  nested?: boolean
  selectMode: boolean
  selected: boolean
  onToggleSelect: () => void
  onEnterSelectMode?: () => void
}) {
  const controls = useDragControls()

  const longPress = useLongPress({
    onLongPress: () => {
      if (!selectMode && onEnterSelectMode) {
        onEnterSelectMode()
        onToggleSelect()
      }
    },
    onClick: () => {
      if (selectMode) onToggleSelect()
      else onClick()
    },
  })

  return (
    <Reorder.Item
      value={topic.id}
      dragListener={false}
      dragControls={controls}
      className="rounded-2xl"
    >
      <div className="flex items-center gap-1 rounded-2xl bg-background pr-1 transition-colors active:bg-secondary">
        {selectMode && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/30 bg-transparent"
            )}
          >
            {selected && <Check size={14} />}
          </button>
        )}
        <button
          {...longPress}
          className="no-tap-highlight flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 text-left"
        >
          <TopicAvatar icon={topic.icon} color={topic.color} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                {topic.pinned && <Pin size={13} className="shrink-0 fill-current text-primary" />}
                {topic.favorite && <Heart size={12} className="shrink-0 fill-current text-rose-500" />}
                <span className="truncate text-[15px] font-semibold">{topic.title}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatListTime(topic.lastNoteAt)}
              </span>
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{topic.lastNotePreview}</p>
          </div>
        </button>
        {!selectMode && (
          <button
            onPointerDown={(e) => controls.start(e)}
            aria-label={`Reordenar ${topic.title}`}
            className="no-tap-highlight flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground/60 active:cursor-grabbing"
          >
            <GripVertical size={18} />
          </button>
        )}
        {!selectMode && <MenuButton onClick={onMenu} label={`Opções do tópico ${topic.title}`} />}
      </div>
    </Reorder.Item>
  )
}

function MenuButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="no-tap-highlight flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-foreground/10"
    >
      <DotsIcon />
    </button>
  )
}

function DotsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )
}

function CreateAction({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors active:bg-secondary"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  )
}

/* ----------------------- Form rapido de grupo ----------------------- */

function QuickGroupForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (title: string, icon: string, color: string) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState("")
  const [icon, setIcon] = useState("folder")
  const [color, setColor] = useState("blue")

  return (
    <div className="px-4 pb-4 space-y-4">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nome do grupo"
        className="h-11 rounded-xl"
        autoFocus
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSubmit(title, icon, color)}
          className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground"
        >
          Criar grupo
        </button>
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl bg-muted py-3 text-sm font-medium text-foreground"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-accent text-accent-foreground">
        <NotebookPen size={36} />
      </div>
      <h2 className="text-lg font-semibold">Comece a organizar suas notas</h2>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground text-pretty">
        Crie tópicos como conversas, agrupe-os e adicione notas como mensagens.
      </p>
      <button
        onClick={onCreate}
        className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        Criar primeiro tópico
      </button>
    </div>
  )
}

function NoResults() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <h2 className="text-lg font-semibold">Nenhum tópico encontrado</h2>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground text-pretty">
        Tente buscar por outro termo.
      </p>
    </div>
  )
}
