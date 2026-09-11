"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createHouseholdAction, type OnboardingState } from "./actions";

const initialState: OnboardingState = {};

export function OnboardingForm() {
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
          defaultValue="Mitt hushåll"
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

      {state.error ? (
        <p
          id="household-error"
          role="alert"
          className="text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Skapar hushållet…" : "Skapa mitt hushåll"}
      </Button>
    </form>
  );
}
