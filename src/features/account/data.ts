import "server-only";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireSession } from "@/lib/auth/session";
import {
  isEmailAuthConfigured,
  isGoogleAuthConfigured,
} from "@/lib/auth/config";

export async function getAccountSettings() {
  const session = await requireSession();
  const accounts = await auth.api.listUserAccounts({
    headers: await headers(),
  });
  return {
    email: session.user.email,
    hasPassword: accounts.some(
      (account) => account.providerId === "credential",
    ),
    googleLinked: accounts.some((account) => account.providerId === "google"),
    emailConfigured: isEmailAuthConfigured(),
    googleConfigured: isGoogleAuthConfigured(),
  };
}
