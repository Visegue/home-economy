import { expect, test } from "@playwright/test";
import { setSession } from "./helpers/session";
import { currentPeriod, shiftPeriod } from "../src/features/budget/model";

test("registrerar medlemmar, inkomst och utgifter för aktuell månad", async ({
  page,
  context,
  browser,
}, testInfo) => {
  // This full journey covers setup, editing and household isolation.
  test.slow();
  const period = currentPeriod();
  const nextPeriod = shiftPeriod(period, 1);
  await setSession(context, `budget-${testInfo.retry}`);
  await page.goto("/onboarding");
  await page.getByLabel("Namn på hushållet").fill("Budgetfamiljen");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByText("Ingen aktiv inkomst", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Inga utgifter för den här månaden", { exact: true }),
  ).toBeVisible();

  await page.goto("/settings");
  const memberCard = page.locator('[data-slot="card"]').filter({
    has: page.getByRole("heading", { name: "Medlemmar i Budgetfamiljen" }),
  });
  await expect(memberCard.getByLabel("Medlemmens namn")).toHaveCount(0);
  await expect(
    memberCard.locator('[data-slot="card-action"]').getByRole("button", {
      name: "Lägg till familjemedlem",
    }),
  ).toBeVisible();
  for (const name of ["Kim", "Robin"]) {
    await page.getByRole("button", { name: "Lägg till familjemedlem" }).click();
    await page.getByLabel("Medlemmens namn").fill(name);
    await page.getByRole("button", { name: "Spara familjemedlem" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page
        .getByRole("list", { name: "Hushållets medlemmar" })
        .getByText(name, { exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Lägg till familjemedlem" }).click();
  await page.getByLabel("Medlemmens namn").fill("Kim");
  await page.getByRole("button", { name: "Spara familjemedlem" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText(
    "Det finns redan en medlem med det namnet.",
  );
  await page.getByRole("button", { name: "Stäng", exact: true }).click();

  await expect(
    page
      .locator('[data-slot="card"]')
      .filter({
        has: page.getByRole("heading", { name: "Hushållets inkomster" }),
      })
      .locator('[data-slot="card-action"]')
      .getByRole("button", { name: "Lägg till inkomst" }),
  ).toBeVisible();

  async function addIncome(
    name: string,
    amount: string,
    start: string,
    end = "",
  ) {
    await page
      .getByRole("button", { name: "Lägg till inkomst", exact: true })
      .click();
    await page.getByLabel("Namn på inkomsten").fill(name);
    await page.getByLabel("Belopp per månad efter skatt (kr)").fill(amount);
    await page.getByLabel("Från och med", { exact: true }).fill(start);
    await expect(
      page.getByRole("checkbox", { name: "Gäller tills vidare" }),
    ).toBeChecked();
    await expect(page.getByLabel("Till och med", { exact: true })).toHaveCount(
      0,
    );
    if (end) {
      await page
        .getByRole("checkbox", { name: "Gäller tills vidare" })
        .uncheck();
      await page.getByLabel("Till och med", { exact: true }).fill(end);
    }
    await page
      .getByRole("button", { name: "Spara inkomst", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await addIncome("Lön", "29000", period);
  await addIncome("Bidrag", "1000,50", period);
  await page.getByRole("button", { name: "Ändra Lön", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Gäller tills vidare" }),
  ).toBeChecked();
  await page.getByRole("checkbox", { name: "Gäller tills vidare" }).uncheck();
  await page.getByLabel("Till och med").fill(period);
  await page
    .getByRole("button", { name: "Spara inkomst", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Ändra Lön", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Gäller tills vidare" }),
  ).not.toBeChecked();
  await page.getByRole("checkbox", { name: "Gäller tills vidare" }).check();
  await page
    .getByRole("button", { name: "Spara inkomst", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  const salary = page
    .getByRole("list", { name: "Hushållets inkomster" })
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Lön", exact: true }) });
  await expect(salary).toContainText("tills vidare");
  await page.getByRole("button", { name: "Ändra Lön", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Gäller tills vidare" }),
  ).toBeChecked();
  await page.getByRole("checkbox", { name: "Gäller tills vidare" }).uncheck();
  await expect(page.getByLabel("Till och med", { exact: true })).toBeEmpty();
  await page.getByLabel("Till och med", { exact: true }).fill(period);
  await page
    .getByRole("button", { name: "Spara inkomst", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await addIncome("Ny lön", "8999,50", nextPeriod);
  await page.reload();
  await expect(
    page
      .getByRole("list", { name: "Hushållets inkomster" })
      .getByRole("listitem"),
  ).toHaveCount(3);
  await page.goto("/?month=1900-01");
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page
      .locator('[data-slot="card"]')
      .filter({
        has: page.getByRole("heading", { name: "Utgifter", exact: true }),
      })
      .locator('[data-slot="card-action"]')
      .getByRole("button", { name: "Lägg till utgift" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /inkomst/i })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Registrera inkomst" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Välj månad")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /föregående|nästa månad/i }),
  ).toHaveCount(0);
  await expect(page.getByText(/Månad för månad/)).toHaveCount(0);

  await page.getByRole("button", { name: "Lägg till utgift" }).click();
  await expect(page.getByLabel("Från och med", { exact: true })).toHaveValue(
    period,
  );
  await page.getByLabel("Namn på utgiften").fill("Hyra");
  await page.getByLabel("Belopp per betalning (kr)").fill("10000");
  await page.getByRole("checkbox", { name: "Kim", exact: true }).check();
  await page.getByRole("checkbox", { name: "Robin", exact: true }).check();
  await page.getByRole("button", { name: "Spara utgift" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const rent = page.getByRole("row").filter({ hasText: "Hyra" });
  await expect(rent).toContainText("Kim, Robin");

  for (const [name, cycle, date, amount] of [
    ["Bilförsäkring", "Kvartalsvis", `${shiftPeriod(period, 2)}-01`, "3000"],
    ["Service", "Halvårsvis", `${shiftPeriod(period, 5)}-01`, "1200"],
    ["Hemförsäkring", "Årsvis", `${shiftPeriod(period, 11)}-01`, "2400"],
    ["Besiktning", "Vartannat år", `${shiftPeriod(period, 23)}-01`, "4800"],
  ]) {
    await page.getByRole("button", { name: "Lägg till utgift" }).click();
    await page.getByRole("radio", { name: "Avsatt utgift" }).check();
    await page.getByLabel("Namn på utgiften").fill(name);
    await page.getByLabel("Belopp per betalning (kr)").fill(amount);
    await page.getByRole("combobox", { name: "Hur ofta?" }).click();
    await page.getByRole("option", { name: cycle, exact: true }).click();
    await page.getByLabel("Nästa betalning").fill(date);
    await page.getByRole("button", { name: "Spara utgift" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("row").filter({ hasText: name })).toContainText(
      "Ingen vald",
    );
  }
  const summary = page.getByRole("region", { name: "Månadens nyckeltal" });
  await expect(summary).toContainText("11 600,00".replaceAll(" ", "\u00a0"));
  await expect(summary).toContainText("18 400,50".replaceAll(" ", "\u00a0"));
  await expect(summary).toContainText("1 600,00".replaceAll(" ", "\u00a0"));
  await page.reload();
  await expect(rent).toContainText("Kim, Robin");
  await expect(
    page.getByRole("row").filter({ hasText: "Bilförsäkring" }),
  ).toContainText(`${shiftPeriod(period, 2)}-01`);

  await page.getByRole("button", { name: "Lägg till utgift" }).click();
  await page.getByLabel("Namn på utgiften").fill("Ogiltigt belopp");
  await page.getByLabel("Belopp per betalning (kr)").fill("-50");
  await page.getByRole("button", { name: "Spara utgift" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Ange ett belopp",
  );
  await expect(page.getByLabel("Namn på utgiften")).toHaveValue(
    "Ogiltigt belopp",
  );
  await page.getByRole("button", { name: "Stäng", exact: true }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("budget-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Lägg till utgift" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("budget-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Lägg till utgift" }).click();
  await page.getByRole("radio", { name: "Avsatt utgift" }).check();
  await expect(
    page.getByRole("button", { name: "Spara utgift" }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "Stäng", exact: true }).click();

  await page.getByRole("button", { name: "Ändra Hyra", exact: true }).click();
  await expect(page.getByLabel("Ändringen gäller från")).toHaveValue(period);
  await page.getByLabel("Belopp per betalning (kr)").fill("11000,25");
  await page.getByRole("button", { name: "Spara utgift", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(rent).toContainText("11 000,25 kr");
  await expect(rent).toContainText("Kim, Robin");

  await page
    .getByRole("button", { name: "Avsluta Besiktning", exact: true })
    .click();
  await page.getByRole("button", { name: "Avbryt", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Besiktning" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Avsluta Besiktning", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Avsluta", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "Besiktning" }),
  ).toHaveCount(0);

  await page.goto("/settings");
  await expect(
    page
      .getByRole("list", { name: "Hushållets inkomster" })
      .getByRole("listitem"),
  ).toHaveCount(3);
  await page.getByRole("button", { name: "Ändra Ny lön", exact: true }).click();
  await page.getByRole("checkbox", { name: "Gäller tills vidare" }).uncheck();
  await page.getByLabel("Till och med").fill(period);
  await page
    .getByRole("button", { name: "Spara inkomst", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Till och med").fill(shiftPeriod(period, 3));
  await page
    .getByRole("button", { name: "Spara inkomst", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Ta bort Bidrag", exact: true })
    .click();
  await page.getByRole("button", { name: "Bekräfta borttagning" }).click();
  await expect(
    page
      .getByRole("list", { name: "Hushållets inkomster" })
      .getByRole("listitem"),
  ).toHaveCount(2);
  await page.goto(`/?month=${nextPeriod}`);
  await expect(page).toHaveURL(/\/$/);
  await expect(summary).toContainText("29 000,00".replaceAll(" ", "\u00a0"));
  await expect(
    page.getByRole("row").filter({ hasText: "Besiktning" }),
  ).toHaveCount(0);
  await expect(rent).toContainText("11 000,25 kr");

  const outsiderContext = await browser.newContext();
  try {
    await setSession(outsiderContext, `budget-outsider-${testInfo.retry}`);
    const outsider = await outsiderContext.newPage();
    const origin = new URL(page.url()).origin;
    await outsider.goto(`${origin}/onboarding`);
    await outsider.getByLabel("Namn på hushållet").fill("Annat hushåll");
    await outsider.getByRole("button", { name: "Skapa mitt hushåll" }).click();
    await expect(outsider).toHaveURL(`${origin}/`);
    await expect(
      outsider.getByText("Inga utgifter för den här månaden", { exact: true }),
    ).toBeVisible();
    await outsider.goto(`${origin}/settings`);
    await expect(
      outsider.getByText("Inga medlemmar tillagda ännu."),
    ).toBeVisible();
  } finally {
    await outsiderContext.close();
  }
});
