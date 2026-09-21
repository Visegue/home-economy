"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { AddCardButton } from "@/components/add-card-button";
import { FormDialogContent } from "@/components/form-dialog-content";
import { InfoButton } from "@/components/info-button";
import { Pencil, Save, CircleStop, X } from "lucide-react";
import { ActionIconButton } from "@/components/action-icon-button";
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
  onRemove,
  period,
}: {
  saving?: Saving;
  onSaved: () => void;
  onRemove: (trigger: HTMLButtonElement) => void;
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
      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-2 border-t bg-popover pt-3">
        {saving ? (
          <ActionIconButton
            label={`Avsluta ${saving.name}`}
            tone="danger"
            disabled={pending}
            onClick={(event) => onRemove(event.currentTarget)}
          >
            <CircleStop aria-hidden="true" />
          </ActionIconButton>
        ) : (
          <span />
        )}
        <ActionIconButton
          type="submit"
          label="Spara sparande"
          tone="positive"
          pending={pending}
        >
          <Save aria-hidden="true" />
        </ActionIconButton>
      </div>
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
  const [removing, setRemoving] = useState(false);
  const removeTriggerRef = useRef<HTMLButtonElement | null>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) setRemoving(false);
      }}
    >
      <DialogTrigger asChild>
        {saving ? (
          <ActionIconButton label={`Ändra ${saving.name}`} tone="edit">
            <Pencil aria-hidden="true" />
          </ActionIconButton>
        ) : (
          <AddCardButton label="Lägg till sparande" />
        )}
      </DialogTrigger>
      <FormDialogContent
        title={
          removing
            ? "Avsluta sparande"
            : saving
              ? "Ändra sparande"
              : "Lägg till sparande"
        }
      >
        {open ? (
          <>
            <div hidden={removing} className="space-y-4">
              <SavingForm
                saving={saving}
                period={period}
                onRemove={(trigger) => {
                  removeTriggerRef.current = trigger;
                  setRemoving(true);
                }}
                onSaved={() => {
                  setOpen(false);
                  setRemoving(false);
                }}
              />
            </div>
            {removing && saving ? (
              <RemoveSavingForm
                saving={saving}
                period={period}
                onCancel={() => {
                  setRemoving(false);
                  requestAnimationFrame(() =>
                    removeTriggerRef.current?.focus(),
                  );
                }}
                onRemoved={() => {
                  setOpen(false);
                  setRemoving(false);
                }}
              />
            ) : null}
          </>
        ) : null}
      </FormDialogContent>
    </Dialog>
  );
}

function RemoveSavingForm({
  saving,
  period,
  onCancel,
  onRemoved,
}: {
  saving: Saving;
  period: string;
  onCancel: () => void;
  onRemoved: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);
  const [effectivePeriod, setEffectivePeriod] = useState(period);
  const [state, action, pending] = useActionState(
    async (previous: SavingState, data: FormData) => {
      const result = await removeSavingAction(saving.id, previous, data);
      if (result.success) onRemoved();
      return result;
    },
    {},
  );
  return (
    <form action={action} className="space-y-4">
      <p>Avsluta {saving.name} från vald månad? Tidigare månader behålls.</p>
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
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <ActionIconButton
          ref={cancelRef}
          label="Avbryt"
          disabled={pending}
          onClick={onCancel}
        >
          <X aria-hidden="true" />
        </ActionIconButton>
        <ActionIconButton
          type="submit"
          label={`Bekräfta avslut av ${saving.name}`}
          tone="danger"
          pending={pending}
        >
          <CircleStop aria-hidden="true" />
        </ActionIconButton>
      </div>
    </form>
  );
}
