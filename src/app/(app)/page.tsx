import { redirect } from "next/navigation";
import { OverviewDashboard } from "@/features/dashboard/overview-dashboard";
import { currentPeriod } from "@/features/budget/model";

export const metadata = { title: "Månaden" };

export default async function MonthPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const { month } = await searchParams;
  if (month !== undefined) redirect("/");

  return <OverviewDashboard period={currentPeriod()} />;
}
