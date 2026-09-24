import { expect, test } from "@playwright/test";
import { setSession } from "./helpers/session";

test("skapar hushåll och behåller det vid återbesök", async ({
  page,
  context,
  browser,
}, testInfo) => {
  const token = `onboarding-${testInfo.retry}`;
  await setSession(context, token);
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding$/);
  await page
    .getByRole("textbox", { name: "Namn på hushållet" })
    .fill("Testfamiljen");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("region", { name: "Månadens nyckeltal" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Logga ut" })).toHaveCount(0);
  await expect(page.getByText("Testfamiljen", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Testfamiljen", { exact: true })).toBeVisible();
  await page.goto("/settings");
  const accountCard = page.locator('[data-slot="card"]').filter({
    has: page.getByRole("heading", { name: "Konto", exact: true }),
  });
  await expect(accountCard).toBeVisible();
  await expect(
    accountCard.getByRole("button", { name: "Logga ut" }),
  ).toBeVisible();
  await expect(page.locator('[data-slot="card"]').last()).toContainText(
    "Konto",
  );
  await expect(page.getByText("Förhandsversion aaaaaaa")).toBeVisible();
  await page.getByText("Förhandsversion aaaaaaa").click();
  await expect(page.getByText("Gren: codex/test-preview")).toBeVisible();
  await expect(page.getByText(`Revision: ${"a".repeat(40)}`)).toBeVisible();
  await expect(page.getByText(/^Version /)).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Se publicerade releaser på GitHub" }),
  ).toHaveAttribute("href", "https://github.com/Visegue/home-economy/releases");

  const origin = new URL(page.url()).origin;
  const returningContext = await browser.newContext();
  try {
    await setSession(returningContext, token);
    const returningPage = await returningContext.newPage();
    await returningPage.goto(`${origin}/onboarding`);
    await expect(returningPage).toHaveURL(`${origin}/`);
    await expect(
      returningPage.getByText("Testfamiljen", { exact: true }),
    ).toBeVisible();
  } finally {
    await returningContext.close();
  }

  const [signOutResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/auth/sign-out" &&
        response.request().method() === "POST",
    ),
    accountCard.getByRole("button", { name: "Logga ut" }).click(),
  ]);
  expect(signOutResponse.ok()).toBe(true);
  await expect(page).toHaveURL(/\/login$/);
});

for (const token of ["expired", "missing-session"]) {
  test(`nekar databassessionen ${token} trots signerad cookie`, async ({
    page,
    context,
  }) => {
    await setSession(context, token);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "Välkommen tillbaka" }),
    ).toBeVisible();
  });
}
