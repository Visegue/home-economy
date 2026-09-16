import { OverviewDashboard } from "@/features/dashboard/overview-dashboard";
import { currentPeriod, periodSchema } from "@/features/budget/model";

export const metadata = { title: "Månaden" };

export default async function MonthPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const parsed = periodSchema.safeParse(month);
  return (
    <OverviewDashboard
      period={parsed.success ? parsed.data : currentPeriod()}
    />
  );
}
