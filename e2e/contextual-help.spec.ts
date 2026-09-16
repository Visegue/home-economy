import { expect, test } from "@playwright/test";
import { setSession } from "./helpers/session";

test("öppnar formulärhjälp med tangentbord och touch utan att tappa inmatning", async ({
  page,
  context,
  browser,
}, testInfo) => {
  const token = `help-${testInfo.retry}`;
  await setSession(context, token);
  await page.goto("/onboarding");
  await page.getByLabel("Namn på hushållet").fill("Hjälptest");
  await page
    .getByRole("button", { name: "Information om din månadsinkomst" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Din månadsinkomst", exact: true }),
  ).toContainText("lägga till inkomster senare");
  await page.getByRole("button", { name: "Stäng information" }).click();
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3000/");

  await page.getByRole("button", { name: "Lägg till utgift" }).click();
  const expense = page.getByRole("dialog", {
    name: "Lägg till utgift",
    exact: true,
  });
  await expense.getByLabel("Namn på utgiften").fill("Årsförsäkring");
  const help = expense.getByRole("button", {
    name: "Information om utgiftstyper",
  });
  await expect(
    page.getByRole("dialog", { name: "Utgiftstyper", exact: true }),
  ).toHaveCount(0);
  await help.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Utgiftstyper", exact: true }),
  ).toContainText("årsförsäkring");
  await page.keyboard.press("Escape");
  await expect(help).toBeFocused();
  await expect(expense.getByLabel("Namn på utgiften")).toHaveValue(
    "Årsförsäkring",
  );
  await expect(
    expense.getByRole("radio", { name: "Direkt utgift", exact: true }),
  ).toBeChecked();
  await expense
    .getByRole("radio", { name: "Avsatt utgift", exact: true })
    .check();
  await expense.getByLabel("Belopp per betalning (kr)").fill("1200");
  await expect(expense).toContainText("100,00 kr per månad");
  await expense
    .getByRole("button", { name: "Information om månadsavsättningen" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Månadsavsättningen", exact: true }),
  ).toContainText("Kontots saldo");
  await page.screenshot({ path: testInfo.outputPath("expense-help.png") });
  await page.getByRole("button", { name: "Stäng information" }).click();
  await expense.getByRole("button", { name: "Stäng", exact: true }).click();

  await page.goto("/settings");
  await page
    .getByRole("button", { name: "Information om hushållets medlemmar" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Hushållets medlemmar", exact: true }),
  ).toContainText("skapar inget konto");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Lägg till inkomst", exact: true })
    .click();
  await page.getByRole("button", { name: "Information om inkomster" }).click();
  await expect(
    page.getByRole("dialog", { name: "Inkomster", exact: true }),
  ).toContainText("tidigare månaders belopp");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Stäng", exact: true }).click();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  try {
    await setSession(mobile, token);
    const mobilePage = await mobile.newPage();
    await mobilePage.goto("http://127.0.0.1:3000/");
    await mobilePage.getByRole("button", { name: "Lägg till sparande" }).tap();
    await mobilePage.getByLabel("Namn på sparandet").fill("Buffert");
    await mobilePage
      .getByRole("button", { name: "Information om månadssparande" })
      .tap();
    const savingsHelp = mobilePage.getByRole("dialog", {
      name: "Månadssparande",
      exact: true,
    });
    await expect(savingsHelp).toBeInViewport();
    await expect(savingsHelp).toContainText("kvar efter utgifter");
    await mobilePage.screenshot({
      path: testInfo.outputPath("savings-help-mobile.png"),
    });
    await mobilePage.getByRole("button", { name: "Stäng information" }).tap();
    await expect(mobilePage.getByLabel("Namn på sparandet")).toHaveValue(
      "Buffert",
    );
    await expect(
      mobilePage.getByRole("button", { name: "Spara sparande" }),
    ).toBeInViewport();
  } finally {
    await mobile.close();
  }
});
