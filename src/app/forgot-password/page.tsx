import { KeyRound } from "lucide-react";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isEmailAuthConfigured } from "@/lib/auth/config";
import { getCurrentSession } from "@/lib/auth/session";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = { title: "Glömt lösenord" };

export default async function ForgotPasswordPage() {
  const session = await getCurrentSession();
  if (session) redirect("/");

  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <Card className="w-full max-w-md shadow-xl shadow-primary/10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <KeyRound aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">Återställ lösenordet</CardTitle>
          <CardDescription>
            Vi skickar en tidsbegränsad länk till din verifierade e-postadress.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm configured={isEmailAuthConfigured()} />
        </CardContent>
      </Card>
    </main>
  );
}
