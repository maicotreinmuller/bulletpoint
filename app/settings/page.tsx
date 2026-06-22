"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft, Moon, Sun, Monitor, Palette, Check } from "lucide-react"
import { useSettings, setTheme, setAccentColor } from "@/lib/settings"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const router = useRouter()
  const settings = useSettings()

  const themes: { key: typeof settings.theme; icon: React.ReactNode; label: string }[] = [
    { key: "light", icon: <Sun size={20} />, label: "Modo Claro" },
    { key: "dark", icon: <Moon size={20} />, label: "Modo Escuro" },
    { key: "system", icon: <Monitor size={20} />, label: "Sistema" },
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/90 px-2 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-md">
        <button
          onClick={() => router.push("/")}
          aria-label="Voltar"
          className="no-tap-highlight flex h-10 w-10 items-center justify-center rounded-full text-foreground active:bg-secondary"
        >
          <ChevronLeft size={26} />
        </button>
        <h1 className="text-base font-semibold">Configurações</h1>
      </header>

      <div className="mx-auto w-full max-w-md space-y-8 px-4 py-6">
        {/* Tema */}
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tema
          </h2>
          <div className="space-y-2">
            {themes.map((theme) => (
              <button
                key={theme.key}
                onClick={() => setTheme(theme.key)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-left transition-colors active:bg-secondary",
                  settings.theme === theme.key
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                <span className="text-muted-foreground">{theme.icon}</span>
                <span className="flex-1 text-[15px] font-medium">{theme.label}</span>
                {settings.theme === theme.key && <Check size={18} className="text-primary" />}
              </button>
            ))}
          </div>
        </section>

        {/* Tema personalizado */}
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tema personalizado
          </h2>
          <div className="rounded-2xl bg-muted p-4">
            <div className="flex items-center gap-3">
              <Palette size={20} className="text-muted-foreground" />
              <span className="flex-1 text-[15px] font-medium">Cor de destaque</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Escolha uma cor de destaque para personalizar a interface.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setAccentColor(c.value)}
                  className={cn(
                    "h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all",
                    settings.accentColor === c.value
                      ? "ring-primary"
                      : "ring-transparent hover:ring-muted-foreground/30"
                  )}
                  style={{ backgroundColor: c.value }}
                  aria-label={c.name}
                >
                  {settings.accentColor === c.value && (
                    <Check size={16} className="mx-auto text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

const COLOR_OPTIONS = [
  { name: "Azul", value: "#3b82f6" },
  { name: "Verde", value: "#22c55e" },
  { name: "Vermelho", value: "#ef4444" },
  { name: "Laranja", value: "#f97316" },
  { name: "Roxo", value: "#a855f7" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Turquesa", value: "#14b8a6" },
  { name: "Ciano", value: "#06b6d4" },
  { name: "Âmbar", value: "#f59e0b" },
  { name: "Ardósia", value: "#64748b" },
]
