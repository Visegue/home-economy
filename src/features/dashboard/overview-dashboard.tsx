import Link from "next/link";
import { ArrowRightLeft, ReceiptText, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollapsibleCard } from "@/components/collapsible-card";
import { ExpenseDialog } from "@/features/budget/forms";
import { monthLabel } from "@/features/budget/model";
import { formatBudgetSek } from "@/lib/money";
import { cn } from "@/lib/utils";
import { SavingsSection } from "@/features/savings/savings-section";
import { getMonthlyOverview } from "./monthly-overview";
import { SettlementsSection } from "@/features/budget/settlements-section";
import { OverviewTable } from "./overview-table";
import { PostDetails } from "./post-details";
import { PostManagement, type ManagedPost } from "./post-management";
import { DayDefaultsProvider } from "@/features/periods/fields";
import { ChangeNotice } from "@/features/periods/change-notice";
import { MonthSelector } from "./month-selector";

export async function OverviewDashboard({ period }: { period: string }) {
  const {
    household,
    incomes,
    people,
    regularExpenses,
    directExpenses,
    allocatedExpenses,
    valueDate,
    recordedTotals,
    replacementReserves,
    savings,
    totals: summary,
  } = await getMonthlyOverview(period);
  const savingsInOre = summary.savingsContributionsInOre;
  const hasIncome = summary.incomeInOre !== null;
  const deficit =
    summary.monthlyRemainderInOre !== null && summary.monthlyRemainderInOre < 0;
  const posts: ManagedPost[] = [
    ...[...regularExpenses, ...replacementReserves].map((expense) => ({
      key: `expense-${expense.id}`,
      card:
        expense.destination === "settlement"
          ? ("Avräkningar" as const)
          : ("Utgifter" as const),
      source: "expense" as const,
      item: (({
        funding: _funding,
        changes: _changes,
        ended: _ended,
        monthlyAmountInOre: _monthlyAmountInOre,
        contributionDestination: _contributionDestination,
        ...item
      }) => item)(expense),
      details: (
        <PostDetails
          item={expense}
          source="expense"
          period={period}
          valueDate={valueDate}
        />
      ),
    })),
    ...savings.map((saving) => ({
      key: `saving-${saving.id}`,
      card: "Spara" as const,
      source: "saving" as const,
      item: (({
        funding: _funding,
        changes: _changes,
        ended: _ended,
        displayAmountInOre,
        ...item
      }) => ({
        ...item,
        amountInOre: displayAmountInOre,
      }))(saving),
      details: (
        <PostDetails
          item={saving}
          source="saving"
          period={period}
          valueDate={valueDate}
        />
      ),
    })),
  ];
  return (
    <DayDefaultsProvider days={household}>
      <PostManagement posts={posts} period={period} people={people}>
        <div className="space-y-6">
          <MonthSelector period={period} />
          <nav
            aria-label="Ekonomihantering"
            className="flex flex-wrap gap-4 text-sm"
          >
            <Link className="underline" href={`/transfers?month=${period}`}>
              Överföringar och värden
            </Link>
            <Link className="underline" href="/history">
              Historik och kommande ändringar
            </Link>
          </nav>
          {incomes.some((i) => i.changes.length || i.ended) ? (
            <div>
              {incomes.map((i) => (
                <div key={i.id}>
                  <span className="text-sm">{i.name}</span>
                  <ChangeNotice item={i} />
                </div>
              ))}
            </div>
          ) : null}
          <section aria-label="Att föra över">
            <CollapsibleCard
              title="Att föra över"
              description={monthLabel(period)}
              className="bg-secondary/35"
              icon={
                <ArrowRightLeft
                  className="size-5 shrink-0 text-secondary-foreground"
                  aria-hidden="true"
                />
              }
            >
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>Avsatta utgifter</dt>
                  <dd className="shrink-0 tabular-nums">
                    {formatBudgetSek(summary.monthlyAllocationsInOre)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Avräkningar</dt>
                  <dd className="shrink-0 tabular-nums">
                    {formatBudgetSek(summary.replacementContributionsInOre)}
                  </dd>
                </div>
                {savings.map((saving) => (
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
                  {formatBudgetSek(summary.transfersInOre)}
                </output>
              </div>
            </CollapsibleCard>
          </section>

          <section
            aria-label="Utgifter"
            data-post-card="Utgifter"
            tabIndex={-1}
          >
            <CollapsibleCard
              title="Utgifter"
              icon={
                <ReceiptText
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              }
              actions={
                <>
                  <ExpenseDialog key={period} period={period} people={people} />
                </>
              }
            >
              {!regularExpenses.length ? (
                <p className="py-8 text-center font-medium">
                  Inga utgifter för den här månaden
                </p>
              ) : null}
              {regularExpenses.length ? (
                <div className="space-y-6">
                  {[
                    {
                      label: "Direkta utgifter",
                      rows: directExpenses,
                      total: summary.directExpensesInOre,
                      recorded: undefined,
                    },
                    {
                      label: "Avsatta utgifter",
                      rows: allocatedExpenses,
                      total: summary.monthlyAllocationsInOre,
                      recorded: recordedTotals.allocated,
                    },
                  ].map((group) => (
                    <section key={group.label} aria-label={group.label}>
                      <h3 className="mb-3 font-semibold">{group.label}</h3>
                      {group.rows.length ? (
                        <OverviewTable
                          label={group.label}
                          period={period}
                          valueDate={valueDate}
                          totalInOre={group.total}
                          recordedTotal={group.recorded}
                          rows={group.rows.map((expense) => ({
                            id: expense.id,
                            name: expense.name,
                            amountInOre: expense.monthlyAmountInOre,
                            changed: !!(
                              expense.changes.length || expense.ended
                            ),
                            funding: expense.funding,
                            postKey: `expense-${expense.id}`,
                          }))}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Inga {group.label.toLocaleLowerCase("sv-SE")} för den
                          här månaden.
                        </p>
                      )}
                    </section>
                  ))}
                </div>
              ) : null}
            </CollapsibleCard>
          </section>
          <SettlementsSection
            expenses={replacementReserves}
            valueDate={valueDate}
            recordedTotal={recordedTotals.replacements}
            totalInOre={summary.replacementContributionsInOre}
            people={people}
            period={period}
          />
          <SavingsSection
            savings={savings}
            valueDate={valueDate}
            recordedTotal={recordedTotals.savings}
            totalInOre={summary.savingsContributionsInOre}
            period={period}
          />
          <section aria-label="Månadens nyckeltal">
            <CollapsibleCard
              title="Räcker inkomsten?"
              icon={
                <Scale
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              }
            >
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
                    {formatBudgetSek(summary.directExpensesInOre)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Avsatta utgifter</dt>
                  <dd className="tabular-nums">
                    {formatBudgetSek(summary.monthlyAllocationsInOre)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Avräkningar</dt>
                  <dd className="tabular-nums">
                    {formatBudgetSek(summary.replacementContributionsInOre)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t pt-3 font-semibold">
                  <dt>Utgifter totalt per månad</dt>
                  <dd className="tabular-nums">
                    {formatBudgetSek(summary.expensesInOre)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Sparande per månad</dt>
                  <dd className="tabular-nums">
                    {formatBudgetSek(summary.savingsContributionsInOre)}
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
                {summary.monthlyRemainderInOre !== null ? (
                  <p
                    className={cn(
                      "mt-1 text-3xl font-semibold tracking-tight tabular-nums",
                      deficit && "text-destructive",
                    )}
                  >
                    {formatBudgetSek(Math.abs(summary.monthlyRemainderInOre))}
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
            </CollapsibleCard>
          </section>
          <Button variant="link" asChild>
            <Link href="/settings">Hushållets medlemmar och inkomster</Link>
          </Button>
        </div>
      </PostManagement>
    </DayDefaultsProvider>
  );
}
