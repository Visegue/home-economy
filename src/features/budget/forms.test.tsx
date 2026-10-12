import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { FormDialog } from "@/components/form-dialog";
import { FormDialogContent } from "@/components/form-dialog-content";
import type { FormState } from "./actions";

type ServerAction = (state: FormState, data: FormData) => Promise<FormState>;
const actions = vi.hoisted(() => ({ remove: vi.fn<ServerAction>() }));
vi.mock("./actions", () => ({
  addExpenseAction: vi.fn<ServerAction>(),
  removeExpenseAction: actions.remove,
}));
import { RemoveExpenseForm } from "./forms";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("cancels a valid removal without submitting while the caller retains the dialog", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  actions.remove.mockResolvedValue({ success: "Avslutad." });
  const onCancel = vi.fn<() => void>();
  const onRemoved = vi.fn<() => void>();
  const user = userEvent.setup();
  render(
    <FormDialog open onOpenChange={() => {}}>
      <FormDialogContent title="Avsluta utgift">
        <RemoveExpenseForm
          expense={{
            id: 1,
            name: "Testutgift",
            amountInOre: 10000,
            unit: "month",
            every: 1,
            destination: "direct",
            startsOn: "2026-01-01",
            endsOn: null,
            nextDueOn: null,
            owners: [],
            revision: 1,
          }}
          period="2026-10"
          onCancel={onCancel}
          onRemoved={onRemoved}
        />
      </FormDialogContent>
    </FormDialog>,
  );
  await user.click(screen.getByRole("button", { name: "Avbryt" }));
  expect(onCancel).toHaveBeenCalledOnce();
  expect(actions.remove).not.toHaveBeenCalled();
  expect(onRemoved).not.toHaveBeenCalled();
});
