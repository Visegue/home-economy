"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AddCardButton } from "@/components/add-card-button";
import {
  FormDialog,
  useFormGuard,
  useCloseAfterSave,
} from "@/components/form-dialog";
import { savedMessage, useSaveNotice } from "@/components/save-notice";
import { FormDialogContent } from "@/components/form-dialog-content";
import { InfoButton } from "@/components/info-button";
import { Pencil, Save, Trash2, X } from "lucide-react";
import { ActionIconButton } from "@/components/action-icon-button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VersionFields, useVersionFields } from "@/features/periods/fields";
import { formDate, versionBounds, currentDate } from "@/features/periods/model";
import {
  removeIncomeAction,
  saveIncomeAction,
  type FormState,
} from "./actions";
import { amountSchema, type BudgetIncome } from "./model";

export function IncomeDialog({
  income,
  defaultStart,
}: {
  income?: BudgetIncome;
  defaultStart: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <FormDialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {income ? (
          <ActionIconButton label={`Ändra ${income.name}`} tone="edit">
            <Pencil aria-hidden="true" />
          </ActionIconButton>
        ) : (
          <AddCardButton label="Lägg till inkomst" />
        )}
      </DialogTrigger>
      <FormDialogContent title={income ? "Ändra inkomst" : "Lägg till inkomst"}>
        {open ? (
          <IncomeForm
            income={income}
            defaultStart={defaultStart}
            onSaved={() => setOpen(false)}
          />
        ) : null}
      </FormDialogContent>
    </FormDialog>
  );
}

export function RemoveIncomeDialog({ income }: { income: BudgetIncome }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <ActionIconButton label={`Avsluta ${income.name}`} tone="danger">
          <Trash2 aria-hidden="true" />
        </ActionIconButton>
      </DialogTrigger>
      <FormDialogContent title="Avsluta inkomst">
        {open ? (
          <RemoveIncomeForm
            income={income}
            onCancel={() => setOpen(false)}
            onRemoved={() => setOpen(false)}
          />
        ) : null}
      </FormDialogContent>
    </Dialog>
  );
}

function IncomeForm({
  income,
  defaultStart,
  onSaved,
}: {
  income?: BudgetIncome;
  defaultStart: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState(income?.name ?? "");
  const versionFields = useVersionFields("income", income);
  const [amount, setAmount] = useState(
    income ? (income.amountInOre / 100).toFixed(2).replace(".", ",") : "",
  );
  const [startsOn, setStartsOn] = useState(formDate(defaultStart, income));
  const [endsOn, setEndsOn] = useState(
    income ? (versionBounds(income).end ?? "") : "",
  );
  const [ongoing, setOngoing] = useState(income?.endsOn == null);
  const notify = useSaveNotice();
  const [state, action, pending] = useActionState(
    async (previous: FormState, data: FormData) => {
      const result = await saveIncomeAction(previous, data);
      if (result.success) {
        notify(
          savedMessage(
            income ? "Inkomsten uppdaterad" : "Inkomsten tillagd",
            String(data.get("startsOn")),
          ),
        );
      }
      return result;
    },
    {},
  );

  useCloseAfterSave(Boolean(state.success), pending, onSaved);
  const parsedAmount = amountSchema.safeParse(amount);
  useFormGuard(
    {
      name,
      amount: parsedAmount.success ? parsedAmount.data : amount,
      startsOn,
      mode: versionFields.mode,
      scheduledDay: versionFields.scheduledDay,
      endsOn: ongoing ? "" : endsOn,
    },
    pending,
  );
  return (
    <form action={action} className="space-y-4">
      {income ? <input type="hidden" name="id" value={income.id} /> : null}
      <fieldset disabled={pending} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="income-name">Namn på inkomsten</Label>
          <Input
            id="income-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={160}
            placeholder="Till exempel lön, barnbidrag eller uthyrning"
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="income-amount">
              Belopp per månad efter skatt (kr)
            </Label>
            <InfoButton title="Inkomster">
              <p>
                Beloppet vid den planerade dagen räknas i månadsbudgeten. Välj
                tills vidare om den saknar slutdatum.
              </p>
              <p>
                Välj vilket datum ändringen börjar gälla. Det gamla beloppet
                avslutas dagen före. Då behålls tidigare perioders belopp.
              </p>
            </InfoButton>
          </div>
          <Input
            id="income-amount"
            name="amount"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0,00"
            required
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={ongoing}
            onChange={(event) => setOngoing(event.target.checked)}
            className="size-4 accent-primary"
          />
          Gäller tills vidare
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="income-start">
              {income ? "Ändringen gäller från" : "Från och med"}
            </Label>
            <Input
              id="income-start"
              name="startsOn"
              type="date"
              min={
                income
                  ? (versionBounds(income).start ?? "1900-01-01")
                  : "1900-01-01"
              }
              max={
                income
                  ? (versionBounds(income).end ?? "2199-12-31")
                  : "2199-12-31"
              }
              value={startsOn}
              onChange={(event) => setStartsOn(event.target.value)}
              required
            />
          </div>
          {ongoing ? (
            <input type="hidden" name="endsOn" value="" />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="income-end">Till och med</Label>
              <Input
                id="income-end"
                name="endsOn"
                type="date"
                min={startsOn || "1900-01-01"}
                max="2199-12-31"
                value={endsOn}
                onChange={(event) => setEndsOn(event.target.value)}
                required
              />
            </div>
          )}
        </div>
        <VersionFields version={income} fields={versionFields} />
        {income ? (
          <p className="text-sm text-muted-foreground">
            Tidigare värden bevaras vid en ny ändring. En rättelse uppdaterar
            den valda versionen.
          </p>
        ) : null}
      </fieldset>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-popover pt-3">
        <ActionIconButton
          type="submit"
          label="Spara inkomst"
          tone="positive"
          pending={pending}
        >
          <Save aria-hidden="true" />
        </ActionIconButton>
      </div>
    </form>
  );
}

function RemoveIncomeForm({
  income,
  onCancel,
  onRemoved,
}: {
  income: BudgetIncome;
  onCancel: () => void;
  onRemoved: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);
  const [state, action, pending] = useActionState(
    async (previous: FormState, data: FormData) => {
      const result = await removeIncomeAction(previous, data);
      if (result.success) onRemoved();
      return result;
    },
    {},
  );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={income.id} />
      <input type="hidden" name="revision" value={income.revision} />
      <Label htmlFor={`income-stop-${income.id}`}>Avsluta från</Label>
      <Input
        id={`income-stop-${income.id}`}
        name="period"
        type="date"
        required
        defaultValue={formDate(currentDate(), income)}
        min={versionBounds(income).start ?? "1900-01-01"}
        max={versionBounds(income).end ?? "2199-12-31"}
      />
      <p>
        Avsluta {income.name} från valt datum. Tidigare värden och kommande
        versioner behålls.
      </p>
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
          label="Bekräfta avslut"
          tone="danger"
          pending={pending}
        >
          <Trash2 aria-hidden="true" />
        </ActionIconButton>
      </div>
    </form>
  );
}
