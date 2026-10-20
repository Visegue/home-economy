"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormSection, Input } from "@home-economy/ui/form";
import { Label } from "@/components/ui/label";
import type { DayDefaults } from "./fields";
import { saveDayDefaults } from "./settings-actions";
export function DayDefaultsForm({ days }: { days: DayDefaults }) {
  const [state, action, pending] = useActionState(saveDayDefaults, {});
  return (
    <Form
      action={action}
      pending={pending}
      error={state.error}
      className="space-y-4"
    >
      <p className="text-sm text-muted-foreground">
        Förifyllda dagar för nya poster. Befintliga poster behåller sina egna
        dagar.
      </p>
      <FormSection
        title="Förifyllda dagar"
        disabled={pending}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {(
          [
            ["incomeDay", "Inkomster"],
            ["directDay", "Direkta utgifter"],
            ["allocatedDay", "Avsatta utgifter"],
            ["replacementDay", "Avräkningar"],
            ["savingDay", "Sparande"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="ui-field">
            <Label htmlFor={`default-${key}`}>{label}</Label>
            <Input
              id={`default-${key}`}
              name={key}
              type="number"
              min={1}
              max={31}
              defaultValue={days[key]}
              required
            />
          </div>
        ))}
        <Button
          type="submit"
          className="h-auto min-h-11 max-w-full min-w-0 flex-wrap px-1 py-2 [overflow-wrap:anywhere] whitespace-normal"
        >
          <Save aria-hidden="true" />
          Spara standarddagar
        </Button>
      </FormSection>
      {state.success ? <output>{state.success}</output> : null}
    </Form>
  );
}
