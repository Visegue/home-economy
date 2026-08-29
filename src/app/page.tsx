import { OverviewDashboard } from "@/features/dashboard/overview-dashboard";
import { isAuthConfigured } from "@/lib/auth/config";
import { requireSession } from "@/lib/auth/session";

export default async function Home() {
  if (!isAuthConfigured()) return <OverviewDashboard />;

  const session = await requireSession();
  return <OverviewDashboard userName={session.user.name} />;
}
