"use client";

import { useActionState, useState } from "react";
import { InfoButton } from "@/components/info-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
        <Button
          variant={income ? "outline" : "default"}
          size={income ? "sm" : "default"}
          aria-label={income ? `Ändra ${income.name}` : undefined}
        >
          {income ? "Ändra" : "Lägg till inkomst"}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>
            {income ? "Ändra inkomst" : "Lägg till inkomst"}
          </DialogTitle>
        </DialogHeader>
        {open ? (
          <IncomeForm
            income={income}
            defaultStart={defaultStart}
            onSaved={() => setOpen(false)}
          />
        ) : null}
      </DialogContent>
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
                Beloppet läggs till hushållets inkomster varje månad under
                perioden. Både start- och slutmånaden ingår. Välj tills vidare
                om inkomsten saknar slutdatum.
              </p>
              <p>
                Vid exempelvis en löneökning: avsluta den gamla inkomsten och
                lägg till det nya beloppet från nästa månad. Då behålls tidigare
                månaders belopp.
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
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sparar…" : "Spara inkomst"}
      </Button>
    </form>
  );
}

export function RemoveIncomeButton({ income }: { income: BudgetIncome }) {
  const [confirm, setConfirm] = useState(false);
  const [state, action, pending] = useActionState(removeIncomeAction, {});
  return confirm ? (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={income.id} />
      <p className="text-sm">
        Ta bort {income.name} för hela perioden? Använd slutmånad om historiken
        ska behållas.
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="destructive" disabled={pending}>
          Bekräfta borttagning
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => setConfirm(false)}
        >
          Avbryt
        </Button>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  ) : (
    <Button
      size="sm"
      variant="ghost"
      aria-label={`Ta bort ${income.name}`}
      onClick={() => setConfirm(true)}
    >
      Ta bort
    </Button>
  );
}
