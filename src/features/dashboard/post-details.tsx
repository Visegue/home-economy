import Link from "next/link";
import type { ReactNode } from "react";
import { MemberAvatarGroup } from "@/components/member-avatar-group";
import { ChangeNotice } from "@/features/periods/change-notice";
import { dateLabel, versionBounds } from "@/features/periods/model";
import { monthLabel, cycles } from "@/features/budget/model";
import { settlementForecast } from "@/domain/settlement";
import { formatBudgetSek } from "@/lib/money";
import type { getMonthlyOverview } from "./monthly-overview";
import { RecordedValue } from "./overview-table";

type Overview = Awaited<ReturnType<typeof getMonthlyOverview>>;
type Expense = Overview["expenses"][number];
type Saving = Overview["savings"][number];
function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{children}</dd>
    </div>
  );
}
export function PostDetails({
  item,
  source,
  period,
  valueDate,
}: {
  item: Expense | Saving;
  source: "expense" | "saving";
  period: string;
  valueDate: string;
}) {
  const bounds = versionBounds(item);
  const expense = "monthlyAmountInOre" in item ? item : null;
  const earmarked = !expense || expense.contributionDestination !== "direct";
  const forecast =
    expense?.settlement && expense.nextDueOn
      ? settlementForecast(
          expense.amountInOre,
          expense.settlement.startsOn,
          expense.nextDueOn,
          expense.settlement,
        )
      : null;
  const { funding } = item;
  return (
    <div className="space-y-6">
      <ChangeNotice item={item} />
      <dl className="grid gap-4 sm:grid-cols-2">
        <Detail label="Från och med">
          {bounds.start ? dateLabel(bounds.start) : "Sedan tidigare"}
        </Detail>
        <Detail label="Till och med">
          {bounds.end ? dateLabel(bounds.end) : "Tills vidare"}
        </Detail>
        {expense ? (
          <>
            <Detail label="Ägare">
              {expense.owners.length ? (
                <MemberAvatarGroup people={expense.owners} />
              ) : (
                "Ingen vald"
              )}
            </Detail>
            <Detail label="Typ vid månadsslut">
              {expense.destination === "direct"
                ? "Direkt"
                : expense.destination === "allocated"
                  ? "Avsatt utgift"
                  : "Avräkning"}
            </Detail>
            <Detail label="Betalningsintervall">
              {expense.destination === "direct"
                ? "Varje månad"
                : (cycles.find(
                    (c) =>
                      c.months ===
                      expense.every * (expense.unit === "year" ? 12 : 1),
                  )?.label ??
                  `Var ${expense.every}:e ${expense.unit === "week" ? "vecka" : "månad"}`)}
            </Detail>
            <Detail
              label={expense.settlement ? "Nästa utgift" : "Nästa betalning"}
            >
              {expense.nextDueOn ?? "—"}
            </Detail>
            <Detail
              label={expense.settlement ? "Kostnad i dag" : "Per betalning"}
            >
              {formatBudgetSek(expense.amountInOre)}
            </Detail>
            {expense.settlement ? (
              <>
                <Detail label="Beräknat totalbelopp">
                  {forecast ? formatBudgetSek(forecast.targetInOre) : "—"}
                </Detail>
                <Detail label="Påslag">
                  {expense.settlement.markupAmountInOre !== null
                    ? `Påslag ${formatBudgetSek(expense.settlement.markupAmountInOre)}`
                    : expense.settlement.markupPercent !== null
                      ? `Påslag ${expense.settlement.markupPercent.toLocaleString("sv-SE")} %`
                      : "Utan påslag"}
                </Detail>
                <Detail label="Inflation">
                  {expense.settlement.inflationPercent !== null
                    ? `Inflation ${expense.settlement.inflationPercent.toLocaleString("sv-SE")} % per år`
                    : "Utan inflation"}
                </Detail>
              </>
            ) : null}
          </>
        ) : (
          <Detail label="Månadsbelopp vid månadsslut">
            {formatBudgetSek((item as Saving).displayAmountInOre)}
          </Detail>
        )}
        <Detail label="Planerad dag vid månadsslut">
          {item.scheduledDay
            ? `Dag ${item.scheduledDay} i månaden`
            : "Ingen vald"}
        </Detail>
      </dl>
      {expense?.contributionDestination === "settlement" &&
      !expense.settlement ? (
        <p>Månadens avsättning gäller en tidigare avräkningsversion.</p>
      ) : null}
      {expense?.contributionDestination === "settlement" &&
      expense.monthlyAmountInOre === 0 ? (
        <p>Ingen månadsavsättning. Ange nästa utgiftsdatum för en ny plan.</p>
      ) : null}
      {earmarked ? (
        <>
          <section
            aria-label="Månadens planuppföljning"
            className="space-y-4 border-t pt-4"
          >
            <h3 className="font-semibold">{monthLabel(period)}</h3>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label={`Totalt undansparat ${dateLabel(valueDate)}`}>
                <RecordedValue {...funding} />
              </Detail>
              <Detail label="Planerat för månaden">
                {formatBudgetSek(funding.progress.plannedInOre)}
              </Detail>
              <Detail label="Insatt för månaden">
                {formatBudgetSek(funding.progress.depositedInOre)}
              </Detail>
              <Detail
                label={
                  funding.progress.excessInOre
                    ? "Över plan"
                    : "Kvar enligt plan"
                }
              >
                {formatBudgetSek(
                  funding.progress.excessInOre ||
                    funding.progress.remainingInOre,
                )}
              </Detail>
            </dl>
            <Link
              className="inline-block text-primary underline underline-offset-4"
              href={`/transfers?month=${period}#purpose-${item.itemId ?? `${source}-${item.id}`}`}
            >
              Registrera överföring för {item.name}
            </Link>
          </section>
          <section aria-label="Överföringshistorik" className="border-t pt-4">
            <h3 className="font-semibold">
              Överföringshistorik ({funding.transfers.length})
            </h3>
            {funding.transfers.length ? (
              <ul className="mt-3 divide-y">
                {funding.transfers.map((t) => (
                  <li key={t.id} className="py-3">
                    {dateLabel(t.occurredOn)} ·{" "}
                    {t.kind === "opening"
                      ? "Ingående värde"
                      : t.kind === "deposit"
                        ? "Insättning"
                        : "Uttag"}{" "}
                    · {formatBudgetSek(t.amountInOre)} · avser{" "}
                    {monthLabel(t.attributionMonth)}
                    {t.note ? ` · ${t.note}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-muted-foreground">
                Inga registrerade överföringar ännu.
              </p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
