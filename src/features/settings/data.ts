import "server-only";

import { getAccountSettings } from "@/features/account/data";
import { getIncomeData } from "@/features/budget/data";
import { currentPeriod } from "@/features/budget/model";
import { getHouseholdMembers } from "@/features/households/members/data";
import { getDeploymentVersion } from "@/lib/deployment-version";
import packageJson from "../../../package.json";

export type SettingsQuery = { accountLink?: string | string[] };

export async function getSettingsData(searchParams: Promise<SettingsQuery>) {
  const [{ household, incomes }, { people, defaultColor }, account, query] =
    await Promise.all([
      getIncomeData(),
      getHouseholdMembers(),
      getAccountSettings(),
      searchParams,
    ]);
  const linkResult: "error" | "success" | undefined =
    query.accountLink === "error" || query.accountLink === "success"
      ? query.accountLink
      : undefined;

  return {
    household,
    incomes,
    people,
    defaultColor,
    account: { ...account, linkResult },
    current: currentPeriod(),
    deployment: getDeploymentVersion(packageJson.version, process.env),
  };
}
