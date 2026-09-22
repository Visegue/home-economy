import { expect, test } from "@playwright/test";
import { setSession } from "./helpers/session";
import {
  currentPeriod,
  monthLabel,
  shiftPeriod,
} from "../src/features/budget/model";

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
  await expect(
    page.getByRole("button", { name: "Ändra Månadsinkomst", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Hantera inkomster", exact: true })
    .click();
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
  await expect(
    page.getByRole("button", { name: "Ändra Månadsinkomst", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Hantera inkomster", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ändra Månadsinkomst", exact: true })
    .click();
  await expect(amount).toHaveValue("34000,29");
  await page.getByRole("button", { name: "Stäng", exact: true }).click();
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Månadens nyckeltal" }),
  ).toContainText("34 000");

  await page.goto("/settings");
  await page.getByRole("button", { name: "Hantera inkomster" }).click();
  await page
    .getByRole("button", { name: "Ändra Månadsinkomst", exact: true })
    .click();
  const nextMonth = shiftPeriod(currentPeriod(), 1);
  await page.getByLabel("Ändringen gäller från").fill(nextMonth);
  await amount.fill("36000,50");
  await expect(page.getByRole("dialog")).toContainText(
    `Det gamla beloppet behålls till och med ${monthLabel(currentPeriod())}`,
  );
  await page.getByRole("button", { name: "Spara inkomst" }).click();
  await expect(page.getByRole("status")).toContainText(
    `Inkomsten uppdaterad från ${monthLabel(nextMonth)}`,
  );
  const rows = page
    .getByRole("list", { name: "Hushållets inkomster" })
    .getByRole("listitem");
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: "34\u00a0000,29" })).toContainText(
    monthLabel(currentPeriod()),
  );
  await expect(rows.filter({ hasText: "36\u00a0000,50" })).toContainText(
    monthLabel(nextMonth),
  );
  await page.reload();
  await expect(rows).toHaveCount(2);
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Månadens nyckeltal" }),
  ).toContainText("34 000");
});
