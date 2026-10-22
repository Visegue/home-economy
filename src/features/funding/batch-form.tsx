"use client";

import { ClipboardPenLine, ClipboardCheck } from "lucide-react";
import { useActionState, useCallback, useId, useState } from "react";
import { FormActions } from "@home-economy/ui/layout";
import { ChoiceInput, Form, Input } from "@home-economy/ui/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DialogTrigger } from "@/components/ui/dialog";
import {
  FormDialog,
  useCloseAfterSave,
  useFormGuard,
} from "@/components/form-dialog";
import { FormDialogContent } from "@/components/form-dialog-content";
import { amountSchema, monthLabel } from "@/features/budget/model";
import {
  calendarDateSchema,
  currentDate,
  dateLabel,
} from "@/features/periods/model";
import { formatBudgetSek } from "@/lib/money";
import { confirmDepositBatchAction } from "./actions";
import {
  batchPurposeOn,
  purposeKey,
  type DepositBatchResult,
  type FundingPurpose,
} from "./batch-model";

type DraftRow = { id: string; selected: boolean; amount: string };
type BatchState = Awaited<ReturnType<typeof confirmDepositBatchAction>>;

function summary(result: DepositBatchResult) {
  return `${result.count} insättningar registrerade, totalt ${formatBudgetSek(result.totalInOre)}. Utfört ${dateLabel(result.occurredOn)} · Avser ${monthLabel(result.attributionMonth)}.`;
}

export function DepositBatchDialog({
  period,
  purposes,
}: {
  period: string;
  purposes: FundingPurpose[];
}) {
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState("");
  const onSaved = useCallback((result: DepositBatchResult) => {
    setSuccess(summary(result));
    setOpen(false);
  }, []);
  return (
    <>
      <FormDialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            className="mt-4 h-auto min-h-11 w-full whitespace-normal"
          >
            <ClipboardPenLine aria-hidden="true" />
            Registrera månadens insättningar
          </Button>
        </DialogTrigger>
        <FormDialogContent title="Registrera månadens insättningar">
          {open ? (
            <DepositBatchForm
              period={period}
              purposes={purposes}
              onSaved={onSaved}
            />
          ) : null}
        </FormDialogContent>
      </FormDialog>
      {success ? (
        <output className="mt-3 block text-sm">{success}</output>
      ) : null}
    </>
  );
}

