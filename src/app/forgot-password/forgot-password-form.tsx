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
  const [message, setMessage] = useState("");

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    try {
      const { error } = await authClient.requestPasswordReset({
        email: String(formData.get("email")),
        redirectTo: "/reset-password",
      });

      if (error) {
        setMessage(
          error.status === 429
            ? "För många försök. Vänta en stund och försök igen."
            : "Kunde inte skicka länken. Försök snart igen.",
        );
        return;
      }
      setSent(true);
    } catch {
      setMessage(
        "Kunde inte skicka länken. Kontrollera anslutningen och försök igen.",
      );
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-sm">
        <p>
          Om adressen finns hos oss har vi skickat en länk för nytt lösenord.
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
      {message ? (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
      <Button
        type="submit"
        className="w-full"
        disabled={!configured || pending}
      >
        {pending ? "Skickar…" : "Skicka återställningslänk"}
      </Button>
      {!configured ? (
        <p className="text-sm text-muted-foreground">
          Återställning via e-post är inte tillgänglig just nu.
        </p>
      ) : null}
      <Button asChild variant="link" className="w-full">
        <Link href="/login">Tillbaka till inloggningen</Link>
      </Button>
    </form>
  );
}
