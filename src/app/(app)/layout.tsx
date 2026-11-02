import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { NavigationProvider } from "@/components/navigation";
import { AppShell } from "@/components/app-shell";
import { SaveNoticeProvider } from "@/components/save-notice";
import { getCurrentHousehold } from "@/features/households/data";
import { requireSession } from "@/lib/auth/session";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSession();
  const household = await getCurrentHousehold();

  if (!household) redirect("/onboarding");

  return (
    <SaveNoticeProvider>
      <NavigationProvider>
        <AppShell householdName={household.name}>{children}</AppShell>
      </NavigationProvider>
    </SaveNoticeProvider>
  );
}
