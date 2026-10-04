import { MemberAvatar } from "@/components/member-avatar";
import {
  CardManagement,
  CardManagementButton,
  ManagementOnly,
} from "@/components/card-management";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeploymentInfo } from "@/components/deployment-info";
import { SignOutButton } from "@/components/user-menu";
import { AccountSettings } from "@/features/account/account-settings";
import {
  MemberDialog,
  RemoveMemberDialog,
} from "@/features/households/members/forms";
import {
  IncomeDialog,
  RemoveIncomeDialog,
} from "@/features/budget/income-form";
import { getSettingsData, type SettingsQuery } from "@/features/settings/data";
import { formatBudgetSek } from "@/lib/money";
import { DayDefaultsProvider } from "@/features/periods/fields";
import { DayDefaultsForm } from "@/features/periods/defaults-form";
import { dateLabel, versionBounds } from "@/features/periods/model";

export const metadata = { title: "Hushållsinställningar" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<SettingsQuery>;
}) {
  const {
    household,
    incomes,
    people,
    defaultColor,
    account,
    current,
    deployment,
  } = await getSettingsData(searchParams);
  return (
    <DayDefaultsProvider days={household}>
      <div className="max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Standarddagar</CardTitle>
          </CardHeader>
          <CardContent>
            <DayDefaultsForm days={household} />
          </CardContent>
        </Card>
        <CardManagement hasItems={incomes.length > 0}>
          <Card id="incomes">
            <CardHeader>
              <CardTitle>Hushållets inkomster</CardTitle>
              <CardAction className="flex items-center gap-2">
                {incomes.length ? (
                  <CardManagementButton label="inkomster" />
                ) : null}
                <IncomeDialog defaultStart={current} />
              </CardAction>
            </CardHeader>
            <CardContent>
              {incomes.length ? (
                <ul aria-label="Hushållets inkomster" className="divide-y">
                  {incomes.map((income) => (
                    <li
                      key={income.id}
                      className="flex flex-wrap justify-between gap-4 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium break-words">
                          {income.name}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {dateLabel(versionBounds(income).start!)} –{" "}
                          {versionBounds(income).end
                            ? dateLabel(versionBounds(income).end!)
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
                      <ManagementOnly>
                        <div className="flex items-start gap-2">
                          <IncomeDialog
                            income={income}
                            defaultStart={current}
                          />
                          <RemoveIncomeDialog income={income} />
                        </div>
                      </ManagementOnly>
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
        </CardManagement>
        <CardManagement hasItems={people.length > 0}>
          <Card>
            <CardHeader>
              <CardTitle>Medlemmar i {household.name}</CardTitle>
              <CardAction className="flex items-center gap-2">
                {people.length ? (
                  <CardManagementButton label="medlemmar" />
                ) : null}
                <MemberDialog defaultColor={defaultColor} />
              </CardAction>
            </CardHeader>
            <CardContent>
              {people.length ? (
                <ul aria-label="Hushållets medlemmar" className="divide-y">
                  {people.map((person) => (
                    <li
                      key={person.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <MemberAvatar name={person.name} color={person.color} />
                        <span className="min-w-0 font-medium break-words">
                          {person.name}
                        </span>
                      </div>
                      <ManagementOnly>
                        <div className="flex items-center gap-2">
                          <MemberDialog person={person} />
                          <RemoveMemberDialog person={person} />
                        </div>
                      </ManagementOnly>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Inga medlemmar tillagda ännu.
                </p>
              )}
            </CardContent>
          </Card>
        </CardManagement>
        <Card id="account">
          <CardHeader>
            <CardTitle>Konto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <AccountSettings {...account} />
            <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-5">
              <p className="text-sm text-muted-foreground">
                Logga ut från Hemekonomi på den här enheten.
              </p>
              <SignOutButton />
            </div>
          </CardContent>
        </Card>
        <DeploymentInfo deployment={deployment} />
      </div>
    </DayDefaultsProvider>
  );
}
