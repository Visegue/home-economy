import {
  CardManagement,
  CardManagementButton,
  ManagementOnly,
} from "@/components/card-management";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SavingDialog, RemoveSavingDialog } from "./saving-form";
import { formatSavingsAmount, type Saving } from "./validation";
import { isActiveInPeriod, monthLabel } from "@/features/budget/model";

export function SavingsSection({
  savings: allSavings,
  period,
}: {
  savings: Saving[];
  period: string;
}) {
  const savings = allSavings.filter((saving) =>
    isActiveInPeriod(period, saving),
  );
  return (
    <section aria-label="Dina sparmål" className="mt-4">
      <CardManagement key={period} hasItems={savings.length > 0}>
        <Card>
          <CardHeader>
            <CardTitle>Sparmål</CardTitle>
            <CardAction className="flex items-center gap-2">
              {savings.length ? <CardManagementButton label="sparmål" /> : null}
              <SavingDialog key={period} period={period} />
            </CardAction>
          </CardHeader>
          <CardContent>
            {savings.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Inga sparmål ännu.
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
                      <p className="text-xs text-muted-foreground">
                        {saving.startsOn
                          ? `Från ${monthLabel(saving.startsOn)}`
                          : "Sedan tidigare"}
                        {saving.endsOn
                          ? ` till ${monthLabel(saving.endsOn)}`
                          : " · tills vidare"}
                      </p>
                    </div>
                    <ManagementOnly>
                      <div className="flex items-center gap-2">
                        <SavingDialog
                          key={`${saving.id}-${period}`}
                          saving={saving}
                          period={period}
                        />
                        <RemoveSavingDialog
                          key={`remove-${saving.id}-${period}`}
                          saving={saving}
                          period={period}
                        />
                      </div>
                    </ManagementOnly>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </CardManagement>
    </section>
  );
}
