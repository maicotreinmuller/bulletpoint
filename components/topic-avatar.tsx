import { getColor, getIcon } from "@/lib/catalog"
import { cn } from "@/lib/utils"

interface Props {
  icon: string
  color: string
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZES = {
  sm: { box: "h-9 w-9", icon: 18 },
  md: { box: "h-12 w-12", icon: 22 },
  lg: { box: "h-16 w-16", icon: 30 },
}

/** Avatar circular do tópico, com ícone e cor personalizados. */
export function TopicAvatar({ icon, color, size = "md", className }: Props) {
  const Icon = getIcon(icon)
  const c = getColor(color)
  const s = SIZES[size]
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full shadow-sm",
        s.box,
        c.bg,
        c.fg,
        className,
      )}
      aria-hidden="true"
    >
      <Icon size={s.icon} strokeWidth={2.2} />
    </div>
  )
}
