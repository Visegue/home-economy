"use client";

import { validateOnboarding } from "@/features/forms/validation";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Form, FormSection, Input } from "@home-economy/ui/form";
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
    <Form
      action={formAction}
      validate={validateOnboarding}
      fieldErrors={{
        name: state.nameError,
        monthlyNetIncome: state.incomeError,
      }}
      pending={pending}
      error={
        state.error
          ? [
              state.error,
              state.errorReference ? `Referens: ${state.errorReference}` : "",
            ]
              .filter(Boolean)
              .join(" ")
          : undefined
      }
      className="space-y-5"
    >
      <FormSection title="Grunduppgifter" disabled={pending}>
        <div className="ui-field">
          <Label htmlFor="household-name">Namn på hushållet</Label>
          <Input
            id="household-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            autoComplete="organization"
            required
            disabled={pending}
          />
        </div>

        <IncomeField value={income} onChange={setIncome} disabled={pending} />
      </FormSection>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Skapar hushållet…" : "Skapa mitt hushåll"}
      </Button>
    </Form>
  );
}
