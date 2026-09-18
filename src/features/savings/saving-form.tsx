"use client";

import { useActionState, useId, useState } from "react";
import { AddCardButton } from "@/components/add-card-button";
import { FormDialogContent } from "@/components/form-dialog-content";
import { InfoButton } from "@/components/info-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
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
  period,
}: {
  saving?: Saving;
  onSaved: () => void;
  period: string;
}) {
  const fieldId = useId();
  const [effectivePeriod, setEffectivePeriod] = useState(period);
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
        <Label htmlFor={`${fieldId}-period`}>
          {saving ? "Ändringen gäller från" : "Från och med"}
        </Label>
        <Input
          id={`${fieldId}-period`}
          name="period"
          type="month"
          required
          value={effectivePeriod}
          onChange={(event) => setEffectivePeriod(event.target.value)}
          min={saving?.startsOn ?? "1900-01"}
          max={saving?.endsOn ?? "2199-12"}
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-name`}>Namn på sparandet</Label>
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
        <div className="flex items-center gap-1">
          <Label htmlFor={`${fieldId}-amount`}>Belopp per månad (kr)</Label>
          <InfoButton title="Månadssparande">
            <p>
              Beloppet ingår i överföringen till sparande och dras från det du
              har kvar efter utgifter.
            </p>
            <p>
              Ändring och avslut gäller från vald månad. Tidigare månaders
              belopp behålls.
            </p>
          </InfoButton>
        </div>
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
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sparar…" : "Spara sparande"}
      </Button>
    </form>
  );
}

export function SavingDialog({
  saving,
  period,
}: {
  saving?: Saving;
  period: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {saving ? (
          <Button variant="ghost" size="sm" aria-label={`Ändra ${saving.name}`}>
            Ändra
          </Button>
        ) : (
          <AddCardButton label="Lägg till sparande" />
        )}
      </DialogTrigger>
      <FormDialogContent
        title={saving ? "Ändra sparande" : "Lägg till sparande"}
      >
        {open ? (
          <SavingForm
            saving={saving}
            period={period}
            onSaved={() => setOpen(false)}
          />
        ) : null}
      </FormDialogContent>
    </Dialog>
  );
}

export function RemoveSavingButton({
  saving,
  period,
}: {
  saving: Saving;
  period: string;
}) {
  const [confirm, setConfirm] = useState(false);
  const [effectivePeriod, setEffectivePeriod] = useState(period);
  const [state, action, pending] = useActionState(
    removeSavingAction.bind(null, saving.id),
    {},
  );
  if (!confirm)
    return (
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Avsluta ${saving.name}`}
        onClick={() => setConfirm(true)}
      >
        Avsluta
      </Button>
    );
  return (
    <form action={action} className="space-y-2">
      <p className="text-xs">Tidigare månader behålls.</p>
      <Label htmlFor={`saving-end-${saving.id}`}>Avsluta från</Label>
      <Input
        id={`saving-end-${saving.id}`}
        name="period"
        type="month"
        required
        value={effectivePeriod}
        onChange={(event) => setEffectivePeriod(event.target.value)}
        min={saving.startsOn ?? "1900-01"}
        max={saving.endsOn ?? "2199-12"}
        disabled={pending}
      />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={pending}
        aria-label={`Bekräfta avslut av ${saving.name}`}
      >
        {pending ? "Avslutar…" : "Avsluta"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => setConfirm(false)}
      >
        Avbryt
      </Button>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
