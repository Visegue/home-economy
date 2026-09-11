"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type PendingAction = "google" | "sign-in" | "sign-up" | null;

export function LoginForm({
  emailConfigured,
  googleConfigured,
}: {
  emailConfigured: boolean;
  googleConfigured: boolean;
}) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  function startAction(action: Exclude<PendingAction, null>) {
    setPendingAction(action);
    setMessage("");
    setSuccess(false);
  }

  async function signInWithGoogle() {
    startAction("google");

    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: new URL("/", window.location.origin).toString(),
        errorCallbackURL: new URL(
          "/login?error=oauth",
          window.location.origin,
        ).toString(),
      });

      if (!error) {
        return;
      }
    } catch {
      // Network and runtime timeouts reject instead of returning an auth error.
    }

    setPendingAction(null);
    setMessage(
      "Inloggningen kunde inte startas. Kontrollera anslutningen och försök igen.",
    );
  }

  async function signInWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startAction("sign-in");

    const formData = new FormData(event.currentTarget);
    const { error } = await authClient.signIn.email({
      email: String(formData.get("email")),
      password: String(formData.get("password")),
      rememberMe: true,
      callbackURL: "/",
    });

    if (error) {
      setPendingAction(null);
      setMessage(
        error.status === 403
          ? "Verifiera din e-postadress innan du loggar in. Vi har skickat en ny länk."
          : "E-postadressen eller lösenordet är fel.",
      );
      return;
    }

    window.location.assign("/");
  }

  async function signUpWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startAction("sign-up");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password"));
    const passwordConfirmation = String(formData.get("password-confirmation"));

    if (password !== passwordConfirmation) {
      setPendingAction(null);
      setMessage("Lösenorden stämmer inte överens.");
      return;
    }

    const { error } = await authClient.signUp.email({
      name: String(formData.get("name")),
      email: String(formData.get("email")),
      password,
      callbackURL: "/",
    });

    setPendingAction(null);

    if (error) {
      setMessage(
        "Kontot kunde inte skapas. Kontrollera uppgifterna och försök igen.",
      );
      return;
    }

    setSuccess(true);
    setMessage(
      "Om adressen är ny har vi skickat en verifieringslänk. Använder du redan Google kan du välja Glömt lösenord för att lägga till ett lösenord.",
    );
  }

  const pending = pendingAction !== null;

  return (
    <div className="space-y-5">
      <Tabs defaultValue="sign-in">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sign-in">Logga in</TabsTrigger>
          <TabsTrigger value="sign-up">Skapa konto</TabsTrigger>
        </TabsList>

        <TabsContent value="sign-in" className="pt-3">
          <form className="space-y-4" onSubmit={signInWithEmail}>
            <div className="space-y-2">
              <Label htmlFor="sign-in-email">E-postadress</Label>
              <Input
                id="sign-in-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={!emailConfigured || pending}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="sign-in-password">Lösenord</Label>
                <Button asChild variant="link" size="xs" className="px-0">
                  <Link href="/forgot-password">Glömt lösenord?</Link>
                </Button>
              </div>
              <Input
                id="sign-in-password"
                name="password"
                type="password"
                autoComplete="current-password"
                minLength={12}
                maxLength={128}
                required
                disabled={!emailConfigured || pending}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={!emailConfigured || pending}
            >
              {pendingAction === "sign-in" ? "Loggar in…" : "Logga in"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="sign-up" className="pt-3">
          <form className="space-y-4" onSubmit={signUpWithEmail}>
            <div className="space-y-2">
              <Label htmlFor="sign-up-name">Namn</Label>
              <Input
                id="sign-up-name"
                name="name"
                autoComplete="name"
                minLength={2}
                maxLength={120}
                required
                disabled={!emailConfigured || pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sign-up-email">E-postadress</Label>
              <Input
                id="sign-up-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={!emailConfigured || pending}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sign-up-password">Lösenord</Label>
                <Input
                  id="sign-up-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                  disabled={!emailConfigured || pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sign-up-password-confirmation">Upprepa</Label>
                <Input
                  id="sign-up-password-confirmation"
                  name="password-confirmation"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                  disabled={!emailConfigured || pending}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Minst 12 tecken. Du behöver verifiera e-postadressen innan första
              inloggningen.
            </p>
            <Button
              type="submit"
              className="w-full"
              disabled={!emailConfigured || pending}
            >
              {pendingAction === "sign-up" ? "Skapar konto…" : "Skapa konto"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {!emailConfigured ? (
        <p className="text-sm text-muted-foreground">
          E-postinloggning aktiveras när e-postleveransen har konfigurerats.
        </p>
      ) : null}

      <div className="relative py-1">
        <Separator />
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
          eller
        </span>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={!googleConfigured || pending}
        onClick={signInWithGoogle}
      >
        <GoogleIcon />
        {pendingAction === "google" ? "Öppnar Google…" : "Fortsätt med Google"}
      </Button>

      {!googleConfigured ? (
        <p className="text-sm text-muted-foreground">
          Google-inloggning aktiveras när OAuth har konfigurerats.
        </p>
      ) : null}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Samma verifierade e-postadress ger samma konto oavsett om du använder
        lösenord eller Google.
      </p>

      {message ? (
        <output
          className={
            success
              ? "block text-sm text-emerald-700"
              : "block text-sm text-destructive"
          }
        >
          {message}
        </output>
      ) : null}
    </div>
  );
}
