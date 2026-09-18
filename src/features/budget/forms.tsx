"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AddCardButton } from "@/components/add-card-button";
import { FormDialogContent } from "@/components/form-dialog-content";
import { InfoButton } from "@/components/info-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
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
import { amountSchema, cycles, monthLabel } from "./model";

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
}: {
  period: string;
  people: { id: number; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <AddCardButton label="Lägg till utgift" />
      </DialogTrigger>
      <FormDialogContent
        title="Lägg till utgift"
        description={`Gäller från ${monthLabel(period)} och framåt.`}
      >
        {open ? (
          <ExpenseForm
            period={period}
            people={people}
            onSaved={() => setOpen(false)}
          />
        ) : null}
      </FormDialogContent>
    </Dialog>
  );
}

function ExpenseForm({
  period,
  people,
  onSaved,
}: {
  period: string;
  people: { id: number; name: string }[];
  onSaved: () => void;
}) {
  const [type, setType] = useState("direct");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [months, setMonths] = useState("12");
  const [nextDueOn, setNextDueOn] = useState("");
  const [owners, setOwners] = useState<number[]>([]);
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
      <input type="hidden" name="period" value={period} />
      <fieldset disabled={pending} className="space-y-5">
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-2 text-sm font-medium">
            <span className="inline-flex items-center gap-1">
              Typ av utgift
              <InfoButton title="Utgiftstyper">
                <p>
                  Direkta utgifter, som hyra, betalas varje månad och dras från
                  månadsbudgeten.
                </p>
                <p>
                  För avsatta utgifter, som en årsförsäkring, läggs en del undan
                  varje månad. Den delen ingår i budgetens utgifter och i
                  beloppet att föra över till avsättningskontot.
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
                onChange={() => setType(option.value)}
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
                  min={`${period}-01`}
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
                  Beloppet per betalning delas med antalet månader mellan
                  betalningarna. En årskostnad på 1 200 kr ger 100 kr per månad.
                </p>
                <p>
                  Kontots saldo och tiden till första betalningen räknas inte
                  in. Om betalningen ligger nära kan du behöva sätta in mer
                  första gången.
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
                  Välj vilka medlemmar utgiften gäller. Beloppet räknas en gång
                  i hushållets budget, även med flera ägare. Du kan också lämna
                  valet tomt.
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

export function PersonDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <AddCardButton label="Lägg till familjemedlem" />
      </DialogTrigger>
      <FormDialogContent title="Lägg till familjemedlem">
        {open ? <PersonForm onSaved={() => setOpen(false)} /> : null}
      </FormDialogContent>
    </Dialog>
  );
}

function PersonForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [state, action, pending] = useActionState(
    async (previous: FormState, data: FormData) => {
      const result = await addPersonAction(previous, data);
      if (result.success) onSaved();
      return result;
    },
    {},
  );
  return (
    <form action={action} className="space-y-5">
      <div className="flex items-center gap-1">
        <Label htmlFor="person-name">Medlemmens namn</Label>
        <InfoButton title="Hushållets medlemmar">
          <p>
            Medlemmar kan väljas som ägare på utgifter. Att lägga till ett namn
            skapar inget konto och ger inte personen tillgång till hushållet.
          </p>
        </InfoButton>
      </div>
      <Input
        id="person-name"
        name="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={120}
        required
        disabled={pending}
        placeholder="Till exempel Kim"
      />
      <Feedback state={state} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sparar…" : "Spara familjemedlem"}
      </Button>
    </form>
  );
}

export function RemoveExpenseButton({
  id,
  name,
}: {
  id: number;
  name: string;
}) {
  const [confirm, setConfirm] = useState(false);
  const [state, action, pending] = useActionState(removeExpenseAction, {});
  return confirm ? (
    <form action={action} className="space-y-2 whitespace-normal">
      <input type="hidden" name="id" value={id} />
      <p className="text-xs">Ta bort {name} ur budgeten för alla månader?</p>
      <div className="flex gap-1">
        <Button variant="destructive" size="sm" disabled={pending}>
          Ta bort
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
      aria-label={`Ta bort ${name}`}
      onClick={() => setConfirm(true)}
    >
      Ta bort
    </Button>
  );
}
