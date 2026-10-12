"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { ChoiceInput } from "./choice";
import { themeStorageKey } from "./theme-script";

export type ThemePreference = "system" | "light" | "dark";
const themeEvent = "home-economy:theme";
const options = [
  { value: "system", label: "System" },
  { value: "light", label: "Ljust" },
  { value: "dark", label: "Mörkt" },
] as const;

function normalize(value: string | null | undefined): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}
function readSavedPreference(): ThemePreference {
  try {
    return normalize(localStorage.getItem(themeStorageKey));
  } catch {
    return "system";
  }
}
function currentPreference(): ThemePreference {
  return normalize(document.documentElement.dataset.themePreference);
}
function apply(preference: ThemePreference) {
  const root = document.documentElement;
  const dark =
    preference === "dark" ||
    (preference === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.setAttribute("data-theme-changing", "");
  root.classList.toggle("dark", dark);
  root.dataset.themePreference = preference;
  root.style.colorScheme = dark ? "dark" : "light";
  // Commit the new palette together, before restoring hover transitions.
  root.getBoundingClientRect();
  root.removeAttribute("data-theme-changing");
  document.dispatchEvent(new Event(themeEvent));
}
function subscribe(callback: () => void) {
  document.addEventListener(themeEvent, callback);
  return () => document.removeEventListener(themeEvent, callback);
}
function choose(preference: ThemePreference) {
  try {
    localStorage.setItem(themeStorageKey, preference);
  } catch {
    /* Keep the choice for this session if storage is unavailable. */
  }
  apply(preference);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    apply(readSavedPreference());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystem = () => apply(currentPreference());
    const updateStorage = (event: StorageEvent) => {
      if (event.key === themeStorageKey || event.key === null)
        apply(readSavedPreference());
    };
    media.addEventListener("change", updateSystem);
    window.addEventListener("storage", updateStorage);
    return () => {
      media.removeEventListener("change", updateSystem);
      window.removeEventListener("storage", updateStorage);
    };
  }, []);
  return children;
}

export function ThemePicker() {
  const preference = useSyncExternalStore(
    subscribe,
    currentPreference,
    () => "system" as const,
  );
  return (
    <fieldset className="space-y-3">
      <legend className="font-medium">Tema</legend>
      <div className="flex flex-wrap gap-3">
        {options.map(({ value, label }) => (
          <label
            key={value}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 has-checked:border-primary has-checked:bg-primary/10"
          >
            <ChoiceInput
              type="radio"
              name="theme"
              value={value}
              checked={preference === value}
              onChange={() => choose(value)}
            />
            {label}
          </label>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        System följer enhetens utseende. Valet sparas i den här webbläsaren och
        gäller även före inloggning.
      </p>
    </fieldset>
  );
}
