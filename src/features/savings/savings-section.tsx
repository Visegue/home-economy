import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SavingDialog, RemoveSavingButton } from "./saving-form";
import {
  formatSavingsAmount,
  totalMonthlySavings,
  type Saving,
} from "./validation";

export function SavingsSection({ savings }: { savings: Saving[] }) {
  return (
    <section aria-label="Dina sparmål" className="mt-4">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Sparmål</CardTitle>
            <CardDescription>
              Planera hur mycket du vill spara varje månad.
            </CardDescription>
          </div>
          <SavingDialog />
        </CardHeader>
        <CardContent>
          {savings.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Du har inga sparmål ännu. Lägg till ditt första sparande för att
              börja planera.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {savings.map((saving) => (
                <li
                  key={saving.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="font-medium break-words">{saving.name}</p>
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {formatSavingsAmount(saving.amountInOre)} / månad
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <SavingDialog saving={saving} />
                    <RemoveSavingButton saving={saving} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary p-4 text-secondary-foreground">
            <div>
              <p className="font-medium">Att föra över till sparande</p>
              <p className="text-sm">Totalt varje månad</p>
            </div>
            <output
              aria-label="Totalt månadssparande"
              className="text-xl font-semibold tabular-nums"
            >
              {formatSavingsAmount(totalMonthlySavings(savings))}
            </output>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
