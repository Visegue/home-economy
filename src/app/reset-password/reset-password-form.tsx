"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

export function ResetPasswordForm({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password"));
    const passwordConfirmation = String(formData.get("password-confirmation"));

    if (password !== passwordConfirmation) {
      setPending(false);
      setMessage("Lösenorden stämmer inte överens.");
      return;
    }

    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    setPending(false);

    if (error) {
      setMessage("Länken är ogiltig eller har gått ut. Begär en ny länk.");
      return;
    }

    setComplete(true);
  }

  if (complete) {
    return (
      <div className="space-y-4 text-sm">
        <p>Lösenordet är uppdaterat. Du kan nu logga in.</p>
        <Button asChild className="w-full">
          <Link href="/login">Logga in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={resetPassword}>
      <div className="space-y-2">
        <Label htmlFor="new-password">Nytt lösenord</Label>
        <Input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password-confirmation">Upprepa lösenordet</Label>
        <Input
          id="new-password-confirmation"
          name="password-confirmation"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          disabled={pending}
        />
      </div>
      <p className="text-xs text-muted-foreground">Minst 12 tecken.</p>
      {message ? (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sparar…" : "Spara nytt lösenord"}
      </Button>
    </form>
  );
}
