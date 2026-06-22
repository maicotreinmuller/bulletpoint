"use client"

import { useSyncExternalStore } from "react"

interface Settings {
  theme: "light" | "dark" | "system"
  accentColor: string
}

const DEFAULTS: Settings = {
  theme: "system",
  accentColor: "#3b82f6",
}

const STORAGE_KEY = "bullet-point-settings"

function load(): Settings {
  if (typeof window === "undefined") return DEFAULTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<Settings>
    return { ...DEFAULTS, ...parsed }
  } catch {
    return DEFAULTS
  }
}

let state: Settings = load()
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }
}

export function getSettings(): Settings {
  return state
}

export function setTheme(theme: Settings["theme"]) {
  state = { ...state, theme }
  applyTheme()
  persist()
  emit()
}

export function setAccentColor(color: string) {
  state = { ...state, accentColor: color }
  applyAccent()
  persist()
  emit()
}

function applyAccent() {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.style.setProperty("--primary", state.accentColor)
}

export function applyTheme() {
  if (typeof document === "undefined") return
  const root = document.documentElement
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
  const isDark = state.theme === "dark" || (state.theme === "system" && prefersDark)
  root.classList.toggle("dark", isDark)
  root.classList.toggle("light", state.theme === "light")
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
    () => DEFAULTS,
  )
}

// Aplica tema e cor de destaque no carregamento inicial
if (typeof window !== "undefined") {
  applyTheme()
  applyAccent()
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme)
}
