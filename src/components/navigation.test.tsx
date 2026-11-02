import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useLayoutEffect, type ReactNode } from "react";
const mocks = vi.hoisted(() => ({
  push: vi.fn<() => void>(),
  replace: vi.fn<() => void>(),
  refresh: vi.fn<() => void>(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams("month=2026-10"),
  useRouter: () => mocks,
}));
import {
  NavigationPage,
  NavigationProvider,
  NavigationStatus,
  useNavigation,
} from "./navigation";
let current: ReturnType<typeof useNavigation>;
function Page({ month, children }: { month: string; children: ReactNode }) {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    current = navigation;
  });
  return (
    <>
      <NavigationStatus month />
      <NavigationPage pathname="/" month={month}>
        {children}
      </NavigationPage>
    </>
  );
}
const tree = (month: string, children: ReactNode) => (
  <NavigationProvider>
    <Page month={month}>{children}</Page>
  </NavigationProvider>
);
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("retains the confirmed page and ignores an obsolete response and error", () => {
  const view = render(tree("2026-10", <p>Octobers data</p>));
  act(() => current.navigate("/?month=2026-11"));
  act(() => current.navigate("/?month=2026-12"));
  view.rerender(tree("2026-11", <p>Novembers obsolete data</p>));
  expect(screen.getByText("Octobers data")).toBeInTheDocument();
  expect(current.pending).toBe(true);
  expect(current.confirmed.month).toBe("2026-10");
  act(() => current.fail("/?month=2026-11", vi.fn<() => void>()));
  expect(current.failure).toBeNull();
  expect(current.pending).toBe(true);
  view.rerender(tree("2026-12", <p>Decembers data</p>));
  expect(screen.getByText("Decembers data")).toBeInTheDocument();
  expect(current.confirmed.month).toBe("2026-12");
  expect(current.pending).toBe(false);
  act(() => current.fail("/?month=2026-11", vi.fn<() => void>()));
  expect(current.failure).toBeNull();
});
it("restores the useful page and URL on error, retains the error during refresh, and retries only a read", () => {
  const view = render(tree("2026-10", <p>Current data</p>));
  act(() => current.navigate("/?month=2026-11"));
  const recover = vi.fn<() => void>();
  act(() => current.fail("/?month=2026-11", recover));
  expect(current.pending).toBe(false);
  expect(current.failure?.target.month).toBe("2026-11");
  expect(mocks.replace).toHaveBeenCalledWith("/?month=2026-10", {
    scroll: false,
  });
  view.rerender(tree("2026-10", <p>Updated confirmed data</p>));
  expect(screen.getByText("Updated confirmed data")).toBeInTheDocument();
  expect(current.failure?.target.month).toBe("2026-11");
  act(() => current.retry());
  expect(mocks.push).toHaveBeenLastCalledWith("/?month=2026-11", {
    scroll: false,
  });
  expect(recover).toHaveBeenCalledTimes(2);
  expect(current.pending).toBe(true);
  view.rerender(tree("2026-11", <p>Retried data</p>));
  expect(current.failure).toBeNull();
  expect(current.confirmed.month).toBe("2026-11");
});
it("gives a persistent offline error without sending a request and clears it on a different intent", () => {
  render(tree("2026-10", <p>Current data</p>));
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  act(() => current.navigate("/?month=2026-11"));
  expect(mocks.push).not.toHaveBeenCalled();
  expect(current.pending).toBe(false);
  expect(screen.getByText(/kunde inte laddas/)).toBeInTheDocument();
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  act(() => current.navigate("/?month=2026-12"));
  expect(current.failure).toBeNull();
  expect(current.intent?.month).toBe("2026-12");
});

it("clears a failed target when the confirmed destination is chosen without another request", () => {
  render(tree("2026-10", <p>Current data</p>));
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  act(() => current.navigate("/?month=2026-11"));
  expect(current.failure).not.toBeNull();
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  act(() => current.navigate("/?month=2026-10"));
  expect(current.failure).toBeNull();
  expect(current.pending).toBe(false);
  expect(mocks.push).not.toHaveBeenCalled();
});
