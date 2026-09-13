import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { getCurrentHousehold } from "@/features/households/data";
import { requireSession } from "@/lib/auth/session";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireSession();
  const household = await getCurrentHousehold();

  if (!household) redirect("/onboarding");

  return (
    <AppShell householdName={household.name} userName={session.user.name}>
      {children}
    </AppShell>
  );
}
