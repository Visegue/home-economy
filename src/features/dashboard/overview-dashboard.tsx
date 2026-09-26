import { MemberAvatarGroup } from "@/components/member-avatar-group";
import {
  CardManagement,
  CardManagementButton,
  ManagementOnly,
} from "@/components/card-management";
import Link from "next/link";
import { PiggyBank } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
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
import { ExpenseDialog, RemoveExpenseDialog } from "@/features/budget/forms";
import {
  cycles,
  monthlySummary,
  isActiveInPeriod,
  monthLabel,
} from "@/features/budget/model";
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
  const hasIncome = summary.incomeInOre !== null;
  const deficit = summary.remainingInOre !== null && summary.remainingInOre < 0;
  const activeSavings = savings.filter((saving) =>
    isActiveInPeriod(period, saving),
  );
  return (
    <div className="space-y-6">
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
        <section aria-label="Att föra över">
          <Card className="h-full bg-secondary/35">
            <CardHeader>
              <PiggyBank
                className="mb-1 size-6 text-secondary-foreground"
                aria-hidden="true"
              />
              <CardTitle>Att föra över</CardTitle>
              <CardDescription>{monthLabel(period)}</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>Avsättningskonto</dt>
                  <dd className="shrink-0 tabular-nums">
                    {formatBudgetSek(summary.allocatedInOre)}
                  </dd>
                </div>
                {activeSavings.map((saving) => (
                  <div key={saving.id} className="flex justify-between gap-4">
                    <dt className="min-w-0 break-words">{saving.name}</dt>
                    <dd className="shrink-0 tabular-nums">
                      {formatBudgetSek(saving.amountInOre)}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 border-t pt-4">
                <p className="text-sm font-medium">Totalt att föra över</p>
                <output
                  aria-label="Totalt att föra över"
                  className="mt-1 block text-3xl font-semibold tracking-tight tabular-nums"
                >
                  {formatBudgetSek(summary.allocatedInOre + savingsInOre)}
                </output>
              </div>
            </CardContent>
          </Card>
        </section>
      </section>
      <CardManagement key={period} hasItems={summary.expenses.length > 0}>
        <Card>
          <CardHeader>
            <CardTitle>Utgifter</CardTitle>
            <CardAction className="flex items-center gap-2">
              {summary.expenses.length ? (
                <CardManagementButton label="utgifter" />
              ) : null}
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
                    <ManagementOnly>
                      <TableHead>
                        <span className="sr-only">Åtgärder</span>
                      </TableHead>
                    </ManagementOnly>
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
                      <TableCell>
                        {expense.owners.length ? (
                          <MemberAvatarGroup people={expense.owners} />
                        ) : (
                          <span className="text-muted-foreground">
                            Ingen vald
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{expense.nextDueOn ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBudgetSek(expense.amountInOre)}
                      </TableCell>
                      <ManagementOnly>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <ExpenseDialog
                              key={`${expense.id}-${period}`}
                              expense={expense}
                              period={period}
                              people={people}
                            />
                            <RemoveExpenseDialog
                              key={`remove-${expense.id}-${period}`}
                              expense={expense}
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
                      {formatBudgetSek(summary.totalInOre)}
                    </TableCell>
                    <TableCell colSpan={4} />
                    <ManagementOnly>
                      <TableCell />
                    </ManagementOnly>
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
      </CardManagement>
      <SavingsSection savings={savings} period={period} />
      <Button variant="link" asChild>
        <Link href="/settings">Hushållets medlemmar och inkomster</Link>
      </Button>
    </div>
  );
}
