"use client";

import Link from "next/link";
import { MemberAvatar } from "@/components/member-avatar";
import type { HouseholdPerson } from "@/features/households/members/model";
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
import { Pencil, Save, CircleStop, X } from "lucide-react";
import { ActionIconButton } from "@/components/action-icon-button";
import { DialogTrigger } from "@/components/ui/dialog";
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
  removeExpenseAction,
  type FormState,
} from "./actions";
import { amountSchema, cycles, monthLabel, type BudgetExpense } from "./model";
import { incomeToInput } from "@/features/income/validation";
import { SettlementFields, type SettlementDraft } from "./settlement-fields";
import { VersionFields, useVersionFields } from "@/features/periods/fields";
import { formDate, versionBounds } from "@/features/periods/model";

const expenseTypes = [
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
  {
    value: "settlement",
    label: "Avräkning",
    description: "Planeras på lång sikt",
  },
] as const;

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
  defaultType = "direct",
}: {
  period: string;
  people: HouseholdPerson[];
  expense?: BudgetExpense;
  defaultType?: BudgetExpense["destination"];
}) {
  const [open, setOpen] = useState(false);
  const settlement = (expense?.destination ?? defaultType) === "settlement";
  return (
    <FormDialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {expense ? (
          <ActionIconButton label={`Ändra ${expense.name}`} tone="edit">
            <Pencil aria-hidden="true" />
          </ActionIconButton>
        ) : (
          <AddCardButton
            label={settlement ? "Lägg till avräkning" : "Lägg till utgift"}
          />
        )}
      </DialogTrigger>
      <FormDialogContent
        title={
          settlement
            ? expense
              ? "Ändra avräkning"
              : "Lägg till avräkning"
            : expense
              ? "Ändra utgift"
              : "Lägg till utgift"
        }
        description={
          (expense
            ? "Välj datum för ändringen. Tidigare värden och framtida ändringar behålls."
            : `Gäller från ${monthLabel(period)} och framåt.`) +
          (expense?.endsOn
            ? ` Perioden slutar ${monthLabel(expense.endsOn.slice(0, 7))}.`
            : "")
        }
      >
        {open ? (
          <ExpenseForm
            period={period}
            people={people}
            expense={expense}
            defaultType={defaultType}
            onSaved={() => setOpen(false)}
          />
        ) : null}
      </FormDialogContent>
    </FormDialog>
  );
}

export function RemoveExpenseDialog({
  expense,
  period,
}: {
  expense: BudgetExpense;
  period: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <FormDialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <ActionIconButton label={`Avsluta ${expense.name}`} tone="danger">
          <CircleStop aria-hidden="true" />
        </ActionIconButton>
      </DialogTrigger>
      <FormDialogContent title="Avsluta utgift">
        {open ? (
          <RemoveExpenseForm
            expense={expense}
            period={period}
            onCancel={() => setOpen(false)}
            onRemoved={() => setOpen(false)}
          />
        ) : null}
      </FormDialogContent>
    </FormDialog>
  );
}

