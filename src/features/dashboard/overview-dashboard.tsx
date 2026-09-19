import Link from "next/link";
import { PiggyBank } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { monthlyEquivalent } from "@/domain/budget";
import { getBudgetData } from "@/features/budget/data";
import { ExpenseDialog, RemoveExpenseButton } from "@/features/budget/forms";
import { MonthNavigation } from "@/features/budget/month-navigation";
import { cycles, monthLabel, monthlySummary } from "@/features/budget/model";
import { formatBudgetSek } from "@/lib/money";
import { cn } from "@/lib/utils";
import { getSavings } from "@/features/savings/data";
import { SavingsSection } from "@/features/savings/savings-section";
import { totalMonthlySavings } from "@/features/savings/validation";

export async function OverviewDashboard({ period }: { period: string }) {
  const [{ people, expenses, incomes }, savings] = await Promise.all([
    getBudgetData(),
    getSavings(),
  ]);
  const savingsInOre = totalMonthlySavings(savings, period);
  const summary = monthlySummary(period, expenses, incomes, savingsInOre);
  const year = period.slice(0, 4);
  const hasIncome = summary.incomeInOre !== null;
  const deficit = summary.remainingInOre !== null && summary.remainingInOre < 0;
  const reserved = summary.expenses.filter(
    (expense) => expense.destination === "allocated",
  );
  return (
    <div className="space-y-6">
      <MonthNavigation period={period} />
      <section
        aria-label="Månadens nyckeltal"
        className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
      >
        <Card>
          <CardHeader>
            <CardTitle>Räcker inkomsten?</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt>Inkomster</dt>
                <dd className="font-medium tabular-nums">
                  {hasIncome
                    ? formatBudgetSek(summary.incomeInOre!)
                    : "Ingen aktiv inkomst"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Direkta utgifter</dt>
                <dd className="tabular-nums">
                  {formatBudgetSek(summary.directInOre)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Avsatta utgifter</dt>
                <dd className="tabular-nums">
                  {formatBudgetSek(summary.allocatedInOre)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t pt-3 font-semibold">
                <dt>Utgifter totalt per månad</dt>
                <dd className="tabular-nums">
                  {formatBudgetSek(summary.totalInOre)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Sparande per månad</dt>
                <dd className="tabular-nums">
                  {formatBudgetSek(summary.savingsInOre)}
                </dd>
              </div>
            </dl>
            <div
              className={cn(
                "mt-5 rounded-xl p-4",
                !hasIncome
                  ? "bg-muted"
                  : deficit
                    ? "bg-destructive/10"
                    : "bg-accent/60",
              )}
            >
              <p className="text-sm font-medium">
                {!hasIncome
                  ? "Ingen aktiv inkomst"
                  : deficit
                    ? savingsInOre > 0
                      ? "Saknas för att täcka utgifter och sparande"
                      : "Saknas för att täcka utgifterna"
                    : savingsInOre > 0
                      ? "Kvar efter utgifter och sparande"
                      : "Kvar efter utgifter"}
              </p>
              {summary.remainingInOre !== null ? (
                <p
                  className={cn(
                    "mt-1 text-3xl font-semibold tracking-tight tabular-nums",
                    deficit && "text-destructive",
                  )}
                >
                  {formatBudgetSek(Math.abs(summary.remainingInOre))}
                </p>
              ) : (
                <Link
                  href="/settings#incomes"
                  className="mt-2 inline-block text-sm text-primary underline underline-offset-4"
                >
                  Hantera inkomster
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/35">
          <CardHeader>
            <PiggyBank
              className="mb-1 size-6 text-secondary-foreground"
              aria-hidden="true"
            />
            <CardTitle>Att föra över till avsättningskontot</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {formatBudgetSek(summary.allocatedInOre)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                / månad
              </span>
            </p>

            {reserved.length ? (
              <ul className="mt-5 space-y-2 text-sm">
                {reserved.map((expense) => (
                  <li key={expense.id} className="flex justify-between gap-4">
                    <span>{expense.name}</span>
                    <span className="shrink-0 tabular-nums">
                      {formatBudgetSek(monthlyEquivalent(expense))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 text-sm text-muted-foreground">
                Inga avsatta utgifter ännu.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
      <SavingsSection savings={savings} period={period} />
      <Card>
        <CardHeader>
          <CardTitle>Utgifter</CardTitle>
          <CardAction>
            <ExpenseDialog key={period} period={period} people={people} />
          </CardAction>
        </CardHeader>
        <CardContent>
          {summary.expenses.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utgift</TableHead>
                  <TableHead className="text-right">Per månad</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Ägare</TableHead>
                  <TableHead>Nästa betalning</TableHead>
                  <TableHead className="text-right">Per betalning</TableHead>
                  <TableHead>
                    <span className="sr-only">Åtgärder</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">
                      {expense.name}
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {expense.destination === "direct"
                          ? "Varje månad"
                          : (cycles.find(
                              (cycle) =>
                                cycle.months ===
                                expense.every *
                                  (expense.unit === "year" ? 12 : 1),
                            )?.label ??
                            `Var ${expense.every}:e ${expense.unit === "week" ? "vecka" : "månad"}`)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatBudgetSek(monthlyEquivalent(expense))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          expense.destination === "allocated"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {expense.destination === "allocated"
                          ? "Avsatt"
                          : "Direkt"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-44 whitespace-normal">
                      {expense.owners.map((owner) => owner.name).join(", ") || (
                        <span className="text-muted-foreground">
                          Ingen vald
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{expense.nextDueOn ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBudgetSek(expense.amountInOre)}
                    </TableCell>
                    <TableCell>
                      <ExpenseDialog
                        key={`${expense.id}-${period}`}
                        expense={expense}
                        period={period}
                        people={people}
                      />
                      <RemoveExpenseButton
                        key={`end-${expense.id}-${period}`}
                        id={expense.id}
                        name={expense.name}
                        period={period}
                        startsOn={expense.startsOn}
                        endsOn={expense.endsOn}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>Totalt per månad</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBudgetSek(summary.totalInOre)}
                  </TableCell>
                  <TableCell colSpan={5} />
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center">
              <p className="font-medium">Inga utgifter för den här månaden</p>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Månad för månad · {year}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Månad</TableHead>
                <TableHead className="text-right">Inkomster</TableHead>
                <TableHead className="text-right">Direkta</TableHead>
                <TableHead className="text-right">Avsatta</TableHead>
                <TableHead className="text-right">Utgifter totalt</TableHead>
                <TableHead className="text-right">Sparande</TableHead>
                <TableHead className="text-right">Kvar / underskott</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 12 }, (_, index) => {
                const rowPeriod = `${year}-${String(index + 1).padStart(2, "0")}`;
                const row = monthlySummary(
                  rowPeriod,
                  expenses,
                  incomes,
                  totalMonthlySavings(savings, rowPeriod),
                );
                return (
                  <TableRow
                    key={rowPeriod}
                    className={cn(rowPeriod === period && "bg-primary/5")}
                  >
                    <TableCell>
                      <Link
                        href={`/?month=${rowPeriod}`}
                        aria-current={rowPeriod === period ? "date" : undefined}
                        className="font-medium text-primary capitalize underline-offset-4 hover:underline"
                      >
                        {monthLabel(rowPeriod).split(" ")[0]}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.incomeInOre === null
                        ? "—"
                        : formatBudgetSek(row.incomeInOre)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBudgetSek(row.directInOre)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBudgetSek(row.allocatedInOre)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBudgetSek(row.totalInOre)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBudgetSek(row.savingsInOre)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium tabular-nums",
                        row.remainingInOre !== null &&
                          row.remainingInOre < 0 &&
                          "text-destructive",
                      )}
                    >
                      {row.remainingInOre === null
                        ? "—"
                        : formatBudgetSek(row.remainingInOre)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Button variant="link" asChild>
        <Link href="/settings">Hushållets medlemmar och inkomster</Link>
      </Button>
    </div>
  );
}
