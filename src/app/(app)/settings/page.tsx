import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeploymentInfo } from "@/components/deployment-info";
import { getBudgetData } from "@/features/budget/data";
import { PersonForm } from "@/features/budget/forms";
import {
  IncomeDialog,
  RemoveIncomeButton,
} from "@/features/budget/income-form";
import { currentPeriod, monthLabel } from "@/features/budget/model";
import { getDeploymentVersion } from "@/lib/deployment-version";
import { formatBudgetSek } from "@/lib/money";
import packageJson from "../../../../package.json";

export const metadata = { title: "Hushållsinställningar" };

export default async function SettingsPage() {
  const { people, household, incomes } = await getBudgetData();
  const current = currentPeriod();
  const deployment = getDeploymentVersion(packageJson.version, process.env);
  return (
    <div className="max-w-4xl space-y-6">
      <Card id="incomes">
        <CardHeader>
          <CardTitle>Hushållets inkomster</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <IncomeDialog defaultStart={current} />
          {incomes.length ? (
            <ul aria-label="Hushållets inkomster" className="divide-y">
              {incomes.map((income) => (
                <li
                  key={income.id}
                  className="flex flex-wrap justify-between gap-4 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium break-words">{income.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {monthLabel(income.startsOn)} –{" "}
                      {income.endsOn
                        ? monthLabel(income.endsOn)
                        : "tills vidare"}
                    </p>
                    <p className="mt-1 font-semibold tabular-nums">
                      {formatBudgetSek(income.amountInOre)}
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        / månad
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    <IncomeDialog income={income} defaultStart={current} />
                    <RemoveIncomeButton income={income} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Inga inkomster tillagda ännu.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Medlemmar i {household.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {people.length ? (
            <ul aria-label="Hushållets medlemmar" className="divide-y">
              {people.map((person) => (
                <li key={person.id} className="py-3 font-medium">
                  {person.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Inga medlemmar tillagda ännu.
            </p>
          )}
          <PersonForm />
        </CardContent>
      </Card>
      <DeploymentInfo deployment={deployment} />
    </div>
  );
}
