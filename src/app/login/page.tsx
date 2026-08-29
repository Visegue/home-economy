import { CircleDollarSign } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isAuthConfigured } from "@/lib/auth/config";

import { LoginForm } from "./login-form";

export const metadata = { title: "Logga in" };

export default async function LoginPage() {
  const configured = isAuthConfigured();

  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <Card className="w-full max-w-md shadow-xl shadow-primary/10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <CircleDollarSign aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">Välkommen tillbaka</CardTitle>
          <CardDescription>
            Logga in med ett Google-konto som har fått åtkomst till hushållet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm configured={configured} />
        </CardContent>
      </Card>
    </main>
  );
}
