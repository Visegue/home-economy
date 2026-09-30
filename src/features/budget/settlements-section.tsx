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
import { MemberAvatarGroup } from "@/components/member-avatar-group";
import type { HouseholdPerson } from "@/features/households/member-appearance";
import { settlementForecast } from "@/domain/settlement";
import { formatBudgetSek } from "@/lib/money";
import { ExpenseDialog, RemoveExpenseDialog } from "./forms";
import type { MonthlyExpense } from "./model";

export function SettlementsSection({
  expenses,
  totalInOre,
  people,
  period,
}: {
  expenses: MonthlyExpense[];
  totalInOre: number;
  people: HouseholdPerson[];
  period: string;
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
            <Table aria-label="Planerade avräkningar">
              <TableHeader>
                <TableRow>
                  <TableHead>Avräkning</TableHead>
                  <TableHead className="text-right">Per månad</TableHead>
                  <TableHead>Ägare</TableHead>
                  <TableHead>Nästa utgift</TableHead>
                  <TableHead className="text-right">Kostnad i dag</TableHead>
                  <TableHead className="text-right">
                    Beräknat totalbelopp
                  </TableHead>
                  <ManagementOnly>
                    <TableHead>
                      <span className="sr-only">Åtgärder</span>
                    </TableHead>
                  </ManagementOnly>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => {
                  if (!expense.settlement || !expense.nextDueOn) return null;
                  const forecast = settlementForecast(
                    expense.amountInOre,
                    expense.settlement.startsOn,
                    expense.nextDueOn,
                    expense.settlement,
                  );
                  const contribution = expense.monthlyAmountInOre;
                  return (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">
                        {expense.name}
                        <span className="mt-1 block text-xs font-normal text-muted-foreground">
                          {expense.settlement.markupAmountInOre !== null
                            ? `Påslag ${formatBudgetSek(expense.settlement.markupAmountInOre)}`
                            : expense.settlement.markupPercent !== null
                              ? `Påslag ${expense.settlement.markupPercent.toLocaleString("sv-SE")} %`
                              : "Utan påslag"}
                        </span>
                        <span className="mt-1 block text-xs font-normal text-muted-foreground">
                          {expense.settlement.inflationPercent !== null
                            ? `Inflation ${expense.settlement.inflationPercent.toLocaleString("sv-SE")} % per år`
                            : "Utan inflation"}
                        </span>
                        {contribution === 0 ? (
                          <p className="mt-1 max-w-64 text-xs font-normal whitespace-normal text-muted-foreground">
                            Ingen månadsavsättning. Ange nästa utgiftsdatum för
                            en ny plan.
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatBudgetSek(contribution)}
                      </TableCell>
                      <TableCell>
                        {expense.owners.length ? (
                          <MemberAvatarGroup people={expense.owners} />
                        ) : (
                          <span className="text-muted-foreground">
                            Ingen vald
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{expense.nextDueOn}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBudgetSek(expense.amountInOre)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBudgetSek(forecast.targetInOre)}
                      </TableCell>
                      <ManagementOnly>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <ExpenseDialog
                              expense={expense}
                              people={people}
                              period={period}
                            />
                            <RemoveExpenseDialog
                              expense={expense}
                              period={period}
                            />
                          </div>
                        </TableCell>
                      </ManagementOnly>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>Totalt per månad</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBudgetSek(totalInOre)}
                  </TableCell>
                  <TableCell colSpan={4} />
                  <ManagementOnly>
                    <TableCell />
                  </ManagementOnly>
                </TableRow>
              </TableBody>
            </Table>
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
