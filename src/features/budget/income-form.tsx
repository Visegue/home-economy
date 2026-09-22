"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AddCardButton } from "@/components/add-card-button";
import { FormDialogContent } from "@/components/form-dialog-content";
import { InfoButton } from "@/components/info-button";
import { Pencil, Save, Trash2, X } from "lucide-react";
import { ActionIconButton } from "@/components/action-icon-button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  removeIncomeAction,
  saveIncomeAction,
  type FormState,
} from "./actions";
import type { BudgetIncome } from "./model";

export function IncomeDialog({
  income,
  defaultStart,
}: {
  income?: BudgetIncome;
  defaultStart: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
    </Dialog>
  );
}

export function RemoveIncomeDialog({ income }: { income: BudgetIncome }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <ActionIconButton label={`Ta bort ${income.name}`} tone="danger">
          <Trash2 aria-hidden="true" />
        </ActionIconButton>
      </DialogTrigger>
      <FormDialogContent title="Ta bort inkomst">
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
  const [amount, setAmount] = useState(
    income ? (income.amountInOre / 100).toFixed(2).replace(".", ",") : "",
  );
  const [startsOn, setStartsOn] = useState(income?.startsOn ?? defaultStart);
  const [endsOn, setEndsOn] = useState(income?.endsOn ?? "");
  const [ongoing, setOngoing] = useState(income?.endsOn == null);
  const [state, action, pending] = useActionState(
    async (previous: FormState, data: FormData) => {
      const result = await saveIncomeAction(previous, data);
      if (result.success) onSaved();
      return result;
    },
    {},
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
                Inkomsten räknas varje månad, inklusive start- och slutmånad.
                Välj tills vidare om den saknar slutdatum.
              </p>
              <p>
                Vid ändrat belopp: avsluta gamla inkomsten och lägg till en ny
                från nästa månad. Då behålls tidigare månaders belopp.
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
            <Label htmlFor="income-start">Från och med</Label>
            <Input
              id="income-start"
              name="startsOn"
              type="month"
              min="1900-01"
              max="2199-12"
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
                type="month"
                min={startsOn || "1900-01"}
                max="2199-12"
                value={endsOn}
                onChange={(event) => setEndsOn(event.target.value)}
                required
              />
            </div>
          )}
        </div>
        {income ? (
          <p className="text-sm text-muted-foreground">
            Ändringar gäller hela perioden.
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
      <p>
        Ta bort {income.name} för hela perioden? Ange slutmånad för att behålla
        historiken.
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
          label="Bekräfta borttagning"
          tone="danger"
          pending={pending}
        >
          <Trash2 aria-hidden="true" />
        </ActionIconButton>
      </div>
    </form>
  );
}
