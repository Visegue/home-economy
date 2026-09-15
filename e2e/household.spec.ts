import { expect, test } from "@playwright/test";
import { setSession } from "./session";

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
  await expect(page).toHaveURL("http://127.0.0.1:3000/");
  await expect(
    page.getByRole("region", { name: "Månadens nyckeltal" }),
  ).toBeVisible();
  await expect(page.getByText("Testfamiljen", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Testfamiljen", { exact: true })).toBeVisible();

  const returningContext = await browser.newContext();
  try {
    await setSession(returningContext, token);
    const returningPage = await returningContext.newPage();
    await returningPage.goto("http://127.0.0.1:3000/onboarding");
    await expect(returningPage).toHaveURL("http://127.0.0.1:3000/");
    await expect(
      returningPage.getByText("Testfamiljen", { exact: true }),
    ).toBeVisible();
  } finally {
    await returningContext.close();
  }
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
