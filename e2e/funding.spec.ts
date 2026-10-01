import { expect, test } from "@playwright/test";
import { setSession } from "./helpers/session";
import { currentPeriod, shiftPeriod } from "../src/features/budget/model";
import { dateLabel } from "../src/features/periods/model";

test("inaktiv avsatt utgift behåller överföringar men visar inget förväntat uttag", async ({
  page,
  context,
}, testInfo) => {
  const period = currentPeriod();
  await setSession(context, `funding-expense-${testInfo.retry}`);
  await page.goto("/onboarding");
  await page.getByLabel("Namn på hushållet").fill("Avsättningstest");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  await page.getByRole("button", { name: "Lägg till utgift" }).click();
  await page.getByRole("radio", { name: "Avsatt utgift" }).check();
  await page.getByLabel("Namn på utgiften").fill("Försäkring");
  await page.getByLabel("Belopp per betalning (kr)").fill("1200");
  await page.getByLabel("Nästa betalning").fill(`${period}-01`);
  await page.getByRole("button", { name: "Spara utgift" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("link", { name: "Överföringar och värden" }).click();
  await expect(page.getByText(/Förväntat uttag/)).toBeVisible();
  await page.getByRole("button", { name: "Registrera för Försäkring" }).click();
  await page.getByLabel("Faktiskt belopp (kr)").fill("500");
  await page.getByRole("button", { name: "Bekräfta registrering" }).click();
  await expect(page.getByRole("dialog").getByRole("status")).toBeVisible();
  await page.getByRole("button", { name: "Stäng", exact: true }).click();
  await page.goto("/");
  await page.getByRole("button", { name: "Hantera utgifter" }).click();
  await page
    .getByRole("button", { name: "Avsluta Försäkring", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Bekräfta avslut av Försäkring" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto(`/transfers?month=${period}`);
  await expect(page.getByText("Överföringshistorik (1)")).toBeVisible();
  await expect(page.locator("dd").nth(3)).toHaveText("500,00 kr");
  await expect(page.getByText(/Förväntat uttag/)).toHaveCount(0);
});

test("bekräftade överföringar är skilda från planen och hänförs till valfri månad", async ({
  page,
  context,
}, testInfo) => {
  test.slow();
  const period = currentPeriod(),
    previous = shiftPeriod(period, -1),
    next = shiftPeriod(period, 1);
  await setSession(context, `funding-${testInfo.retry}`);
  await page.goto("/onboarding");
  await page.getByLabel("Namn på hushållet").fill("Överföringstest");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  await page.getByRole("button", { name: "Lägg till sparande" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Namn").fill("Buffert");
  await dialog.getByLabel(/Belopp/).fill("1000");
  await dialog
    .getByLabel("Från och med", { exact: true })
    .fill(`${previous}-01`);
  await dialog.getByLabel("Planerad dag i månaden").fill("15");
  await dialog.getByRole("button", { name: "Spara sparande" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("link", { name: "Överföringar och värden" }).click();
  const card = page.locator('[data-slot="card"]').filter({
    has: page.getByRole("heading", {
      name: "Buffert",
      exact: true,
      includeHidden: true,
    }),
  });
  await expect(card).toContainText("Överföringshistorik (0)");
  await expect(card).toContainText(
    `Planerad insättningsdag: ${dateLabel(`${period}-15`)}`,
  );
  await expect(card.locator("dd").nth(3)).toHaveText("0,00 kr");

  async function transfer(
    kind: string,
    amount: string,
    date: string,
    month: string,
  ) {
    await card.getByRole("button", { name: "Registrera för Buffert" }).click();
    await dialog.getByRole("combobox", { name: "Händelse" }).click();
    await page
      .getByRole("option", {
        name:
          kind === "opening"
            ? "Ingående värde"
            : kind === "withdrawal"
              ? "Uttag"
              : "Insättning",
        exact: true,
      })
      .click();
    await dialog.getByLabel("Utfört datum").fill(date);
    await dialog.getByLabel("Faktiskt belopp (kr)").fill(amount);
    await dialog.getByLabel("Avser månad").fill(month);
    await dialog.getByRole("button", { name: "Bekräfta registrering" }).click();
  }
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let reached!: () => void;
  const requested = new Promise<void>((resolve) => {
    reached = resolve;
  });
  await page.route("**/transfers*", async (route) => {
    if (route.request().method() === "POST") {
      reached();
      await gate;
    }
    await route.continue();
  });
  try {
    await transfer("opening", "2000", `${previous}-01`, previous);
    await requested;
    await expect(
      dialog.getByRole("button", { name: "Sparar…" }),
    ).toBeDisabled();
    await dialog.getByRole("button", { name: "Stäng", exact: true }).click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(dialog).toBeVisible();
  } finally {
    release();
  }
  await expect(dialog.getByRole("status")).toBeVisible();
  await page.unroute("**/transfers*");
  await dialog.getByRole("button", { name: "Stäng", exact: true }).click();
  await expect(card).toContainText("Överföringshistorik (1)");
  await transfer("deposit", "700", `${period}-01`, previous);
  await expect(dialog.getByRole("status")).toBeVisible();
  await dialog.getByRole("button", { name: "Stäng", exact: true }).click();
  await expect(card.locator("dd").nth(1)).toHaveText("0,00 kr");
  await expect(card.locator("dd").nth(3)).toHaveText("2 700,00 kr");
  await page.getByLabel("Avser månad").fill(previous);
  await page.getByRole("button", { name: "Visa", exact: true }).click();
  await expect(card.locator("dd").nth(1)).toHaveText("700,00 kr");
  await expect(card.locator("dd").nth(4)).toHaveText("2 000,00 kr");

  await transfer("withdrawal", "3000", `${period}-01`, period);
  await expect(dialog.getByRole("alert")).toContainText("negativt");
  await expect(dialog.getByRole("combobox", { name: "Händelse" })).toHaveText(
    "Uttag",
  );
  await expect(dialog.getByLabel("Faktiskt belopp (kr)")).toHaveValue("3000");
  await expect(card).toContainText("Överföringshistorik (2)");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Bekräfta registrering" }).click();
  await expect(dialog.getByRole("status")).toBeVisible();
  await dialog.getByRole("button", { name: "Stäng", exact: true }).click();
  await expect(card.locator("dd").nth(3)).toHaveText("−300,00 kr");
  await expect(card).toContainText("Överföringshistorik (3)");

  await page.goto("/");
  await page.getByRole("button", { name: "Hantera sparande" }).click();
  await page
    .getByRole("button", { name: "Ändra Buffert", exact: true })
    .click();
  await dialog.getByLabel("Ändringen gäller från").fill(`${next}-10`);
  await dialog.getByLabel("Namn på sparandet").fill("Framtida buffert");
  await dialog.getByLabel(/Belopp/).fill("1500");
  await dialog.getByRole("button", { name: "Spara sparande" }).click();
  await expect(dialog).toHaveCount(0);
  await page
    .getByRole("button", { name: "Ändra Buffert", exact: true })
    .click();
  await expect(dialog).toContainText("Senare ändringar bevaras");
  await dialog.getByRole("combobox", { name: "Typ av ändring" }).click();
  await page.getByRole("option", { name: "Rätta denna version" }).click();
  await dialog.getByLabel(/Belopp/).fill("1200");
  await dialog.getByRole("button", { name: "Spara sparande" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByLabel("Välj månad").fill(next);
  await page.getByRole("button", { name: "Visa månad" }).click();
  await expect(
    page.getByRole("button", { name: "Hantera sparande" }),
  ).toBeVisible();
  await expect(page.getByText(/1\s500,00/).first()).toBeVisible();
  await page.goto(`/transfers?month=${previous}`);
  await expect(card).toContainText("Överföringshistorik (3)");
  await expect(card.locator("dd").nth(1)).toHaveText("700,00 kr");
  await expect(card.locator("dd").nth(3)).toHaveText("−300,00 kr");
  await card.getByRole("button", { name: "Registrera för Buffert" }).click();
  await expect(dialog).toHaveAccessibleName("Registrera för Buffert");
  await dialog.getByRole("button", { name: "Stäng", exact: true }).click();
  await page.goto(`/transfers?month=${period}`);
  await expect(card).toContainText("Överföringshistorik (3)");
  await page.goto(`/transfers?month=${next}`);
  await page
    .getByRole("button", { name: "Registrera för Framtida buffert" })
    .click();
  await expect(dialog).toHaveAccessibleName("Registrera för Framtida buffert");
  await dialog.getByRole("button", { name: "Stäng", exact: true }).click();
});
