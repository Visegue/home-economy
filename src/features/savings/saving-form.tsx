"use client";

import { useActionState, useId, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { incomeToInput } from "@/features/income/validation";
import {
  removeSavingAction,
  saveSavingAction,
  type SavingState,
} from "./actions";
import type { Saving } from "./validation";

function SavingForm({
  saving,
  onSaved,
}: {
  saving?: Saving;
  onSaved: () => void;
}) {
  const fieldId = useId();
  const [name, setName] = useState(saving?.name ?? "");
  const [amount, setAmount] = useState(
    incomeToInput(saving?.amountInOre ?? null),
  );
  const [state, action, pending] = useActionState(
    async (previous: SavingState, formData: FormData) => {
      const result = await saveSavingAction(saving?.id, previous, formData);
      if (result.success) onSaved();
      return result;
    },
    {},
  );

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-name`}>Typ av sparande (namn)</Label>
        <Input
          id={`${fieldId}-name`}
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Till exempel buffert eller semester"
          maxLength={160}
          required
          disabled={pending}
          aria-invalid={Boolean(state.nameError)}
          aria-describedby={
            state.nameError ? `${fieldId}-name-error` : undefined
          }
        />
        {state.nameError ? (
          <p
            id={`${fieldId}-name-error`}
            role="alert"
            className="text-sm text-destructive"
          >
            {state.nameError}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-amount`}>Belopp per månad (kr)</Label>
        <Input
          id={`${fieldId}-amount`}
          name="amount"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0,00"
          required
          disabled={pending}
          aria-invalid={Boolean(state.amountError)}
          aria-describedby={
            state.amountError ? `${fieldId}-amount-error` : undefined
          }
        />
        {state.amountError ? (
          <p
            id={`${fieldId}-amount-error`}
            role="alert"
            className="text-sm text-destructive"
          >
            {state.amountError}
          </p>
        ) : null}
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Sparar…" : "Spara sparande"}
      </Button>
    </form>
  );
}

export function SavingDialog({ saving }: { saving?: Saving }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={saving ? "ghost" : "default"}
          size="sm"
          aria-label={saving ? `Ändra ${saving.name}` : undefined}
        >
          {saving ? (
            "Ändra"
          ) : (
            <>
              <Plus aria-hidden="true" /> Lägg till sparande
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {saving ? "Ändra sparande" : "Lägg till sparande"}
          </DialogTitle>
          <DialogDescription>
            Beloppet ingår i överföringen till sparande varje månad tills du
            ändrar eller tar bort sparandet.
          </DialogDescription>
        </DialogHeader>
        <SavingForm saving={saving} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function RemoveSavingButton({ saving }: { saving: Saving }) {
  const [state, action, pending] = useActionState(
    removeSavingAction.bind(null, saving.id),
    {},
  );
  return (
    <form action={action}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={pending}
        aria-label={`Ta bort ${saving.name}`}
      >
        {pending ? "Tar bort…" : "Ta bort"}
      </Button>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
