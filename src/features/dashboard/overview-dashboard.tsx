import Link from "next/link";
import { PiggyBank } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
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
import { ExpenseDialog, RemoveExpenseButton } from "@/features/budget/forms";
import { MonthNavigation } from "@/features/budget/month-navigation";
import { cycles, monthLabel, monthlySummary } from "@/features/budget/model";
import { formatBudgetSek } from "@/lib/money";
import { cn } from "@/lib/utils";

export async function OverviewDashboard({ period }: { period: string }) {
  const { people, expenses, incomes } = await getBudgetData();
  const summary = monthlySummary(period, expenses, incomes);
  const year = period.slice(0, 4);
  const hasIncome = summary.incomeInOre !== null;
  const deficit = summary.remainingInOre !== null && summary.remainingInOre < 0;
  const reserved = summary.expenses.filter(
    (expense) => expense.destination === "allocated",
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <MonthNavigation period={period} />
        <ExpenseDialog key={period} period={period} people={people} />
      </div>
      <section
        aria-label="Månadens nyckeltal"
        className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
      >
        <Card>
          <CardHeader>
            <CardTitle>Räcker inkomsten?</CardTitle>
            <CardDescription>
              Din månadsbudget för {monthLabel(period)}
            </CardDescription>
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
                    ? "Saknas för att täcka utgifterna"
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
                <p className="mt-1 text-sm text-muted-foreground">
                  Inga av hushållets inkomster gäller den här månaden. Inkomster
                  och deras giltighetsperioder hanteras i
                  hushållsinställningarna.
                </p>
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
            <CardDescription>
              För utgifter som betalas mer sällan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {formatBudgetSek(summary.allocatedInOre)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                / månad
              </span>
            </p>
            <p className="mt-3 max-w-prose text-sm text-muted-foreground">
              Varje kostnad fördelas över sitt betalningsintervall. Avsättningen
              ingår redan i månadens totala utgifter.
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
            <p className="mt-5 text-xs text-muted-foreground">
              Beräkningen tar inte hänsyn till befintligt saldo på kontot eller
              om första betalningen ligger nära.
            </p>
          </CardContent>
        </Card>
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Utgifter</CardTitle>
          <CardDescription>
            Gäller vald månad och återkommer varje månad. Ägare visar vilka som
            berörs; beloppet räknas en gång.
          </CardDescription>
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
                      <RemoveExpenseButton
                        id={expense.id}
                        name={expense.name}
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
              <p className="mt-2 text-sm text-muted-foreground">
                Börja med till exempel hyran eller en försäkring. Använd ”Lägg
                till utgift” ovan.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Månad för månad · {year}</CardTitle>
          <CardDescription>
            Hushållets aktiva inkomster jämförda med direkta utgifter och
            avsättningar.
          </CardDescription>
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
                <TableHead className="text-right">Kvar / underskott</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 12 }, (_, index) => {
                const rowPeriod = `${year}-${String(index + 1).padStart(2, "0")}`;
                const row = monthlySummary(rowPeriod, expenses, incomes);
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
