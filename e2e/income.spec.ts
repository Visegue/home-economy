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
  await expect(income).toHaveValue("32500,75");

  await income.fill("34000,29");
  await page.getByRole("button", { name: "Spara inkomst" }).click();
  await expect(page.getByRole("status")).toHaveText("Inkomsten är sparad.");
  await page.reload();
  await expect(income).toHaveValue("34000,29");

  await income.fill("-100");
  await page.getByRole("button", { name: "Spara inkomst" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Ange ett positivt belopp eller 0" }),
  ).toContainText("Ange ett positivt belopp eller 0");
  await expect(income).toHaveValue("-100");
  await page.reload();
  await expect(income).toHaveValue("34000,29");

  await income.fill("0");
  await page.getByRole("button", { name: "Spara inkomst" }).click();
  await expect(page.getByRole("status")).toHaveText("Inkomsten är sparad.");
  await page.reload();
  await expect(income).toHaveValue("0,00");

  await income.fill("");
  await page.getByRole("button", { name: "Spara inkomst" }).click();
  await expect(page.getByRole("status")).toHaveText("Inkomsten är borttagen.");
  await page.reload();
  await expect(income).toHaveValue("");
});
