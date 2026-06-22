/**
 * i18n removido — aplicativo fixado em Português (Brasil).
 * Este arquivo existe apenas para manter compatibilidade de imports.
 */

export function t(key: string): string {
  return STRINGS[key] ?? key
}

export function useI18n() {
  return { lang: "pt" as const, t }
}

export function useLang() {
  return "pt" as const
}

export function setLang(_lang: "pt" | "en") {
  // no-op
}

export function getLang() {
  return "pt" as const
}

export function setLangI18n(_lang: "pt" | "en") {
  // no-op
}

const STRINGS: Record<string, string> = {
  appTitle: "Bullet Point",
  appDescription: "Organize sua rotina de forma facilitada.",
  myNotes: "Minhas notas",
  newTopic: "Novo tópico",
  newGroup: "Novo grupo",
  editTopic: "Editar tópico",
  editGroup: "Editar grupo",
  createTopic: "Criar tópico",
  createGroup: "Criar grupo",
  customizeTopic: "Personalizar tópico",
  customizeGroup: "Personalizar grupo",
  topic: "tópico",
  group: "grupo",
  topics: "tópicos",
  groups: "Grupos",
  notes: "notas",
  note: "nota",
  searchTopics: "Buscar tópicos",
  emptyGroup: "Grupo vazio",
  emptyStateTitle: "Comece a organizar suas notas",
  emptyStateDesc: "Crie tópicos como conversas, agrupe-os e adicione notas como mensagens.",
  createFirstTopic: "Criar primeiro tópico",
  noResults: "Nenhum tópico encontrado",
  tryAnotherTerm: "Tente buscar por outro termo.",
  archived: "Arquivados",
  nothingArchived: "Nada arquivado",
  archivedDesc: "Grupos e tópicos arquivados aparecem aqui. Você pode restaurá-los a qualquer momento.",
  ungroup: "Desagrupar",
  ungroupDesc: "Remove o grupo, mantendo os tópicos na lista principal",
  deleteGroup: "Excluir grupo",
  deleteGroupDesc: "Exclui o grupo e tudo o que estiver dentro de forma definitiva",
  delete: "Excluir",
  deleteTopic: "Excluir tópico",
  clearContent: "Limpar conteúdo",
  clearContentDesc: "Elimina todo o conteúdo do tópico, mantendo-o vazio",
  archive: "Arquivar",
  unarchive: "Desarquivar",
  pin: "Fixar no topo",
  unpin: "Desafixar do topo",
  addTopicToGroup: "Adicionar tópico ao grupo",
  edit: "Editar",
  select: "Selecionar",
  selectItems: "Selecionar itens",
  archiveSelected: "Arquivar selecionados",
  deleteSelected: "Excluir selecionados",
  cancel: "Cancelar",
  done: "Concluído",
  settings: "Configurações",
  theme: "Tema",
  darkMode: "Modo Escuro",
  lightMode: "Modo Claro",
  randomColors: "Cores Aleatórias",
  writeNote: "Escreva uma nota...",
  send: "Enviar",
  addList: "Adicionar lista",
  newList: "Nova lista",
  listTitle: "Título da lista",
  listTitlePlaceholder: "Ex: Compras da semana (opcional)",
  items: "Itens",
  addItem: "Adicionar item",
  createList: "Criar lista",
  continue: "Continuar",
  back: "Voltar",
  saveChanges: "Salvar alterações",
  noGroup: "Sem grupo",
  groupArchived: "Grupo arquivado",
  topicArchived: "Tópico arquivado",
  restore: "Restaurar",
  deletePermanently: "Excluir definitivamente",
  pinned: "Fixadas",
  today: "Hoje",
  yesterday: "Ontem",
  noNotesYet: "Nenhuma nota ainda. Escreva abaixo para adicionar a primeira.",
  convertToChecklist: "Transformar em checklist",
  convertToText: "Transformar em texto",
  copy: "Copiar",
  listActions: "Ações da lista",
  noteActions: "Ações da nota",
  progress: "progresso",
  completed: "concluído",
  of: "de",
  random: "Aleatório",
  color: "Cor",
  icon: "Ícone",
  systemMode: "Sistema",
  customTheme: "Tema personalizado",
  customThemeDesc: "Escolha uma cor de destaque para personalizar a interface.",
  all: "Todos",
  unarchiveSelected: "Desarquivar selecionados",
}
