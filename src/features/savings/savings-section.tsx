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
import { formatBudgetSek } from "@/lib/money";
import { ChangeNotice } from "@/features/periods/change-notice";
import { dateLabel, versionBounds } from "@/features/periods/model";
import type { getMonthlyOverview } from "@/features/dashboard/monthly-overview";

export function SavingsSection({
  savings,
  totalInOre,
  period,
}: {
  savings: Awaited<ReturnType<typeof getMonthlyOverview>>["savings"];
  totalInOre: number;
  period: string;
}) {
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
                    <TableCell className="font-medium">
                      {saving.name}
                      <ChangeNotice item={saving} />
                      {saving.displayAmountInOre !== saving.amountInOre ? (
                        <p className="text-xs font-normal">
                          Värde vid månadsslut:{" "}
                          {formatBudgetSek(saving.displayAmountInOre)}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatBudgetSek(saving.amountInOre)}
                    </TableCell>
                    <TableCell>
                      {versionBounds(saving).start
                        ? dateLabel(versionBounds(saving).start!)
                        : "Sedan tidigare"}
                    </TableCell>
                    <TableCell>
                      {versionBounds(saving).end
                        ? dateLabel(versionBounds(saving).end!)
                        : "Tills vidare"}
                    </TableCell>
                    <ManagementOnly>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <SavingDialog
                            key={`${saving.id}-${period}`}
                            saving={{
                              ...saving,
                              amountInOre: saving.displayAmountInOre,
                            }}
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
                    {formatBudgetSek(totalInOre)}
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
