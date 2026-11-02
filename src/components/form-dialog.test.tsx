import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { FormDialog, useFormGuard } from "./form-dialog";
import { FormDialogContent } from "./form-dialog-content";

function Draft({ pending }: { pending: boolean }) {
  const [name, setName] = useState("");
  useFormGuard({ name }, pending);
  return (
    <label>
      Namn
      <input value={name} onChange={(event) => setName(event.target.value)} />
    </label>
  );
}

function Editor({ pending = false }: { pending?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <FormDialog open={open} onOpenChange={setOpen}>
      <FormDialogContent title="Redigera">
        <Draft pending={pending} />
      </FormDialogContent>
    </FormDialog>
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderEditor(pending = false) {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  return render(<Editor pending={pending} />);
}

it("keeps the draft and returns focus when Escape or continue dismisses the discard prompt", async () => {
  const user = userEvent.setup();
  renderEditor();
  const name = screen.getByLabelText("Namn");
  await user.type(name, "Utkast");
  for (const choice of ["Escape", "Fortsätt redigera"]) {
    await user.keyboard("{Escape}");
    expect(screen.getByRole("alertdialog")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Fortsätt redigera" }),
    ).toHaveFocus();
    if (choice === "Escape") await user.keyboard("{Escape}");
    else await user.keyboard("{Enter}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(name).toHaveValue("Utkast");
    expect(name).toHaveFocus();
  }
  await user.keyboard("{Escape}");
  await user.click(screen.getByRole("button", { name: "Kasta ändringar" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("closes without a warning after the original field value is restored", async () => {
  const user = userEvent.setup();
  renderEditor();
  const name = screen.getByLabelText("Namn");
  await user.type(name, "Tillfälligt");
  await user.clear(name);
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("blocks closing during a pending save and permits it once the save settles", async () => {
  const user = userEvent.setup();
  const view = renderEditor(true);
  await user.click(screen.getByRole("button", { name: "Stäng" }));
  await user.keyboard("{Escape}");
  expect(screen.getByRole("dialog", { name: "Redigera" })).toBeVisible();
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  view.rerender(<Editor pending={false} />);
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
