import { expect, test } from "@playwright/test";
import { setSession } from "./helpers/session";

test("byter lösenord, behåller hushållet och loggar ut andra enheter", async ({
  page,
  context,
  browser,
}, testInfo) => {
  test.slow();
  const identity = `account-password-${testInfo.retry}`;
  await setSession(context, identity);
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Namn på hushållet").fill("Kontotest");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/settings");
  await page.setViewportSize({ width: 390, height: 844 });
  const other = await browser.newContext();
  try {
    await setSession(other, `${identity}-other`);
    const origin = new URL(page.url()).origin;
    const before = await other.request.get(`${origin}/api/auth/get-session`);
    expect((await before.json()).user.id).toBe(identity);
    await page
      .getByRole("button", { name: "Ändra lösenord", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Ändra lösenord",
      exact: true,
    });
    await dialog.getByLabel("Nuvarande lösenord").fill("wrong-password");
    await dialog
      .getByLabel("Nytt lösenord", { exact: true })
      .fill("new-synthetic-account-password-456");
    await dialog
      .getByLabel("Upprepa lösenordet")
      .fill("new-synthetic-account-password-456");
    await dialog.getByRole("button", { name: "Stäng", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Fortsätt redigera" }).click();
    await dialog.getByRole("button", { name: "Spara nytt lösenord" }).click();
    await expect(dialog.getByRole("alert")).toHaveText(
      "Det nuvarande lösenordet stämmer inte.",
    );
    await dialog
      .getByLabel("Nuvarande lösenord")
      .fill("synthetic-account-password-123");
    await dialog.getByRole("button", { name: "Spara nytt lösenord" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("status").filter({ hasText: "Lösenordet uppdaterat" }),
    ).toBeVisible();
    expect(
      await (await other.request.get(`${origin}/api/auth/get-session`)).json(),
    ).toBeNull();
    await page.reload();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(
      page.getByRole("heading", { name: "Medlemmar i Kontotest" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Ändra lösenord", exact: true })
      .click();
    await expect(dialog.getByLabel("Nuvarande lösenord")).toBeEmpty();
    await expect(
      dialog.getByLabel("Nytt lösenord", { exact: true }),
    ).toBeEmpty();
    await page.screenshot({
      path: testInfo.outputPath("change-password-mobile.png"),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");

    // Exercise the real OAuth start and cancellation callback without contacting Google.
    await page.route("https://accounts.google.com/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<p>Synthetic Google consent</p>",
      }),
    );
    await page.getByRole("button", { name: "Koppla Google" }).click();
    await expect(page).toHaveURL(/^https:\/\/accounts.google.com\//);
    const state = new URL(page.url()).searchParams.get("state");
    expect(state).toBeTruthy();
    await page.goto(
      `${origin}/api/auth/callback/google?state=${encodeURIComponent(state!)}&error=access_denied`,
    );
    await expect(page).toHaveURL(/\/settings\?accountLink=error/);
    await expect(
      page.getByRole("alert").filter({ hasText: "Google kunde inte kopplas" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Koppla Google" }),
    ).toBeEnabled();
  } finally {
    await other.close();
  }
});

test("visar Google-koppling och förklarar när lösenordsmejl inte är konfigurerat", async ({
  page,
  context,
}, testInfo) => {
  await setSession(context, `account-google-${testInfo.retry}`);
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Namn på hushållet").fill("Googlehushåll");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/settings");
  await expect(
    page.getByText("Google är kopplat till ditt konto."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Koppla Google" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Ändra lösenord" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Lägg till lösenord" }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "Att lägga till lösenord via e-post är inte tillgängligt just nu.",
    ),
  ).toBeVisible();
});
