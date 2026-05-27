"use client";

export const APP_THEME_STORAGE_KEY = "app-theme";
export const APP_THEME_EVENT = "app-theme-changed";
export const DEFAULT_APP_THEME = "default";

export type ThemeVariableMap = Record<string, string>;

export interface StoredAppTheme {
  slug: string;
  title_en: string;
  title_vi: string;
  preview_color: string | null;
  light_variables: ThemeVariableMap;
  dark_variables: ThemeVariableMap;
}

const MANAGED_THEME_VARIABLES = [
  "--bg-primary",
  "--bg-secondary",
  "--text-primary",
  "--text-secondary",
  "--accent",
  "--border",
  "--pill-badge-bg",
  "--pill-badge-border",
  "--pill-badge-text",
  "--pill-badge-highlight",
  "--scrollbar-track",
  "--scrollbar-thumb",
  "--scrollbar-thumb-hover",
] as const;

const getActiveMode = () => {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
};

const getThemeVariablesForMode = (theme: StoredAppTheme) => {
  return getActiveMode() === "dark" ? theme.dark_variables : theme.light_variables;
};

const clearManagedVariables = () => {
  if (typeof document === "undefined") return;

  for (const variableName of MANAGED_THEME_VARIABLES) {
    document.documentElement.style.removeProperty(variableName);
  }
};

export const getStoredAppTheme = (): StoredAppTheme | null => {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(APP_THEME_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredAppTheme;
  } catch {
    localStorage.removeItem(APP_THEME_STORAGE_KEY);
    return null;
  }
};

export const applyStoredTheme = (theme: StoredAppTheme | null) => {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  clearManagedVariables();

  if (!theme || !theme.slug || theme.slug === DEFAULT_APP_THEME) {
    document.documentElement.setAttribute("data-app-theme", DEFAULT_APP_THEME);
    localStorage.removeItem(APP_THEME_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(APP_THEME_EVENT, { detail: { theme: null } }));
    return;
  }

  const variables = getThemeVariablesForMode(theme);
  for (const [variableName, variableValue] of Object.entries(variables)) {
    document.documentElement.style.setProperty(variableName, variableValue);
  }

  document.documentElement.setAttribute("data-app-theme", theme.slug);
  localStorage.setItem(APP_THEME_STORAGE_KEY, JSON.stringify(theme));
  window.dispatchEvent(new CustomEvent(APP_THEME_EVENT, { detail: { theme } }));
};

export const reapplyStoredTheme = () => {
  applyStoredTheme(getStoredAppTheme());
};

