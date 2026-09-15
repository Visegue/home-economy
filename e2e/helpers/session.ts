import { createHmac } from "node:crypto";
import type { BrowserContext } from "@playwright/test";

export async function setSession(context: BrowserContext, token: string) {
  const signature = createHmac(
    "sha256",
    "synthetic-playwright-secret-only-for-tests",
  )
    .update(token)
    .digest("base64");
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: encodeURIComponent(`${token}.${signature}`),
      url: "http://127.0.0.1:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
