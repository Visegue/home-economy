"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DayDefaults } from "./fields";
import { saveDayDefaults } from "./settings-actions";
export function DayDefaultsForm({ days }: { days: DayDefaults }) {
  const [state, action, pending] = useActionState(saveDayDefaults, {});
  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Förifyllda dagar för nya poster. Befintliga poster behåller sina egna
        dagar.
      </p>
      <fieldset disabled={pending} className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["incomeDay", "Inkomster"],
            ["directDay", "Direkta utgifter"],
            ["allocatedDay", "Avsatta utgifter"],
            ["replacementDay", "Avräkningar"],
            ["savingDay", "Sparande"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
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
        <Button type="submit">Spara standarddagar</Button>
      </fieldset>
      {state.error ? <p role="alert">{state.error}</p> : null}
      {state.success ? <output>{state.success}</output> : null}
    </form>
  );
}
