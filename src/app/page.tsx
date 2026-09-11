import { redirect } from "next/navigation";

import { OverviewDashboard } from "@/features/dashboard/overview-dashboard";
import { getCurrentHousehold } from "@/features/households/data";
import { requireSession } from "@/lib/auth/session";

export default async function Home() {
  const session = await requireSession();
  const household = await getCurrentHousehold();

  if (!household) redirect("/onboarding");

  return (
    <OverviewDashboard
      householdName={household.name}
      userName={session.user.name}
    />
  );
}
