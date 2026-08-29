"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.74 2.98-4.32 2.98-7.41"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.64-2.36l-3.25-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.03v2.62A10 10 0 0 0 12 22"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.93A6 6 0 0 1 6.07 12c0-.67.12-1.32.32-1.93V7.45H3.03A10 10 0 0 0 2 12c0 1.64.39 3.19 1.03 4.55z"
      />
      <path
        fill="#EA4335"
        d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.88-2.88A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.97 5.45l3.36 2.62C7.18 7.7 9.39 5.94 12 5.94"
      />
    </svg>
  );
}

export function LoginForm({ configured }: { configured: boolean }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function signInWithGoogle() {
    setPending(true);
    setMessage("");

    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
      errorCallbackURL: "/login?error=oauth",
    });

    if (error) {
      setPending(false);
      setMessage("Inloggningen kunde inte startas. Försök igen.");
    }
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={!configured || pending}
        onClick={signInWithGoogle}
      >
        <GoogleIcon />
        {pending ? "Öppnar Google…" : "Fortsätt med Google"}
      </Button>
      {!configured ? (
        <p className="text-sm text-muted-foreground">
          Inloggning aktiveras när Google OAuth och en tillåten e-postadress har
          konfigurerats.
        </p>
      ) : null}
      {message ? (
        <output className="text-sm text-destructive">{message}</output>
      ) : null}
    </div>
  );
}
