import {
  CardManagement,
  CardManagementButton,
} from "@/components/card-management";
import { CollapsibleCard } from "@/components/collapsible-card";
import type { getMonthlyOverview } from "@/features/dashboard/monthly-overview";
import { OverviewTable } from "@/features/dashboard/overview-table";
import { PostDetails } from "@/features/dashboard/post-details";
import { ExpenseDialog, RemoveExpenseDialog } from "./forms";
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
    <section aria-label="Avräkningar">
      <CardManagement key={period} hasItems={expenses.length > 0}>
        <CollapsibleCard
          title="Avräkningar"
          actions={
            <>
              {expenses.length ? (
                <CardManagementButton label="avräkningar" />
              ) : null}
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
                details: (
                  <PostDetails
                    item={expense}
                    source="expense"
                    period={period}
                    valueDate={valueDate}
                  />
                ),
                actions: (
                  <>
                    <ExpenseDialog
                      expense={expense}
                      people={people}
                      period={period}
                    />
                    <RemoveExpenseDialog expense={expense} period={period} />
                  </>
                ),
              }))}
            />
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              Inga avräkningar ännu.
            </p>
          )}
        </CollapsibleCard>
      </CardManagement>
    </section>
  );
}
