import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigationMocks = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMocks.pathname,
}));

import { AppShell } from "./app-shell";

beforeEach(() => {
  navigationMocks.pathname = "/";
});

afterEach(cleanup);

describe("AppShell", () => {
  it("visar alla vyer i navigeringen", () => {
    render(
      <AppShell householdName="Testhushållet" userName="Ada">
        <p>Sidinnehåll</p>
      </AppShell>,
    );

    const desktopNavigation = screen.getByRole("navigation", {
      name: "Huvudmeny",
    });

    expect(
      within(desktopNavigation).getByRole("link", { name: "Månaden" }),
    ).toHaveAttribute("href", "/");
    expect(
      within(desktopNavigation).getByRole("link", { name: "Lönekoll" }),
    ).toHaveAttribute("href", "/salary");
    expect(
      within(desktopNavigation).getByRole("link", {
        name: "Investeringar",
      }),
    ).toHaveAttribute("href", "/investments");
    expect(
      within(desktopNavigation).getByRole("link", { name: "Balans" }),
    ).toHaveAttribute("href", "/balance");
    expect(
      within(screen.getByRole("navigation", { name: "Kontomeny" })).getByRole(
        "link",
        { name: "Inställningar" },
      ),
    ).toHaveAttribute("href", "/settings");
  });

  it("markerar den aktuella vyn och visar rätt rubrik", () => {
    navigationMocks.pathname = "/investments";

    render(
      <AppShell householdName="Testhushållet" userName="Ada">
        <p>Sidinnehåll</p>
      </AppShell>,
    );

    expect(
      screen.getByRole("heading", { name: "Investeringar" }),
    ).toBeInTheDocument();
    for (const link of screen.getAllByRole("link", {
      name: "Investeringar",
    })) {
      expect(link).toHaveAttribute("aria-current", "page");
    }
    expect(screen.getByText("Testhushållet")).toBeInTheDocument();
    expect(screen.getByText("Sidinnehåll")).toBeInTheDocument();
  });
});
