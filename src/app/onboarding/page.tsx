import { CircleDollarSign } from "lucide-react";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserMenu } from "@/components/user-menu";
import { getCurrentHousehold } from "@/features/households/data";
import { requireSession } from "@/lib/auth/session";

import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Skapa ditt hushåll" };

export default async function OnboardingPage() {
  const session = await requireSession();
  const household = await getCurrentHousehold();

  if (household) redirect("/");

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex max-w-lg justify-end pb-6">
        <UserMenu name={session.user.name} />
      </div>
      <Card className="mx-auto w-full max-w-lg shadow-xl shadow-primary/10">
        <CardHeader>
          <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <CircleDollarSign aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">Skapa ditt hushåll</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <OnboardingForm />
        </CardContent>
      </Card>
    </main>
  );
}
