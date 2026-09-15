"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { IncomeField } from "@/features/income/income-field";
import { saveIncomeAction, type IncomeState } from "./actions";

const initialState: IncomeState = {};

export function IncomeForm({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [state, action, pending] = useActionState(
    saveIncomeAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-5">
      <IncomeField
        value={value}
        onChange={setValue}
        error={state.incomeError}
        disabled={pending}
      />
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Sparar…" : "Spara inkomst"}
        </Button>
        <output className="text-sm text-muted-foreground">
          {!pending && state.savedValue === value
            ? value.trim() === ""
              ? "Inkomsten är borttagen."
              : "Inkomsten är sparad."
            : ""}
        </output>
      </div>
    </form>
  );
}
