"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IncomeField } from "@/features/income/income-field";

import { createHouseholdAction, type OnboardingState } from "./actions";

const initialState: OnboardingState = {};

export function OnboardingForm() {
  const [name, setName] = useState("Mitt hushåll");
  const [income, setIncome] = useState("");
  const [state, formAction, pending] = useActionState(
    createHouseholdAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="household-name">Namn på hushållet</Label>
        <Input
          id="household-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          autoComplete="organization"
          required
          aria-describedby={state.error ? "household-error" : undefined}
          aria-invalid={Boolean(state.error)}
          disabled={pending}
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Du kan ändra namnet senare och bjuda in fler personer när den
          funktionen finns på plats.
        </p>
      </div>

      <IncomeField
        value={income}
        onChange={setIncome}
        error={state.incomeError}
        disabled={pending}
      />

      {state.error ? (
        <p
          id="household-error"
          role="alert"
          className="text-sm text-destructive"
        >
          {state.error}
          {state.errorReference ? (
            <span className="mt-1 block font-mono text-xs">
              Referens: {state.errorReference}
            </span>
          ) : null}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Skapar hushållet…" : "Skapa mitt hushåll"}
      </Button>
    </form>
  );
}
