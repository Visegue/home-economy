import { expect, test } from "@playwright/test";
import { currentPeriod, shiftPeriod } from "../src/features/budget/model";
import { formatBudgetSek } from "../src/lib/money";
import { setSession } from "./helpers/session";

test("planerar avräkningar med påslag, inflation och separata månadsöverföringar", async ({
  page,
  context,
}, testInfo) => {
  const period = currentPeriod();
  await setSession(context, `settlement-${testInfo.retry}`);
  await page.goto("/onboarding");
  await page.getByLabel("Namn på hushållet").fill("Avräkningsfamiljen");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Lägg till familjemedlem" }).click();
  await page.getByLabel("Medlemmens namn").fill("Kim");
  await page.getByRole("button", { name: "Spara familjemedlem" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/");
  const card = page.getByRole("region", { name: "Avräkningar", exact: true });
  const transfers = page.getByRole("region", {
    name: "Att föra över",
    exact: true,
  });
  const settlementTransfer = transfers
    .getByText("Avräkningar", { exact: true })
    .locator("..");
  await expect(card).toContainText("Inga avräkningar ännu.");
  await card.getByRole("button", { name: "Lägg till avräkning" }).click();
  await expect(
    page.getByRole("radio", { name: "Avräkning", exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel("Påslag (%)", { exact: true })).toHaveValue(
    "10",
  );
  await expect(page.getByLabel("Inflation per år (%)")).toHaveValue("2");
  await page.getByLabel("Namn på utgiften").fill("Nya vitvaror");
  await page.getByLabel("Kostnad i dag (kr)").fill("12000");
  await page
    .getByLabel("Nästa utgiftsdatum")
    .fill(`${shiftPeriod(period, 24)}-01`);
  await page.getByRole("checkbox", { name: "Kim", exact: true }).check();
  await expect(page.getByLabel("Beräknat totalbelopp")).toHaveText(
    formatBudgetSek(1_373_328),
  );
  await expect(page.getByLabel("Beräknad månadsavsättning")).toHaveText(
    formatBudgetSek(57_222),
  );
  await page.getByRole("checkbox", { name: "Lägg till påslag" }).uncheck();
  await page.getByRole("checkbox", { name: "Räkna med inflation" }).uncheck();
  await expect(page.getByLabel("Beräknat totalbelopp")).toHaveText(
    formatBudgetSek(1_200_000),
  );
  await page.getByRole("checkbox", { name: "Lägg till påslag" }).check();
  await page.getByRole("checkbox", { name: "Räkna med inflation" }).check();
  await page.getByRole("button", { name: "Spara avräkning" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const table = card.getByRole("table", { name: "Planerade avräkningar" });
  const row = table.getByRole("row").filter({ hasText: "Nya vitvaror" });
  await expect(row.getByRole("cell").nth(1)).toHaveText(
    formatBudgetSek(57_222),
  );
  await expect(table.getByRole("columnheader")).toHaveText([
    "Namn",
    "Per månad",
    "Totalt undansparat",
  ]);
  await row.getByRole("button", { name: "Nya vitvaror", exact: true }).click();
  const details = page.getByRole("dialog", {
    name: "Nya vitvaror",
    exact: true,
  });
  await expect(details).toContainText(formatBudgetSek(1_373_328));
  await expect(
    details.getByRole("button", { name: "Ägare: Kim" }),
  ).toBeVisible();
  await details.getByRole("button", { name: "Stäng", exact: true }).click();
  await expect(
    table.getByRole("row").filter({ hasText: "Totalt per månad" }),
  ).toContainText(formatBudgetSek(57_222));

  await expect(settlementTransfer).toContainText(formatBudgetSek(57_222));
  await expect(transfers.getByLabel("Totalt att föra över")).toHaveText(
    formatBudgetSek(57_222),
  );
  await page.reload();
  await card
    .getByRole("button", { name: "Hantera avräkningar", exact: true })
    .click();
  await card.getByRole("button", { name: "Ändra Nya vitvaror" }).click();
  await expect(page.getByLabel("Påslag (%)", { exact: true })).toHaveValue(
    "10",
  );
  await expect(page.getByLabel("Inflation per år (%)")).toHaveValue("2");
  await page.getByRole("combobox", { name: "Typ av påslag" }).click();
  await page.getByRole("option", { name: "Kronor", exact: true }).click();
  await page.getByLabel("Påslag (kr)").fill("1000,50");
  await page.getByRole("checkbox", { name: "Räkna med inflation" }).uncheck();
  await expect(page.getByLabel("Beräknat totalbelopp")).toHaveText(
    formatBudgetSek(1_300_050),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Spara avräkning" }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "Spara avräkning" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(settlementTransfer).toContainText(formatBudgetSek(54_169));
  await expect(transfers.getByLabel("Totalt att föra över")).toHaveText(
    formatBudgetSek(54_169),
  );
  await page.reload();
  await row.getByRole("button", { name: "Nya vitvaror", exact: true }).click();
  await expect(details).toContainText("Utan inflation");
  await expect(details).toContainText(formatBudgetSek(100_050));
  const panelBounds = await details.boundingBox();
  expect(panelBounds!.width).toBeCloseTo(390, 1);
  await page.screenshot({
    path: testInfo.outputPath("settlement-details-mobile.png"),
    animations: "disabled",
  });
  await details.getByRole("button", { name: "Stäng", exact: true }).click();
  for (const title of [
    "Räcker inkomsten?",
    "Att föra över",
    "Utgifter",
    "Avräkningar",
    "Spara",
  ]) {
    const toggle = page.getByRole("button", {
      name: `Minimera ${title}`,
      exact: true,
    });
    const contentId = await toggle.getAttribute("aria-controls");
    const content = page.locator(`[id="${contentId}"]`);
    await expect(content).toBeVisible();
    await toggle.focus();
    await toggle.press("Enter");
    await expect(content).toBeHidden();
    const expand = page.getByRole("button", {
      name: `Expandera ${title}`,
      exact: true,
    });
    await expect(expand).toBeFocused();
    await expect(expand).toHaveAttribute("aria-expanded", "false");
    await expand.press("Space");
    await expect(content).toBeVisible();
  }

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("settlements-mobile.png"),
    fullPage: true,
  });
  await card
    .getByRole("button", { name: "Hantera avräkningar", exact: true })
    .click();
  await card.getByRole("button", { name: "Ändra Nya vitvaror" }).click();
  await expect(page.getByLabel("Påslag (kr)")).toHaveValue("1000,50");
  await expect(
    page.getByRole("checkbox", { name: "Räkna med inflation" }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Stäng", exact: true }).click();
  await card.getByRole("button", { name: "Avsluta Nya vitvaror" }).click();
  await page
    .getByRole("button", { name: "Bekräfta avslut av Nya vitvaror" })
    .click();
  await expect(card).toContainText("Inga avräkningar ännu.");
  await expect(settlementTransfer).toContainText(formatBudgetSek(0));
});
