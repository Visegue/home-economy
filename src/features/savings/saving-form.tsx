"use client";

import { validateSaving } from "@/features/forms/validation";

import { FormActions } from "@home-economy/ui/layout";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { AddCardButton } from "@/components/add-card-button";
import {
  FormDialog,
  useFormGuard,
  useCloseAfterSave,
} from "@/components/form-dialog";
import { savedMessage, useSaveNotice } from "@/components/save-notice";
import { FormDialogContent } from "@/components/form-dialog-content";
import { InfoButton } from "@/components/info-button";
import { Pencil, Save, CircleStop, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/action-icon-button";
import { DialogTrigger } from "@/components/ui/dialog";
import { Form, FormSection, Input } from "@home-economy/ui/form";
import { Label } from "@/components/ui/label";
import {
  incomeToInput,
  monthlyIncomeInputSchema,
} from "@/features/income/validation";
import {
  removeSavingAction,
  saveSavingAction,
  type SavingState,
} from "./actions";
import type { Saving } from "./validation";
import { VersionFields, useVersionFields } from "@/features/periods/fields";
import { formDate, versionBounds } from "@/features/periods/model";

export function SavingForm({
  saving,
  onSaved,
  period,
}: {
  saving?: Saving;
  onSaved: (savedId?: number) => void;
  period: string;
}) {
  const fieldId = useId();
  const versionFields = useVersionFields("saving", saving);
  const [effectivePeriod, setEffectivePeriod] = useState(
    formDate(period, saving),
  );
  const [name, setName] = useState(saving?.name ?? "");
  const [amount, setAmount] = useState(
    incomeToInput(saving?.amountInOre ?? null),
  );
  const notify = useSaveNotice();
  const [state, action, pending] = useActionState(
    async (previous: SavingState, formData: FormData) => {
      const result = await saveSavingAction(saving?.id, previous, formData);
      if (result.success) {
        notify(
          savedMessage(
            saving ? "Sparandet uppdaterat" : "Sparandet tillagt",
            String(formData.get("period")),
          ),
        );
      }
      return result;
    },
    {},
  );

  useCloseAfterSave(Boolean(state.success), pending, () =>
    onSaved(state.savedId),
  );
  const parsedAmount = monthlyIncomeInputSchema.safeParse(amount);
  useFormGuard(
    {
      name,
      amount: parsedAmount.success ? parsedAmount.data : amount,
      period: effectivePeriod,
      mode: versionFields.mode,
      scheduledDay: versionFields.scheduledDay,
    },
    pending,
  );

  return (
    <Form
      action={action}
      pending={pending}
      error={state.error}
      validate={validateSaving}
      fieldErrors={{ name: state.nameError, amount: state.amountError }}
      className="space-y-5"
    >
      <FormSection title="Grunduppgifter">
        <div className="ui-field">
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
          />
        </div>
        <div className="ui-field">
          <div className="flex items-center gap-1">
            <Label htmlFor={`${fieldId}-amount`}>Belopp per månad (kr)</Label>
            <InfoButton title="Månadssparande">
              <p>
                Beloppet ingår i överföringen till sparande och dras från det du
                har kvar efter utgifter.
              </p>
              <p>
                Ändring och avslut gäller från valt datum. Tidigare perioders
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
          />
        </div>
      </FormSection>
      <FormSection title="Datum och giltighet">
        <fieldset disabled={pending}>
          <VersionFields version={saving} fields={versionFields} />
        </fieldset>
        <div className="ui-field">
          <Label htmlFor={`${fieldId}-period`}>
            {saving ? "Ändringen gäller från" : "Från och med"}
          </Label>
          <Input
            id={`${fieldId}-period`}
            name="period"
            type="date"
            required
            value={effectivePeriod}
            onChange={(event) => setEffectivePeriod(event.target.value)}
            min={
              saving
                ? (versionBounds(saving).start ?? "1900-01-01")
                : "1900-01-01"
            }
            max={
              saving
                ? (versionBounds(saving).end ?? "2199-12-31")
                : "2199-12-31"
            }
            disabled={pending}
          />
        </div>
      </FormSection>
      <FormActions>
        <ActionIconButton
          type="submit"
          label="Spara sparande"
          tone="positive"
          pending={pending}
        >
          <Save aria-hidden="true" />
        </ActionIconButton>
      </FormActions>
    </Form>
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
    <FormDialog open={open} onOpenChange={setOpen}>
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
    </FormDialog>
  );
}

export function RemoveSavingDialog({
  saving,
  period,
}: {
  saving: Saving;
  period: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <FormDialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <ActionIconButton label={`Avsluta ${saving.name}`} tone="danger">
          <CircleStop aria-hidden="true" />
        </ActionIconButton>
      </DialogTrigger>
      <FormDialogContent title="Avsluta sparande">
        {open ? (
          <RemoveSavingForm
            saving={saving}
            period={period}
            onCancel={() => setOpen(false)}
            onRemoved={() => setOpen(false)}
          />
        ) : null}
      </FormDialogContent>
    </FormDialog>
  );
}

export function RemoveSavingForm({
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
  const [effectivePeriod, setEffectivePeriod] = useState(
    formDate(period, saving),
  );
  const [state, action, pending] = useActionState(
    async (previous: SavingState, data: FormData) => {
      const result = await removeSavingAction(saving.id, previous, data);
      return result;
    },
    {},
  );
  useFormGuard(null, pending);
  useCloseAfterSave(Boolean(state.success), pending, onRemoved);
  return (
    <Form
      action={action}
      pending={pending}
      error={state.error}
      className="space-y-4"
    >
      <input type="hidden" name="revision" value={saving.revision} />
      <p>
        Avsluta {saving.name} från valt datum? Tidigare värden och kommande
        versioner behålls.
      </p>
      <Label htmlFor={`saving-end-${saving.id}`}>Avsluta från</Label>
      <Input
        id={`saving-end-${saving.id}`}
        name="period"
        type="date"
        required
        value={effectivePeriod}
        onChange={(event) => setEffectivePeriod(event.target.value)}
        min={versionBounds(saving).start ?? "1900-01-01"}
        max={versionBounds(saving).end ?? "2199-12-31"}
        disabled={pending}
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          ref={cancelRef}
          aria-label="Avbryt"
          disabled={pending}
          onClick={onCancel}
        >
          <X aria-hidden="true" />
          Avbryt
        </Button>
        <Button
          type="submit"
          aria-label={`Bekräfta avslut av ${saving.name}`}
          variant="destructive"
          disabled={pending}
        >
          <CircleStop aria-hidden="true" />
          Ja, avsluta
        </Button>
      </div>
    </Form>
  );
}