export function ExpenseForm({
  period,
  people,
  onSaved,
  expense,
  defaultType,
}: {
  period: string;
  people: HouseholdPerson[];
  onSaved: (savedId?: number) => void;
  expense?: BudgetExpense;
  defaultType: BudgetExpense["destination"];
}) {
  const [effectivePeriod, setEffectivePeriod] = useState(
    formDate(period, expense),
  );
  const [type, setType] = useState(expense?.destination ?? defaultType);
  const versionFields = useVersionFields(type, expense);
  const [settlementDraft, setSettlementDraft] = useState<SettlementDraft>({
    markupEnabled: expense?.settlement
      ? expense.settlement.markupAmountInOre !== null ||
        expense.settlement.markupPercent !== null
      : true,
    markupType:
      expense?.settlement?.markupAmountInOre != null ? "amount" : "percent",
    markup:
      expense?.settlement?.markupAmountInOre != null
        ? incomeToInput(expense.settlement.markupAmountInOre)
        : String(expense?.settlement?.markupPercent ?? 10),
    inflationEnabled: expense?.settlement
      ? expense.settlement.inflationPercent !== null
      : true,
    inflation: String(expense?.settlement?.inflationPercent ?? 2),
  });
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
  const notify = useSaveNotice();
  const [state, action, pending] = useActionState(
    async (previous: FormState, data: FormData) => {
      const result = await addExpenseAction(previous, data);
      if (result.success) {
        notify(
          savedMessage(
            type === "settlement"
              ? expense
                ? "Avräkningen uppdaterad"
                : "Avräkningen tillagd"
              : expense
                ? "Utgiften uppdaterad"
                : "Utgiften tillagd",
            String(data.get("period")),
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
  const parsedAmount = amountSchema.safeParse(amount);
  useFormGuard(
    {
      name,
      amount: parsedAmount.success ? parsedAmount.data : amount,
      period: effectivePeriod,
      mode: versionFields.mode,
      scheduledDay: versionFields.scheduledDay,
      type,
      months: type === "allocated" ? months : null,
      nextDueOn: type !== "direct" ? nextDueOn : null,
      settlement: type === "settlement" ? settlementDraft : null,
      owners: owners.toSorted((a, b) => a - b),
    },
    pending,
  );
  return (
    <form action={action} className="space-y-5">
      {expense ? <input type="hidden" name="id" value={expense.id} /> : null}
      <fieldset disabled={pending} className="space-y-5">
        <VersionFields version={expense} fields={versionFields} />
        <div className="space-y-2">
          <Label htmlFor="expense-period">
            {expense ? "Ändringen gäller från" : "Från och med"}
          </Label>
          <Input
            id="expense-period"
            name="period"
            type="date"
            required
            value={effectivePeriod}
            onChange={(event) => setEffectivePeriod(event.target.value)}
            min={
              expense
                ? (versionBounds(expense).start ?? "1900-01-01")
                : "1900-01-01"
            }
            max={
              expense
                ? (versionBounds(expense).end ?? "2199-12-31")
                : "2199-12-31"
            }
          />
        </div>
        <fieldset className="grid gap-2 sm:grid-cols-3">
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
                <p>
                  Avräkningar är större utgifter långt fram i tiden, som nya
                  vitvaror. Pengarna avsätts separat med valfritt påslag och
                  inflation.
                </p>
              </InfoButton>
            </span>
          </legend>
          {expense ? (
            <>
              <input type="hidden" name="type" value={type} />
              <p className="font-medium sm:col-span-3">
                {expenseTypes.find((option) => option.value === type)?.label}
              </p>
              <p className="text-sm text-muted-foreground sm:col-span-3">
                Typen är låst. Avsluta posten och skapa en ny för att använda en
                annan typ. Avslutet gäller den valda versionen; senare versioner
                behålls. Registrerade pengar och överföringar ligger kvar på den
                gamla posten. Båda posterna kan ge ett månadsbelopp under
                övergångsmånaden, beroende på giltighetsdatum och planerad dag.
              </p>
            </>
          ) : (
            expenseTypes.map((option) => (
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
                  onChange={() =>
                    setType(option.value as BudgetExpense["destination"])
                  }
                  className="mt-1 accent-primary"
                />
                <span>
                  <span className="block font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </label>
            ))
          )}
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
          <Label htmlFor="expense-amount">
            {type === "settlement"
              ? "Kostnad i dag (kr)"
              : "Belopp per betalning (kr)"}
          </Label>
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
                  min={`${effectivePeriod.slice(0, 7)}-01`}
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
        {type === "settlement" ? (
          <SettlementFields
            amount={amount}
            effectivePeriod={effectivePeriod.slice(0, 7)}
            planningPeriod={
              expense?.settlement && expense.nextDueOn === nextDueOn
                ? expense.settlement.startsOn.slice(0, 7)
                : effectivePeriod.slice(0, 7)
            }
            nextDueOn={nextDueOn}
            onDateChange={setNextDueOn}
            draft={settlementDraft}
            onDraftChange={setSettlementDraft}
          />
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
                    <MemberAvatar
                      name={person.name}
                      color={person.color}
                      className="size-7 text-[10px]"
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
      <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-popover pt-3">
        <ActionIconButton
          type="submit"
          label={type === "settlement" ? "Spara avräkning" : "Spara utgift"}
          tone="positive"
          pending={pending}
        >
          <Save aria-hidden="true" />
        </ActionIconButton>
      </div>
    </form>
  );
}

export function RemoveExpenseForm({
  expense,
  period,
  onCancel,
  onRemoved,
}: {
  expense: BudgetExpense;
  period: string;
  onCancel: () => void;
  onRemoved: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);
  const [effectivePeriod, setEffectivePeriod] = useState(
    formDate(period, expense),
  );
  const [state, action, pending] = useActionState(
    async (previous: FormState, data: FormData) => {
      const result = await removeExpenseAction(previous, data);
      return result;
    },
    {},
  );
  useFormGuard(null, pending);
  useCloseAfterSave(Boolean(state.success), pending, onRemoved);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={expense.id} />
      <input type="hidden" name="revision" value={expense.revision} />
      <p>
        Avsluta {expense.name} från valt datum? Tidigare värden och kommande
        versioner behålls.
      </p>
      <Label htmlFor={`expense-end-${expense.id}`}>Avsluta från</Label>
      <Input
        id={`expense-end-${expense.id}`}
        name="period"
        type="date"
        value={effectivePeriod}
        onChange={(event) => setEffectivePeriod(event.target.value)}
        required
        min={versionBounds(expense).start ?? "1900-01-01"}
        max={versionBounds(expense).end ?? "2199-12-31"}
        disabled={pending}
      />
      <Feedback state={state} />
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
          label={`Bekräfta avslut av ${expense.name}`}
          tone="danger"
          pending={pending}
        >
          <CircleStop aria-hidden="true" />
        </ActionIconButton>
      </div>
    </form>
  );
}
