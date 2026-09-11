import { CircleDollarSign } from "lucide-react";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  isEmailAuthConfigured,
  isGoogleAuthConfigured,
} from "@/lib/auth/config";
import { getCurrentSession } from "@/lib/auth/session";

import { LoginForm } from "./login-form";

export const metadata = { title: "Logga in" };

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session) redirect("/");

  const emailConfigured = isEmailAuthConfigured();
  const googleConfigured = isGoogleAuthConfigured();

  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <Card className="w-full max-w-lg shadow-xl shadow-primary/10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <CircleDollarSign aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">Välkommen tillbaka</CardTitle>
          <CardDescription>
            Logga in med e-post och lösenord eller fortsätt med Google.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm
            emailConfigured={emailConfigured}
            googleConfigured={googleConfigured}
          />
        </CardContent>
      </Card>
    </main>
  );
}
