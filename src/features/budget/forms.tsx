"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { InfoButton } from "@/components/info-button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBudgetSek } from "@/lib/money";
import {
  addExpenseAction,
  addPersonAction,
  removeExpenseAction,
  type FormState,
} from "./actions";
import { amountSchema, cycles, monthLabel, type BudgetExpense } from "./model";
import { incomeToInput } from "@/features/income/validation";

function Feedback({ state }: { state: FormState }) {
  return state.error ? (
    <p role="alert" className="text-sm text-destructive">
      {state.error}
    </p>
  ) : state.success ? (
    <output className="block text-sm text-accent-foreground">
      {state.success}
    </output>
  ) : null;
}

export function ExpenseDialog({
  period,
  people,
  expense,
}: {
  period: string;
  people: { id: number; name: string }[];
  expense?: BudgetExpense;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={expense ? "ghost" : "default"}
          size={expense ? "sm" : "default"}
          aria-label={expense ? `Ändra ${expense.name}` : undefined}
        >
          {expense ? (
            "Ändra"
          ) : (
            <>
              <Plus aria-hidden="true" className="size-4" />
              Lägg till utgift
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {expense ? "Ändra utgift" : "Lägg till utgift"}
          </DialogTitle>
          <DialogDescription>
            {expense
              ? "Välj månad för ändringen. Tidigare månaders belopp behålls."
              : `Gäller från ${monthLabel(period)} och framåt.`}
            {expense?.endsOn
              ? ` Perioden slutar ${monthLabel(expense.endsOn.slice(0, 7))}.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <ExpenseForm
          period={period}
          people={people}
          expense={expense}
          onSaved={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ExpenseForm({
  period,
  people,
  onSaved,
  expense,
}: {
  period: string;
  people: { id: number; name: string }[];
  onSaved: () => void;
  expense?: BudgetExpense;
}) {
  const [effectivePeriod, setEffectivePeriod] = useState(period);
  const [type, setType] = useState(expense?.destination ?? "direct");
  const [name, setName] = useState(expense?.name ?? "");
  const [amount, setAmount] = useState(
    incomeToInput(expense?.amountInOre ?? null),
  );
  const [months, setMonths] = useState(
    String(expense ? expense.every * (expense.unit === "year" ? 12 : 1) : 12),
  );
  const [nextDueOn, setNextDueOn] = useState(expense?.nextDueOn ?? "");
  const [owners, setOwners] = useState<number[]>(
    expense?.owners.map((owner) => owner.id) ?? [],
  );
  const [state, action, pending] = useActionState(
    async (previous: FormState, data: FormData) => {
      const result = await addExpenseAction(previous, data);
      if (result.success) onSaved();
      return result;
    },
    {},
  );
  const parsedAmount = amountSchema.safeParse(amount);
  return (
    <form action={action} className="space-y-5">
      {expense ? <input type="hidden" name="id" value={expense.id} /> : null}
      <fieldset disabled={pending} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="expense-period">
            {expense ? "Ändringen gäller från" : "Från och med"}
          </Label>
          <Input
            id="expense-period"
            name="period"
            type="month"
            required
            value={effectivePeriod}
            onChange={(event) => setEffectivePeriod(event.target.value)}
            min={expense?.startsOn?.slice(0, 7) ?? "1900-01"}
            max={expense?.endsOn?.slice(0, 7) ?? "2199-12"}
          />
        </div>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-2 text-sm font-medium">
            <span className="inline-flex items-center gap-1">
              Typ av utgift
              <InfoButton title="Utgiftstyper">
                <p>
                  Direkta utgifter, som hyra, betalas och räknas i budgeten
                  varje månad.
                </p>
                <p>
                  För avsatta utgifter, som en årsförsäkring, lägger du undan en
                  del varje månad. Den räknas som utgift och ingår i
                  överföringen till avsättningskontot.
                </p>
              </InfoButton>
            </span>
          </legend>
          {[
            {
              value: "direct",
              label: "Direkt utgift",
              description: "Betalas varje månad",
            },
            {
              value: "allocated",
              label: "Avsatt utgift",
              description: "Betalas mer sällan",
            },
          ].map((option) => (
            <label
              key={option.value}
              aria-label={option.label}
              className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 has-checked:border-primary has-checked:bg-primary/5"
            >
              <input
                type="radio"
                name="type"
                value={option.value}
                checked={type === option.value}
                onChange={() => setType(option.value as "direct" | "allocated")}
                className="mt-1 accent-primary"
              />
              <span>
                <span className="block font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="space-y-2">
          <Label htmlFor="expense-name">Namn på utgiften</Label>
          <Input
            id="expense-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Till exempel hemförsäkring"
            maxLength={160}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expense-amount">Belopp per betalning (kr)</Label>
          <Input
            id="expense-amount"
            name="amount"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0,00"
            required
          />
        </div>
        {type === "allocated" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expense-months">Hur ofta?</Label>
                <Select name="months" value={months} onValueChange={setMonths}>
                  <SelectTrigger id="expense-months" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cycles.map((cycle) => (
                      <SelectItem
                        key={cycle.months}
                        value={String(cycle.months)}
                      >
                        {cycle.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-due">Nästa betalning</Label>
                <Input
                  id="expense-due"
                  name="nextDueOn"
                  type="date"
                  min={`${effectivePeriod}-01`}
                  value={nextDueOn}
                  onChange={(event) => setNextDueOn(event.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg bg-secondary/60 p-3 text-sm">
              <p>
                Att avsätta:{" "}
                <strong>
                  {formatBudgetSek(
                    parsedAmount.success
                      ? Math.round(parsedAmount.data / Number(months))
                      : 0,
                  )}{" "}
                  per månad
                </strong>
              </p>
              <InfoButton title="Månadsavsättningen">
                <p>
                  Dela beloppet med månaderna mellan betalningar. En årskostnad
                  på 1 200 kr blir 100 kr per månad.
                </p>
                <p>
                  Kontots saldo och tiden till första betalningen ingår inte. Är
                  betalningen nära kan du behöva sätta in extra första gången.
                </p>
              </InfoButton>
            </div>
          </>
        ) : null}
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">
            <span className="inline-flex items-center gap-1">
              Ägare (frivilligt)
              <InfoButton title="Utgiftens ägare">
                <p>
                  Välj medlemmar eller lämna tomt. Utgiften räknas en gång i
                  budgeten, även med flera ägare.
                </p>
              </InfoButton>
            </span>
          </legend>
          {people.length ? (
            <>
              <div className="flex flex-wrap gap-2">
                {people.map((person) => (
                  <label
                    key={person.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 has-checked:border-primary has-checked:bg-primary/5"
                  >
                    <input
                      type="checkbox"
                      name="ownerIds"
                      value={person.id}
                      checked={owners.includes(person.id)}
                      onChange={(event) =>
                        setOwners(
                          event.target.checked
                            ? [...owners, person.id]
                            : owners.filter((id) => id !== person.id),
                        )
                      }
                      className="size-4 accent-primary"
                    />
                    {person.name}
                  </label>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link href="/settings" className="text-primary underline">
                Lägg till medlemmar
              </Link>
            </p>
          )}
        </fieldset>
      </fieldset>
      <Feedback state={state} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sparar…" : "Spara utgift"}
      </Button>
    </form>
  );
}

export function PersonForm() {
  const [name, setName] = useState("");
  const [state, action, pending] = useActionState(
    async (previous: FormState, data: FormData) => {
      const result = await addPersonAction(previous, data);
      if (result.success) setName("");
      return result;
    },
    {},
  );
  return (
    <form action={action} className="space-y-3">
      <div className="flex items-center gap-1">
        <Label htmlFor="person-name">Medlemmens namn</Label>
        <InfoButton title="Hushållets medlemmar">
          <p>
            Medlemmar kan anges som ägare på utgifter. Ett namn skapar inget
            konto och ger ingen åtkomst till hushållet.
          </p>
        </InfoButton>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          id="person-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          required
          disabled={pending}
          placeholder="Till exempel Kim"
          className="w-full sm:w-64"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Sparar…" : "Lägg till medlem"}
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function RemoveExpenseButton({
  id,
  name,
  period,
  startsOn,
  endsOn,
}: {
  id: number;
  name: string;
  period: string;
  startsOn: string | null;
  endsOn: string | null;
}) {
  const [confirm, setConfirm] = useState(false);
  const [effectivePeriod, setEffectivePeriod] = useState(period);
  const [state, action, pending] = useActionState(removeExpenseAction, {});
  return confirm ? (
    <form action={action} className="space-y-2 whitespace-normal">
      <input type="hidden" name="id" value={id} />
      <p className="text-xs">
        Avsluta {name} från vald månad? Tidigare månader behålls.
      </p>
      <Label htmlFor={`expense-end-${id}`}>Avsluta från</Label>
      <Input
        id={`expense-end-${id}`}
        name="period"
        type="month"
        value={effectivePeriod}
        onChange={(event) => setEffectivePeriod(event.target.value)}
        required
        min={startsOn?.slice(0, 7) ?? "1900-01"}
        max={endsOn?.slice(0, 7) ?? "2199-12"}
        disabled={pending}
      />
      <div className="flex gap-1">
        <Button variant="destructive" size="sm" disabled={pending}>
          Avsluta
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirm(false)}
          disabled={pending}
        >
          Avbryt
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  ) : (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`Avsluta ${name}`}
      onClick={() => setConfirm(true)}
    >
      Avsluta
    </Button>
  );
}
