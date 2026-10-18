import { createHmac } from "node:crypto";
import { test as base, type BrowserContext } from "@playwright/test";
import { sessionIdentity } from "../../scripts/playwright-sessions.mjs";

export { expect } from "@playwright/test";
export type { Page } from "@playwright/test";

type Session = ReturnType<typeof sessionIdentity> & {
  outsider: ReturnType<typeof sessionIdentity>;
};

export const test = base.extend<{ session: Session }>({
  // Playwright requires an object pattern for fixture dependencies.
  // oxlint-disable-next-line no-empty-pattern
  session: async ({}, use, testInfo) => {
    await use({
      ...sessionIdentity(testInfo),
      outsider: sessionIdentity(testInfo, "outsider"),
    });
  },
});

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
