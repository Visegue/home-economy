import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { ActionIconButton } from "./action-icon-button";
import { AddCardButton } from "./add-card-button";
import { TooltipProvider } from "./tooltip";

afterEach(cleanup);

it("keeps safe wrapper defaults and forwards intentional submit/reset types", () => {
  render(
    <TooltipProvider>
      <ActionIconButton label="Avbryt">X</ActionIconButton>
      <ActionIconButton label="Stäng" type={undefined}>
        X
      </ActionIconButton>
      <ActionIconButton label="Spara" type="submit">
        S
      </ActionIconButton>
      <ActionIconButton label="Återställ" type="reset">
        R
      </ActionIconButton>
      <AddCardButton label="Lägg till" />
    </TooltipProvider>,
  );
  expect(screen.getByRole("button", { name: "Avbryt" })).toHaveAttribute(
    "type",
    "button",
  );
  expect(screen.getByRole("button", { name: "Stäng" })).toHaveAttribute(
    "type",
    "button",
  );
  expect(screen.getByRole("button", { name: "Spara" })).toHaveAttribute(
    "type",
    "submit",
  );
  expect(screen.getByRole("button", { name: "Återställ" })).toHaveAttribute(
    "type",
    "reset",
  );
  expect(screen.getByRole("button", { name: "Lägg till" })).toHaveAttribute(
    "type",
    "button",
  );
});
