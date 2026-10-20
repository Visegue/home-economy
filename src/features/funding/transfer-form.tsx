"use client";

import { ClipboardPenLine, ClipboardCheck } from "lucide-react";
import { SelectTrigger } from "@home-economy/ui/form";

import { validateTransfer } from "@/features/forms/validation";

import { ChoiceInput } from "@home-economy/ui/form";
import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormSection, Input } from "@home-economy/ui/form";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { DialogTrigger } from "@/components/ui/dialog";
import { FormDialog, useFormGuard } from "@/components/form-dialog";
import { FormDialogContent } from "@/components/form-dialog-content";
import { appliesOn, currentDate } from "@/features/periods/model";
import { monthlyExpenseAmount } from "@/features/budget/model";
import { confirmTransferAction } from "./actions";
import type { getFundingData } from "./data";

type Purpose = Awaited<ReturnType<typeof getFundingData>>["purposes"][number];
export function TransferDialog({ purpose }: { purpose: Purpose }) {
  const [open, setOpen] = useState(false);
  return (
    <FormDialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-11 max-w-full flex-wrap py-2 [overflow-wrap:anywhere] whitespace-normal"
        >
          <ClipboardPenLine aria-hidden="true" />
          Registrera för {purpose.name}
        </Button>
      </DialogTrigger>
      <FormDialogContent title={`Registrera för ${purpose.name}`}>
        {open ? <TransferForm purpose={purpose} /> : null}
      </FormDialogContent>
    </FormDialog>
  );
}
function TransferForm({ purpose }: { purpose: Purpose }) {
  const field = useId();
  const [requestId] = useState(() => crypto.randomUUID());
  const [date, setDate] = useState(currentDate());
  const [kind, setKind] = useState("deposit");
  const [amount, setAmount] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [state, action, pending] = useActionState(confirmTransferAction, {});
  // Keep this confirmation's request id alive until the action has settled.
  useFormGuard(null, pending);
  const version = purpose.versions.findLast((v) => appliesOn(v, date));
  const suggested = !version
    ? 0
    : "destination" in version
      ? kind === "withdrawal"
        ? version.amountInOre
        : version.destination === "direct"
          ? 0
          : monthlyExpenseAmount(date.slice(0, 7), version)
      : version.amountInOre;
  return (
    <Form
      action={action}
      pending={pending}
      error={state.error}
      validate={validateTransfer}
      // A warning is not a completed confirmation. Also stop native Select reset listeners.
      onResetCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      className="min-w-0 space-y-4"
    >
      <input type="hidden" name="id" value={requestId} />
      <input type="hidden" name="itemId" value={purpose.itemId ?? ""} />
      <input type="hidden" name="source" value={purpose.source} />
      <input type="hidden" name="versionId" value={purpose.id} />
      <p className="text-sm text-muted-foreground">
        Registrera något som redan har utförts. Appen flyttar inga pengar.
      </p>
      <fieldset
        disabled={pending || Boolean(state.success)}
        className="min-w-0 space-y-4"
      >
        <FormSection title="Överföring">
          <div className="ui-field">
            <Label htmlFor={`${field}-kind`}>Händelse</Label>
            <Select
              name="kind"
              value={kind}
              disabled={pending || Boolean(state.success)}
              onValueChange={(value) => {
                setKind(value);
                setAmount(null);
              }}
            >
              <SelectTrigger
                name="kind"
                id={`${field}-kind`}
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deposit">Insättning</SelectItem>
                <SelectItem value="withdrawal">Uttag</SelectItem>
                {!purpose.hasOpening ? (
                  <SelectItem value="opening">Ingående värde</SelectItem>
                ) : null}
              </SelectContent>
            </Select>
          </div>
          <div className="ui-field">
            <Label htmlFor={`${field}-date`}>Utfört datum</Label>
            <Input
              id={`${field}-date`}
              type="date"
              name="occurredOn"
              value={date}
              max={currentDate()}
              min="1900-01-01"
              required
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="ui-field">
            <Label htmlFor={`${field}-amount`}>Faktiskt belopp (kr)</Label>
            <Input
              id={`${field}-amount`}
              name="amount"
              inputMode="decimal"
              value={
                amount ??
                ((kind === "opening" ? 0 : suggested) / 100)
                  .toFixed(2)
                  .replace(".", ",")
              }
              required
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="ui-field">
            <Label htmlFor={`${field}-month`}>Avser månad</Label>
            <Input
              id={`${field}-month`}
              type="month"
              name="attributionMonth"
              value={month ?? date.slice(0, 7)}
              required
              onChange={(e) => setMonth(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Styr planuppföljningen. Värdet ändras på utfört datum.
            </p>
          </div>
          <div className="ui-field">
            <Label htmlFor={`${field}-note`}>Anteckning</Label>
            <Input id={`${field}-note`} name="note" maxLength={500} />
          </div>
        </FormSection>
        {state.warning ? (
          <div role="alert" className="space-y-2 rounded-md border p-3">
            <p>{state.warning}</p>
            <Label className="flex gap-2">
              <ChoiceInput type="checkbox" name="confirmNegative" required />
              Jag bekräftar registreringen trots negativt värde
            </Label>
          </div>
        ) : null}
        <Button
          type="submit"
          className="h-auto min-h-11 max-w-full flex-wrap py-2 [overflow-wrap:anywhere] whitespace-normal"
        >
          <ClipboardCheck aria-hidden="true" />
          {pending ? "Sparar…" : "Bekräfta registrering"}
        </Button>
      </fieldset>
      {state.success ? <output>{state.success}</output> : null}
    </Form>
  );
}
