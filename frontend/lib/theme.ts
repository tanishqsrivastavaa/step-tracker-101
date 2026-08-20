// Theme registry + persistence. The actual colors live in globals.css under
// [data-theme="…"]; here we just track which one is active and remember it.
//
// The swatch color is only for the picker UI — it mirrors each theme's accent.

export type ThemeId = "midnight" | "neon" | "volt" | "sunset" | "crimson";

export interface Theme {
  id: ThemeId;
  label: string;
  swatch: string; // accent, for the picker dot
  swatch2: string; // second gradient stop
}

export const THEMES: Theme[] = [
  { id: "midnight", label: "Midnight", swatch: "#5b8cff", swatch2: "#a855f7" },
  { id: "neon", label: "Neon", swatch: "#ff2d95", swatch2: "#00e5ff" },
  { id: "volt", label: "Volt", swatch: "#b6ff00", swatch2: "#00ff9d" },
  { id: "sunset", label: "Sunset", swatch: "#ff6a2b", swatch2: "#ffb800" },
  { id: "crimson", label: "Crimson", swatch: "#ff1f4b", swatch2: "#ff5e7a" },
];

export const DEFAULT_THEME: ThemeId = "midnight";
const KEY = "steps.theme";

export function getTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const v = window.localStorage.getItem(KEY) as ThemeId | null;
  return v && THEMES.some((t) => t.id === v) ? v : DEFAULT_THEME;
}

export function applyTheme(id: ThemeId): void {
  document.documentElement.setAttribute("data-theme", id);
  window.localStorage.setItem(KEY, id);
}
