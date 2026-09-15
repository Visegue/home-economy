"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useActionState, useState } from "react";
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
        <Button>
          <Plus aria-hidden="true" className="size-4" />
          Lägg till utgift
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Lägg till utgift</DialogTitle>
          <DialogDescription>
            Gäller från {monthLabel(period)} och framåt.
          </DialogDescription>
        </DialogHeader>
        <ExpenseForm
          period={period}
          people={people}
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
          <legend className="mb-2 text-sm font-medium">Typ av utgift</legend>
          {[
            {
              value: "direct",
              label: "Direkt utgift",
              description: "Betalas varje månad",
            },
            {
              value: "allocated",
              label: "Avsatt utgift",
              description: "Sätt av lite varje månad",
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
            <p className="rounded-lg bg-secondary/60 p-3 text-sm">
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
          </>
        ) : null}
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">
            Ägare (frivilligt)
          </legend>
          {people.length ? (
            <>
              <p className="text-xs text-muted-foreground">
                Välj en eller flera medlemmar som utgiften berör.
              </p>
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
              Lägg till medlemmar i{" "}
              <Link href="/settings" className="text-primary underline">
                hushållsinställningarna
              </Link>{" "}
              för att välja ägare. Du kan också spara utan ägare.
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
      <Label htmlFor="person-name">Medlemmens namn</Label>
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
