import {
  CardManagement,
  CardManagementButton,
  ManagementOnly,
} from "@/components/card-management";
import { CollapsibleCard } from "@/components/collapsible-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SavingDialog, RemoveSavingDialog } from "./saving-form";
import { totalMonthlySavings, type Saving } from "./validation";
import { isActiveInPeriod, monthLabel } from "@/features/budget/model";
import { formatBudgetSek } from "@/lib/money";

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
    <section aria-label="Spara" className="mt-4">
      <CardManagement key={period} hasItems={savings.length > 0}>
        <CollapsibleCard
          title="Spara"
          actions={
            <>
              {savings.length ? (
                <CardManagementButton label="sparande" />
              ) : null}
              <SavingDialog key={period} period={period} />
            </>
          }
        >
          {savings.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Inget sparande ännu.
            </p>
          ) : (
            <Table aria-label="Månadssparande">
              <TableHeader>
                <TableRow>
                  <TableHead>Sparande</TableHead>
                  <TableHead className="text-right">Per månad</TableHead>
                  <TableHead>Från och med</TableHead>
                  <TableHead>Till och med</TableHead>
                  <ManagementOnly>
                    <TableHead>
                      <span className="sr-only">Åtgärder</span>
                    </TableHead>
                  </ManagementOnly>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savings.map((saving) => (
                  <TableRow key={saving.id}>
                    <TableCell className="font-medium">{saving.name}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatBudgetSek(saving.amountInOre)}
                    </TableCell>
                    <TableCell>
                      {saving.startsOn
                        ? monthLabel(saving.startsOn)
                        : "Sedan tidigare"}
                    </TableCell>
                    <TableCell>
                      {saving.endsOn
                        ? monthLabel(saving.endsOn)
                        : "Tills vidare"}
                    </TableCell>
                    <ManagementOnly>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
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
                      </TableCell>
                    </ManagementOnly>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>Totalt per månad</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBudgetSek(totalMonthlySavings(savings, period))}
                  </TableCell>
                  <TableCell colSpan={2} />
                  <ManagementOnly>
                    <TableCell />
                  </ManagementOnly>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CollapsibleCard>
      </CardManagement>
    </section>
  );
}