function DepositBatchForm({
  period,
  purposes,
  onSaved,
}: {
  period: string;
  purposes: FundingPurpose[];
  onSaved: (result: DepositBatchResult) => void;
}) {
  const field = useId();
  // Freeze the original plan/ledger basis for this draft. Reopening reads refreshed server props.
  const [basis] = useState(purposes);
  const [requestId] = useState(() => crypto.randomUUID());
  const [date, setDate] = useState(currentDate());
  const [notice, setNotice] = useState("");
  const [confirmNegative, setConfirmNegative] = useState(false);
  const [draft, setDraft] = useState<Record<string, DraftRow>>(() =>
    Object.fromEntries(
      basis
        .filter((purpose) => purpose.inMonthlyPlan)
        .map((purpose) => [
          purposeKey(purpose),
          {
            id: crypto.randomUUID(),
            selected: Boolean(
              batchPurposeOn(purpose, currentDate()) &&
              purpose.progress.remainingInOre > 0,
            ),
            amount: (purpose.progress.remainingInOre / 100)
              .toFixed(2)
              .replace(".", ","),
          },
        ]),
    ),
  );
  const visible = basis.filter((purpose) => batchPurposeOn(purpose, date));
  const selected = visible.filter(
    (purpose) => draft[purposeKey(purpose)]?.selected,
  );
  const totalInOre = selected.reduce<number | null>((total, purpose) => {
    if (total === null) return null;
    const amount = amountSchema.safeParse(draft[purposeKey(purpose)].amount);
    if (!amount.success || amount.data <= 0) return null;
    const sum = total + amount.data;
    return Number.isSafeInteger(sum) ? sum : null;
  }, 0);
  const [state, action, pending] = useActionState<BatchState, FormData>(
    async () => {
      try {
        return await confirmDepositBatchAction({
          id: requestId,
          attributionMonth: period,
          occurredOn: date,
          confirmNegative,
          rows: selected.map((purpose) => ({
            id: draft[purposeKey(purpose)].id,
            itemId: purpose.itemId ?? undefined,
            source: purpose.source,
            versionId: purpose.id,
            amount: draft[purposeKey(purpose)].amount,
          })),
        });
      } catch {
        return {
          error:
            "Svaret kunde inte hämtas. Försök igen med samma inmatning; redan sparade insättningar registreras inte igen.",
        };
      }
    },
    {},
  );
  useFormGuard({ date, draft, confirmNegative }, pending);
  const result = "result" in state ? state.result : undefined;
  const close = useCallback(() => {
    if (result) onSaved(result);
  }, [result, onSaved]);
  useCloseAfterSave(Boolean(result), pending, close);

  function changeDate(next: string) {
    setDate(next);
    setConfirmNegative(false);
    if (!calendarDateSchema.safeParse(next).success) return;
    const removed = basis.filter(
      (purpose) =>
        draft[purposeKey(purpose)]?.selected && !batchPurposeOn(purpose, next),
    );
    if (removed.length) {
      setDraft((previous) =>
        Object.fromEntries(
          Object.entries(previous).map(([key, row]) => [
            key,
            removed.some((purpose) => purposeKey(purpose) === key)
              ? { ...row, selected: false }
              : row,
          ]),
        ),
      );
      setNotice(
        "Ändamål som inte hade börjat på det nya datumet har tagits ur urvalet. Beloppen bevaras, men välj raderna igen om du byter tillbaka.",
      );
    } else setNotice("");
  }
  return (
    <Form
      action={action}
      pending={pending}
      validate={() =>
        Object.fromEntries(
          selected.flatMap((purpose) => {
            const key = purposeKey(purpose);
            const amount = amountSchema.safeParse(draft[key].amount);
            return !amount.success || amount.data <= 0
              ? [
                  [
                    `amount-${key}`,
                    amount.success
                      ? "Beloppet måste vara större än noll."
                      : amount.error.issues[0].message,
                  ],
                ]
              : [];
          }),
        )
      }
      error={"error" in state ? state.error : undefined}
      onResetCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      className="min-w-0 space-y-4"
    >
      <p className="text-sm text-muted-foreground">
        Registrera insättningar som redan har utförts. Appen flyttar inga
        pengar.
      </p>
      <p className="font-medium">Avser {monthLabel(period)} (låst)</p>
      <fieldset
        disabled={pending || Boolean(result)}
        className="min-w-0 space-y-4"
      >
        <div className="ui-field">
          <Label htmlFor={`${field}-date`}>Utfört datum</Label>
          <Input
            id={`${field}-date`}
            name="occurredOn"
            type="date"
            value={date}
            min="1900-01-01"
            max={currentDate()}
            required
            onChange={(event) => changeDate(event.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Värdet ändras på utfört datum. Avser månad styr planuppföljningen.
          </p>
        </div>
        {notice ? <output className="block text-sm">{notice}</output> : null}
        <div className="min-w-0 space-y-3">
          {visible.map((purpose) => {
            const key = purposeKey(purpose),
              row = draft[key],
              name = batchPurposeOn(purpose, date)!.name;
            return (
              <section
                key={key}
                aria-label={name}
                className="min-w-0 space-y-3 rounded-md border p-3"
              >
                <Label className="flex min-h-11 items-center gap-3 [overflow-wrap:anywhere] break-words">
                  <ChoiceInput
                    type="checkbox"
                    checked={row.selected}
                    onChange={(event) => {
                      setDraft((previous) => ({
                        ...previous,
                        [key]: { ...row, selected: event.target.checked },
                      }));
                      setConfirmNegative(false);
                    }}
                  />
                  {name}
                </Label>
                <p className="text-sm text-muted-foreground">
                  Planerat {formatBudgetSek(purpose.progress.plannedInOre)} ·
                  Redan insatt{" "}
                  {formatBudgetSek(purpose.progress.depositedInOre)}
                </p>
                <div className="ui-field">
                  <Label htmlFor={`${field}-${key}`}>
                    Faktiskt belopp för {name} (kr)
                  </Label>
                  <Input
                    id={`${field}-${key}`}
                    name={`amount-${key}`}
                    inputMode="decimal"
                    value={row.amount}
                    required={row.selected}
                    disabled={!row.selected}
                    onChange={(event) => {
                      setDraft((previous) => ({
                        ...previous,
                        [key]: { ...row, amount: event.target.value },
                      }));
                      setConfirmNegative(false);
                    }}
                  />
                </div>
              </section>
            );
          })}
          {!visible.length ? (
            <p>Inga ändamål i månadens plan är tillgängliga på utfört datum.</p>
          ) : null}
        </div>
        <section
          aria-label="Sammanfattning"
          className="space-y-1 rounded-md bg-muted p-3 text-sm"
        >
          <p>
            Avser {monthLabel(period)} · Utfört{" "}
            {calendarDateSchema.safeParse(date).success
              ? dateLabel(date)
              : "välj datum"}
          </p>
          <p>
            {selected.length} valda insättningar · Totalt{" "}
            {totalInOre !== null ? formatBudgetSek(totalInOre) : "—"}
          </p>
        </section>
        {"warning" in state && state.warning ? (
          <div role="alert" className="space-y-2 rounded-md border p-3">
            <p>{state.warning}</p>
            <Label className="flex gap-2">
              <ChoiceInput
                type="checkbox"
                checked={confirmNegative}
                required
                onChange={(event) => setConfirmNegative(event.target.checked)}
              />
              Jag bekräftar registreringen trots negativt värde
            </Label>
          </div>
        ) : null}
        <FormActions>
          <Button
            type="submit"
            disabled={!selected.length}
            className="h-auto min-h-11 w-full whitespace-normal"
          >
            <ClipboardCheck aria-hidden="true" />
            {pending
              ? "Sparar…"
              : `Bekräfta ${selected.length} utförda insättningar`}
          </Button>
        </FormActions>
      </fieldset>
    </Form>
  );
}
