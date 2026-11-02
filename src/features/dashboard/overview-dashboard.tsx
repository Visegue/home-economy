import { DepositBatchDialog } from "@/features/funding/batch-form";
import { getFundingData } from "@/features/funding/data";
import {
  ArrowRightLeft,
  ReceiptText,
  CalendarClock,
  Scale,
} from "lucide-react";
import { CollapsibleCard } from "@/components/collapsible-card";
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
import { OverviewToolbar } from "./overview-toolbar";
import {
  NavigationPage,
  NavigationSurface,
  NavigationLink,
} from "@/components/navigation";

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
  const funding = await getFundingData(period);
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
          : expense.destination === "direct"
            ? ("Direkta utgifter" as const)
            : ("Avsatta utgifter" as const),
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
    <NavigationPage pathname="/" month={period}>
      <DayDefaultsProvider days={household}>
        <PostManagement posts={posts} period={period} people={people}>
          <div className="space-y-6">
            <OverviewToolbar
              period={period}
              people={people}
              deposits={
                <DepositBatchDialog
                  key={period}
                  period={period}
                  purposes={funding.purposes.map(
                    ({
                      source,
                      id,
                      itemId,
                      versions,
                      inMonthlyPlan,
                      progress,
                    }) => ({
                      source,
                      id,
                      itemId,
                      versions,
                      inMonthlyPlan,
                      progress,
                    }),
                  )}
                />
              }
            />
            <NavigationSurface monthly>
              <h2 className="mb-4 text-lg font-semibold">
                {monthLabel(period)}
              </h2>
              <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
                {incomes.some((i) => i.changes.length || i.ended) ? (
                  <div className="lg:col-span-2">
                    {incomes.map((i) => (
                      <div key={i.id}>
                        <span className="text-sm">{i.name}</span>
                        <ChangeNotice item={i} />
                      </div>
                    ))}
                  </div>
                ) : null}
                <section aria-label="Att föra över" className="lg:col-span-2">
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
                          {formatBudgetSek(
                            summary.replacementContributionsInOre,
                          )}
                        </dd>
                      </div>
                      {savings.map((saving) => (
                        <div
                          key={saving.id}
                          className="flex justify-between gap-4"
                        >
                          <dt className="min-w-0 break-words">{saving.name}</dt>
                          <dd className="shrink-0 tabular-nums">
                            {formatBudgetSek(saving.amountInOre)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-5 border-t pt-4">
                      <p className="text-sm font-medium">
                        Totalt att föra över
                      </p>
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
                  className="grid min-w-0 grid-cols-1 gap-6 lg:col-span-2 lg:grid-cols-2"
                >
                  {[
                    {
                      label: "Direkta utgifter",
                      rows: directExpenses,
                      total: summary.directExpensesInOre,
                      recorded: undefined,
                      icon: ReceiptText,
                    },
                    {
                      label: "Avsatta utgifter",
                      rows: allocatedExpenses,
                      total: summary.monthlyAllocationsInOre,
                      recorded: recordedTotals.allocated,
                      icon: CalendarClock,
                    },
                  ].map(({ icon: Icon, ...group }) => (
                    <section
                      key={group.label}
                      aria-label={group.label}
                      data-post-card={group.label}
                      tabIndex={-1}
                    >
                      <CollapsibleCard
                        title={group.label}
                        icon={
                          <Icon
                            className="size-5 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                        }
                      >
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
                          <p className="py-4 text-sm text-muted-foreground">
                            Inga {group.label.toLocaleLowerCase("sv-SE")} för
                            den här månaden. Använd Lägg till högst upp.
                          </p>
                        )}
                      </CollapsibleCard>
                    </section>
                  ))}
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
                <section
                  aria-label="Månadens nyckeltal"
                  className="lg:col-span-2"
                >
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
                          {formatBudgetSek(
                            summary.replacementContributionsInOre,
                          )}
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
                          {formatBudgetSek(
                            Math.abs(summary.monthlyRemainderInOre),
                          )}
                        </p>
                      ) : (
                        <NavigationLink
                          href="/settings#incomes"
                          className="mt-2 inline-block text-sm text-primary underline underline-offset-4"
                        >
                          Hantera inkomster
                        </NavigationLink>
                      )}
                    </div>
                  </CollapsibleCard>
                </section>
              </div>
            </NavigationSurface>
          </div>
        </PostManagement>
      </DayDefaultsProvider>
    </NavigationPage>
  );
}
