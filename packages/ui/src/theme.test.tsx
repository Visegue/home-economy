import {
  cleanup,
  fireEvent,
  render,
  screen,
  act,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ThemePicker, ThemeProvider } from "./theme";

let dark = false;
const changes = new Set<() => void>();

beforeEach(() => {
  dark = false;
  changes.clear();
  localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("data-theme-preference");
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return dark;
      },
      addEventListener: (_: string, callback: () => void) =>
        changes.add(callback),
      removeEventListener: (_: string, callback: () => void) =>
        changes.delete(callback),
    })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mount() {
  return render(
    <ThemeProvider>
      <ThemePicker />
    </ThemeProvider>,
  );
}

it("defaults to System and follows OS changes during the session", () => {
  mount();
  expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
  expect(document.documentElement).not.toHaveClass("dark");
  act(() => {
    dark = true;
    changes.forEach((callback) => callback());
  });
  expect(document.documentElement).toHaveClass("dark");
  expect(document.documentElement.style.colorScheme).toBe("dark");
});

it("persists explicit choices and restores them on remount ahead of OS", () => {
  const view = mount();
  fireEvent.click(screen.getByRole("radio", { name: "Mörkt" }));
  expect(document.documentElement).toHaveClass("dark");
  view.unmount();
  mount();
  expect(screen.getByRole("radio", { name: "Mörkt" })).toBeChecked();
  act(() => {
    dark = false;
    changes.forEach((callback) => callback());
  });
  expect(document.documentElement).toHaveClass("dark");
  fireEvent.click(screen.getByRole("radio", { name: "Ljust" }));
  act(() => {
    dark = true;
    changes.forEach((callback) => callback());
  });
  expect(document.documentElement).not.toHaveClass("dark");
  fireEvent.click(screen.getByRole("radio", { name: "System" }));
  expect(document.documentElement).toHaveClass("dark");
});

it("falls back to System for unavailable storage without blocking choices", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("Denied");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Denied");
  });
  dark = true;
  mount();
  expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
  expect(document.documentElement).toHaveClass("dark");
  fireEvent.click(screen.getByRole("radio", { name: "Ljust" }));
  expect(document.documentElement).not.toHaveClass("dark");
});
