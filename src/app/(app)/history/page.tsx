import Link from "next/link";
import { getBudgetData } from "@/features/budget/data";
import { getSavings } from "@/features/savings/data";
import { ExpenseDialog, RemoveExpenseDialog } from "@/features/budget/forms";
import {
  IncomeDialog,
  RemoveIncomeDialog,
} from "@/features/budget/income-form";
import {
  SavingDialog,
  RemoveSavingDialog,
} from "@/features/savings/saving-form";
import { DayDefaultsProvider } from "@/features/periods/fields";
import {
  currentDate,
  dateLabel,
  versionBounds,
  type PeriodVersion,
} from "@/features/periods/model";
import { formatBudgetSek } from "@/lib/money";

export const metadata = { title: "Historik och kommande ändringar" };
function Validity({ item }: { item: PeriodVersion }) {
  const { start, end } = versionBounds(item);
  return (
    <p className="text-sm text-muted-foreground">
      {start ? dateLabel(start) : "Sedan tidigare"} –{" "}
      {end ? dateLabel(end) : "tills vidare"}
      {start && start > currentDate()
        ? " · Kommande"
        : end && end < currentDate()
          ? " · Historik"
          : " · Gäller idag"}
    </p>
  );
}
export default async function HistoryPage() {
  const [budget, savings] = await Promise.all([getBudgetData(), getSavings()]);
  const today = currentDate();
  return (
    <DayDefaultsProvider days={budget.household}>
      <div className="space-y-6">
        <Link className="underline" href="/">
          Till månadsöversikten
        </Link>
        <h1 className="text-2xl font-semibold">
          Historik och kommande ändringar
        </h1>
        <p className="text-sm text-muted-foreground">
          Välj den version du vill ändra eller rätta. Senare versioner ligger
          kvar.
        </p>
        <section>
          <h2 className="text-lg font-semibold">Inkomster</h2>
          <ul className="divide-y">
            {budget.incomes.map((income) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 py-3"
                key={income.id}
              >
                <div>
                  {income.name} · {formatBudgetSek(income.amountInOre)}
                  <Validity item={income} />
                </div>
                <div className="flex gap-2">
                  <IncomeDialog income={income} defaultStart={today} />
                  <RemoveIncomeDialog income={income} />
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Utgifter och avräkningar</h2>
          <ul className="divide-y">
            {budget.expenses.map((expense) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 py-3"
                key={expense.id}
              >
                <div>
                  {expense.name} · {formatBudgetSek(expense.amountInOre)}
                  <Validity item={expense} />
                </div>
                <div className="flex gap-2">
                  <ExpenseDialog
                    expense={expense}
                    people={budget.people}
                    period={today.slice(0, 7)}
                  />
                  <RemoveExpenseDialog
                    expense={expense}
                    period={today.slice(0, 7)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Sparande</h2>
          <ul className="divide-y">
            {savings.map((saving) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 py-3"
                key={saving.id}
              >
                <div>
                  {saving.name} · {formatBudgetSek(saving.amountInOre)}
                  <Validity item={saving} />
                </div>
                <div className="flex gap-2">
                  <SavingDialog saving={saving} period={today} />
                  <RemoveSavingDialog saving={saving} period={today} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </DayDefaultsProvider>
  );
}
