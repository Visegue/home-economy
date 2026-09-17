import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { DeploymentInfo } from "./deployment-info";

afterEach(cleanup);

describe("DeploymentInfo", () => {
  it("keeps release details tucked behind a small version line", async () => {
    const user = userEvent.setup();
    const commit = "a".repeat(40);
    render(
      <DeploymentInfo
        deployment={{ kind: "production", version: "0.3.1", commit }}
      />,
    );

    const version = screen.getByText("Version 0.3.1");
    expect(version.closest("details")).not.toHaveAttribute("open");
    expect(screen.queryByRole("heading", { name: "Om appen" })).toBeNull();

    await user.click(version);
    expect(version.closest("details")).toHaveAttribute("open");
    expect(screen.getByText(`Revision: ${commit}`)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Se publicerade releaser på GitHub" }),
    ).toHaveAttribute(
      "href",
      "https://github.com/Visegue/home-economy/releases",
    );
  });

  it("shows the same compact layout with correct preview metadata", async () => {
    const user = userEvent.setup();
    const commit = "b".repeat(40);
    render(
      <DeploymentInfo
        deployment={{ kind: "preview", branch: "codex/test", commit }}
      />,
    );

    const version = screen.getByText("Förhandsversion bbbbbbb");
    expect(version.closest("details")).not.toHaveAttribute("open");
    expect(screen.queryByText(/^Version /)).toBeNull();

    await user.click(version);
    expect(version.closest("details")).toHaveAttribute("open");
    expect(screen.getByText("Gren: codex/test")).toBeVisible();
    expect(screen.getByText(`Revision: ${commit}`)).toBeVisible();
  });
});
