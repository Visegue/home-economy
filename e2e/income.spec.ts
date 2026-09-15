import { expect, test } from "@playwright/test";
import { setSession } from "./helpers/session";

test("sparar valfri nettoinkomst vid onboarding och i inställningarna", async ({
  page,
  context,
}, testInfo) => {
  await setSession(context, `income-${testInfo.retry}`);
  await page.goto("/onboarding");
  await page
    .getByRole("textbox", { name: "Namn på hushållet" })
    .fill("Inkomsttest");
  const income = page.getByRole("textbox", {
    name: "Din månadsinkomst efter skatt (valfritt)",
  });
  await income.fill("-100");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Ange ett positivt belopp eller 0" }),
  ).toContainText("Ange ett positivt belopp eller 0");
  await expect(
    page.getByRole("textbox", { name: "Namn på hushållet" }),
  ).toHaveValue("Inkomsttest");
  await income.fill("32 500,75");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3000/");
  await page.goto("/settings");
  await page
    .getByRole("button", { name: "Ändra Månadsinkomst", exact: true })
    .click();
  const amount = page.getByLabel("Belopp per månad efter skatt (kr)");
  await expect(amount).toHaveValue("32500,75");
  await expect(
    page.getByRole("checkbox", { name: "Gäller tills vidare" }),
  ).toBeChecked();
  await amount.fill("34000,29");
  await page
    .getByRole("button", { name: "Spara inkomst", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await page
    .getByRole("button", { name: "Ändra Månadsinkomst", exact: true })
    .click();
  await expect(amount).toHaveValue("34000,29");
  await page.getByRole("button", { name: "Stäng", exact: true }).click();
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Månadens nyckeltal" }),
  ).toContainText("34 000");
});
