"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

export function ForgotPasswordForm({ configured }: { configured: boolean }) {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const formData = new FormData(event.currentTarget);
    await authClient.requestPasswordReset({
      email: String(formData.get("email")),
      redirectTo: "/reset-password",
    });

    setPending(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4 text-sm">
        <p>
          Om adressen finns hos oss har vi skickat en länk för att välja ett
          nytt lösenord.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Tillbaka till inloggningen</Link>
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={requestReset}>
      <div className="space-y-2">
        <Label htmlFor="reset-email">E-postadress</Label>
        <Input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={!configured || pending}
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={!configured || pending}
      >
        {pending ? "Skickar…" : "Skicka återställningslänk"}
      </Button>
      {!configured ? (
        <p className="text-sm text-muted-foreground">
          E-postleveransen är inte konfigurerad ännu.
        </p>
      ) : null}
      <Button asChild variant="link" className="w-full">
        <Link href="/login">Tillbaka till inloggningen</Link>
      </Button>
    </form>
  );
}
