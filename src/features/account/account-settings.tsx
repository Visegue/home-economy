"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { KeyRound, Link2 } from "lucide-react";
import { FormDialog, useFormGuard } from "@/components/form-dialog";
import { FormDialogContent } from "@/components/form-dialog-content";
import { useSaveNotice } from "@/components/save-notice";
import { Button } from "@/components/ui/button";
import { DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

type AccountSettingsProps = {
  email: string;
  hasPassword: boolean;
  googleLinked: boolean;
  emailConfigured: boolean;
  googleConfigured: boolean;
  linkResult?: "success" | "error";
};

function authError(error: { status: number; code?: string }, fallback: string) {
  if (error.status === 429)
    return "För många försök. Vänta en stund och försök igen.";
  if (error.status === 401 || error.code === "SESSION_NOT_FRESH")
    return "Logga in igen för att ändra dina inloggningsuppgifter.";
  if (error.code === "INVALID_PASSWORD")
    return "Det nuvarande lösenordet stämmer inte.";
  return fallback;
}

export function AccountSettings({
  email,
  hasPassword,
  googleLinked,
  emailConfigured,
  googleConfigured,
  linkResult,
}: AccountSettingsProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<"email" | "google" | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(
    linkResult === "error"
      ? "Google kunde inte kopplas. Välj ett Google-konto med samma e-postadress och försök igen."
      : "",
  );

  async function sendPasswordLink() {
    setPending("email");
    setError("");
    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });
      if (result.error)
        setError(
          authError(result.error, "Kunde inte skicka länken. Försök igen."),
        );
      else setSent(true);
    } catch {
      setError(
        "Kunde inte skicka länken. Kontrollera anslutningen och försök igen.",
      );
    } finally {
      setPending(null);
    }
  }

  async function linkGoogle() {
    setPending("google");
    setError("");
    try {
      const result = await authClient.linkSocial({
        provider: "google",
        callbackURL: new URL(
          "/settings?accountLink=success#account",
          window.location.origin,
        ).toString(),
        errorCallbackURL: new URL(
          "/settings?accountLink=error#account",
          window.location.origin,
        ).toString(),
      });
      if (!result.error) return;
      setError(
        authError(result.error, "Google kunde inte kopplas. Försök igen."),
      );
    } catch {
      setError(
        "Google kunde inte kopplas. Kontrollera anslutningen och försök igen.",
      );
    }
    setPending(null);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Inloggad som{" "}
        <span className="font-medium break-all text-foreground">{email}</span>
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1 basis-56 space-y-1">
          <h3 className="font-medium">Lösenord</h3>
          <p className="text-sm text-muted-foreground">
            {hasPassword
              ? "Du har ett lösenord för Hemekonomi."
              : "Lägg till ett lösenord via en länk till din e-postadress. Du kan fortsätta använda Google."}
          </p>
          {!hasPassword && !emailConfigured ? (
            <p className="text-sm text-muted-foreground">
              Att lägga till lösenord via e-post är inte tillgängligt just nu.
            </p>
          ) : null}
        </div>
        {hasPassword ? (
          <FormDialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" disabled={pending !== null}>
                <KeyRound aria-hidden="true" />
                Ändra lösenord
              </Button>
            </DialogTrigger>
            <FormDialogContent
              title="Ändra lösenord"
              description="Välj ett lösenord med 12–128 tecken. Övriga enheter loggas ut när du sparar."
            >
              {open ? (
                <ChangePasswordForm
                  email={email}
                  onSaved={() => setOpen(false)}
                />
              ) : null}
            </FormDialogContent>
          </FormDialog>
        ) : (
          <Button
            variant="secondary"
            disabled={!emailConfigured || pending !== null || sent}
            onClick={sendPasswordLink}
          >
            <KeyRound aria-hidden="true" />
            {pending === "email"
              ? "Skickar…"
              : sent
                ? "Länk begärd"
                : "Lägg till lösenord"}
          </Button>
        )}
      </div>
      {sent ? (
        <output className="block text-sm">
          Kontrollera din inkorg på {email} och följ länken för att välja
          lösenord. Kontrollera även skräpposten. Du behöver logga in igen
          efteråt.
        </output>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        <div className="min-w-0 flex-1 basis-56 space-y-1">
          <h3 className="font-medium">Google</h3>
          <p className="text-sm text-muted-foreground">
            {googleLinked
              ? "Google är kopplat till ditt konto."
              : "Koppla ett Google-konto med samma e-postadress för att använda båda inloggningssätten."}
          </p>
          {!googleLinked && !googleConfigured ? (
            <p className="text-sm text-muted-foreground">
              Google-koppling är inte tillgänglig just nu.
            </p>
          ) : null}
        </div>
        {!googleLinked ? (
          <Button
            variant="outline"
            disabled={!googleConfigured || pending !== null}
            onClick={linkGoogle}
          >
            <Link2 aria-hidden="true" />
            {pending === "google" ? "Öppnar Google…" : "Koppla Google"}
          </Button>
        ) : null}
      </div>
      {linkResult === "success" && googleLinked ? (
        <output className="block text-sm">
          Google har kopplats till ditt konto.
        </output>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ChangePasswordForm({
  email,
  onSaved,
}: {
  email: string;
  onSaved: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const notify = useSaveNotice();
  useFormGuard({ currentPassword, newPassword, confirmation }, pending);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmation) {
      setError("Lösenorden matchar inte.");
      return;
    }
    setPending(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        setError(
          authError(result.error, "Kunde inte ändra lösenordet. Försök igen."),
        );
        return;
      }
      notify("Lösenordet uppdaterat. Övriga enheter har loggats ut.");
      onSaved();
    } catch {
      setError(
        "Kunde inte ändra lösenordet. Kontrollera anslutningen och försök igen.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={changePassword} className="space-y-4">
      <input
        type="hidden"
        name="username"
        autoComplete="username"
        value={email}
      />
      <fieldset disabled={pending} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current-password">Nuvarande lösenord</Label>
          <Input
            id="current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="account-new-password">Nytt lösenord</Label>
          <Input
            id="account-new-password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="account-confirm-password">Upprepa lösenordet</Label>
          <Input
            id="account-confirm-password"
            name="confirmation"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </div>
        <Link
          href="/forgot-password"
          className="text-sm text-primary underline underline-offset-4"
        >
          Glömt lösenord?
        </Link>
      </fieldset>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sparar…" : "Spara nytt lösenord"}
      </Button>
    </form>
  );
}
