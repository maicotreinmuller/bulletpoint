import {
  ShoppingCart,
  Lightbulb,
  ListTodo,
  Briefcase,
  Heart,
  Plane,
  BookOpen,
  Dumbbell,
  Home,
  Wallet,
  Utensils,
  Music,
  Code,
  Gift,
  Star,
  Notebook,
  FolderClosed,
  GraduationCap,
  Camera,
  Coffee,
  PawPrint,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

/** Catálogo de ícones selecionáveis para tópicos e grupos. */
export const ICONS: Record<string, LucideIcon> = {
  notebook: Notebook,
  folder: FolderClosed,
  cart: ShoppingCart,
  idea: Lightbulb,
  todo: ListTodo,
  work: Briefcase,
  heart: Heart,
  travel: Plane,
  book: BookOpen,
  study: GraduationCap,
  fitness: Dumbbell,
  home: Home,
  money: Wallet,
  food: Utensils,
  coffee: Coffee,
  music: Music,
  code: Code,
  camera: Camera,
  pet: PawPrint,
  gift: Gift,
  star: Star,
  sparkles: Sparkles,
}

export const ICON_KEYS = Object.keys(ICONS)

/** Resolve um ícone com fallback seguro. */
export function getIcon(key: string): LucideIcon {
  return ICONS[key] ?? ICONS.notebook
}

/**
 * Catálogo de cores de avatar (mapeadas para classes Tailwind via tokens).
 * Mantém o app dentro de uma paleta coesa.
 */
export const COLORS: Record<string, { bg: string; fg: string }> = {
  blue: { bg: "bg-[oklch(0.56_0.15_252)]", fg: "text-white" },
  indigo: { bg: "bg-[oklch(0.50_0.18_275)]", fg: "text-white" },
  purple: { bg: "bg-[oklch(0.55_0.20_305)]", fg: "text-white" },
  pink: { bg: "bg-[oklch(0.64_0.19_350)]", fg: "text-white" },
  rose: { bg: "bg-[oklch(0.62_0.20_18)]", fg: "text-white" },
  red: { bg: "bg-[oklch(0.57_0.21_27)]", fg: "text-white" },
  orange: { bg: "bg-[oklch(0.70_0.16_55)]", fg: "text-white" },
  amber: { bg: "bg-[oklch(0.80_0.15_85)]", fg: "text-[oklch(0.25_0.03_85)]" },
  lime: { bg: "bg-[oklch(0.82_0.18_130)]", fg: "text-[oklch(0.25_0.05_130)]" },
  green: { bg: "bg-[oklch(0.70_0.13_160)]", fg: "text-white" },
  teal: { bg: "bg-[oklch(0.65_0.13_195)]", fg: "text-white" },
  cyan: { bg: "bg-[oklch(0.74_0.12_220)]", fg: "text-[oklch(0.25_0.04_220)]" },
}

export const COLOR_KEYS = Object.keys(COLORS)

export function getColor(key: string) {
  return COLORS[key] ?? COLORS.blue
}
