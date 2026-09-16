import { KeyRound } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "Välj nytt lösenord" };

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string | string[];
    token?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const token = firstValue(query.token);
  const invalid = firstValue(query.error) === "INVALID_TOKEN" || !token;

  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <Card className="w-full max-w-md shadow-xl shadow-primary/10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <KeyRound aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">Välj nytt lösenord</CardTitle>
        </CardHeader>
        <CardContent>
          {invalid ? (
            <div className="space-y-4 text-sm">
              <p>Länken är ogiltig eller har gått ut.</p>
              <Button asChild className="w-full">
                <Link href="/forgot-password">Begär en ny länk</Link>
              </Button>
            </div>
          ) : (
            <ResetPasswordForm token={token} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
