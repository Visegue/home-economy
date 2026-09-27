"use client";

import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InfoButton } from "@/components/info-button";
import { settlementForecast } from "@/domain/settlement";
import {
  amountSchema,
  monthLabel,
  periodSchema,
  settlementAdjustmentsSchema,
} from "./model";
import { formatBudgetSek } from "@/lib/money";

export interface SettlementDraft {
  markupEnabled: boolean;
  markupType: "amount" | "percent";
  markup: string;
  inflationEnabled: boolean;
  inflation: string;
}

export function SettlementFields({
  amount,
  effectivePeriod,
  planningPeriod,
  nextDueOn,
  onDateChange,
  draft,
  onDraftChange,
}: {
  amount: string;
  effectivePeriod: string;
  planningPeriod: string;
  nextDueOn: string;
  onDateChange: (value: string) => void;
  draft: SettlementDraft;
  onDraftChange: (value: SettlementDraft) => void;
}) {
  const parsedAmount = amountSchema.safeParse(amount);
  const adjustments = settlementAdjustmentsSchema.safeParse({
    markupAmountInOre:
      draft.markupEnabled && draft.markupType === "amount"
        ? draft.markup
        : null,
    markupPercent:
      draft.markupEnabled && draft.markupType === "percent"
        ? draft.markup
        : null,
    inflationPercent: draft.inflationEnabled ? draft.inflation : null,
  });
  let forecast: ReturnType<typeof settlementForecast> | undefined;
  let error: string | undefined;
  if (
    parsedAmount.success &&
    parsedAmount.data > 0 &&
    adjustments.success &&
    periodSchema.safeParse(planningPeriod).success &&
    z.iso.date().safeParse(nextDueOn).success
  ) {
    try {
      forecast = settlementForecast(
        parsedAmount.data,
        `${planningPeriod}-01`,
        nextDueOn,
        adjustments.data,
      );
    } catch (caught) {
      error =
        caught instanceof Error
          ? caught.message
          : "Kontrollera beräkningsunderlaget.";
    }
  }
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="settlement-due">Nästa utgiftsdatum</Label>
        <Input
          id="settlement-due"
          name="nextDueOn"
          type="date"
          min={`${effectivePeriod}-01`}
          max="2199-12-31"
          required
          value={nextDueOn}
          onChange={(event) => onDateChange(event.target.value)}
        />
      </div>
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="markupEnabled"
            checked={draft.markupEnabled}
            onChange={(event) =>
              onDraftChange({ ...draft, markupEnabled: event.target.checked })
            }
            className="size-4 accent-primary"
          />
          Lägg till påslag
        </label>
        {draft.markupEnabled ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="settlement-markup-type">Typ av påslag</Label>
              <Select
                name="markupType"
                value={draft.markupType}
                onValueChange={(value) =>
                  onDraftChange({
                    ...draft,
                    markupType: value as SettlementDraft["markupType"],
                  })
                }
              >
                <SelectTrigger id="settlement-markup-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Procent</SelectItem>
                  <SelectItem value="amount">Kronor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settlement-markup">
                {draft.markupType === "percent" ? "Påslag (%)" : "Påslag (kr)"}
              </Label>
              <Input
                id="settlement-markup"
                name="markup"
                inputMode="decimal"
                required
                value={draft.markup}
                onChange={(event) =>
                  onDraftChange({ ...draft, markup: event.target.value })
                }
              />
            </div>
          </div>
        ) : null}
      </div>
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="inflationEnabled"
            checked={draft.inflationEnabled}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                inflationEnabled: event.target.checked,
              })
            }
            className="size-4 accent-primary"
          />
          Räkna med inflation
        </label>
        {draft.inflationEnabled ? (
          <div className="space-y-2">
            <Label htmlFor="settlement-inflation">Inflation per år (%)</Label>
            <Input
              id="settlement-inflation"
              name="inflation"
              inputMode="decimal"
              required
              value={draft.inflation}
              onChange={(event) =>
                onDraftChange({ ...draft, inflation: event.target.value })
              }
            />
          </div>
        ) : null}
      </div>
      <div
        className="space-y-2 rounded-lg bg-secondary/60 p-3 text-sm"
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">Plan för avräkningen</p>
          <InfoButton title="Så beräknas avräkningen">
            <p>
              Påslaget läggs till dagens kostnad. Därefter räknas årlig
              inflation med ränta på ränta: kostnad med påslag × (1 + inflation
              / 100) upphöjt till antal månader / 12.
            </p>
            <p>
              Beloppet delas över månaderna från planens start till månaden före
              utgiften, minst en månad. De sista överföringarna justeras för
              avrundning till öre.
            </p>
            <p>
              När utgiftsmånaden nås upphör avsättningen. Ange ett nytt datum
              för en ny plan. Kontosaldo och eventuell avkastning ingår inte i
              beräkningen.
            </p>
            <p>
              Om datumet behålls vid en ändring räknas planen fortfarande från
              dess ursprungliga startmånad.
            </p>
          </InfoButton>
        </div>
        {forecast ? (
          <>
            <p>
              Behövs vid nästa utgift:{" "}
              <output
                aria-label="Beräknat totalbelopp"
                className="font-semibold tabular-nums"
              >
                {formatBudgetSek(forecast.targetInOre)}
              </output>
            </p>
            <p>
              Att avsätta:{" "}
              <output
                aria-label="Beräknad månadsavsättning"
                className="font-semibold tabular-nums"
              >
                {formatBudgetSek(forecast.monthlyInOre)}
              </output>{" "}
              per månad
            </p>
            <p className="text-xs text-muted-foreground">
              Plan från {monthLabel(planningPeriod)} · {forecast.months}{" "}
              {forecast.months === 1 ? "månad" : "månader"}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">
            {error ??
              "Ange kostnad, datum och giltiga påslag för att se beräkningen."}
          </p>
        )}
      </div>
    </>
  );
}
