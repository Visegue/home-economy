import { RefreshCw } from "lucide-react";
import { CollapsibleCard } from "@/components/collapsible-card";
import type { getMonthlyOverview } from "@/features/dashboard/monthly-overview";
import { OverviewTable } from "@/features/dashboard/overview-table";
import { ExpenseDialog } from "./forms";
import type { HouseholdPerson } from "@/features/households/members/model";
export function SettlementsSection({
  expenses,
  totalInOre,
  people,
  period,
  valueDate,
  recordedTotal,
}: {
  expenses: Awaited<
    ReturnType<typeof getMonthlyOverview>
  >["replacementReserves"];
  totalInOre: number;
  people: HouseholdPerson[];
  period: string;
  valueDate: string;
  recordedTotal: { valueInOre: number; hasMissingOpening: boolean };
}) {
  return (
    <section
      aria-label="Avräkningar"
      data-post-card="Avräkningar"
      tabIndex={-1}
    >
      <CollapsibleCard
        title="Avräkningar"
        icon={
          <RefreshCw
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        }
        actions={
          <>
            <ExpenseDialog
              period={period}
              people={people}
              defaultType="settlement"
            />
          </>
        }
      >
        {expenses.length ? (
          <OverviewTable
            label="Planerade avräkningar"
            period={period}
            valueDate={valueDate}
            totalInOre={totalInOre}
            recordedTotal={recordedTotal}
            rows={expenses.map((expense) => ({
              id: expense.id,
              name: expense.name,
              amountInOre: expense.monthlyAmountInOre,
              changed: !!(expense.changes.length || expense.ended),
              funding: expense.funding,
              postKey: `expense-${expense.id}`,
            }))}
          />
        ) : (
          <p className="py-4 text-sm text-muted-foreground">
            Inga avräkningar ännu.
          </p>
        )}
      </CollapsibleCard>
    </section>
  );
}
