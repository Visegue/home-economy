import { expect, test } from "@playwright/test";
import { setSession } from "./helpers/session";

test("öppnar formulärhjälp med tangentbord och touch utan att tappa inmatning", async ({
  page,
  context,
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
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
  await page.getByRole("button", { name: "Lägg till familjemedlem" }).click();
  await page.getByLabel("Medlemmens namn").fill("Kim");
  await page
    .getByRole("button", { name: "Information om hushållets medlemmar" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Hushållets medlemmar", exact: true }),
  ).toContainText("skapar inget konto");
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Medlemmens namn")).toHaveValue("Kim");
  await page.getByRole("button", { name: "Stäng", exact: true }).click();
  await page
    .getByRole("button", { name: "Lägg till inkomst", exact: true })
    .click();
  await expect(page.getByLabel("Namn på inkomsten")).toBeFocused();
  await page.getByRole("button", { name: "Information om inkomster" }).click();
  await expect(
    page.getByRole("dialog", { name: "Inkomster", exact: true }),
  ).toContainText("tidigare månaders belopp");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Stäng", exact: true }).click();
  const memberTrigger = page.getByRole("button", {
    name: "Lägg till familjemedlem",
  });
  await memberTrigger.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Lägg till familjemedlem" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(memberTrigger).toBeFocused();

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
    await mobilePage.getByRole("button", { name: "Stäng" }).tap();
    await mobilePage.setViewportSize({ width: 320, height: 640 });

    for (const label of ["Lägg till sparande", "Lägg till utgift"]) {
      const trigger = mobilePage.getByRole("button", { name: label });
      const bounds = await trigger.boundingBox();
      expect(bounds?.width).toBeGreaterThanOrEqual(44);
      expect(bounds?.height).toBeGreaterThanOrEqual(44);
      await trigger.tap();
      const dialog = mobilePage.getByRole("dialog", { name: label });
      await expect(dialog).toBeInViewport();
      expect(
        await mobilePage.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await dialog.getByRole("button", { name: "Stäng" }).tap();
    }

    await mobilePage.goto("http://127.0.0.1:3000/settings");
    for (const label of ["Lägg till inkomst", "Lägg till familjemedlem"]) {
      const trigger = mobilePage.getByRole("button", { name: label });
      const bounds = await trigger.boundingBox();
      expect(bounds?.width).toBeGreaterThanOrEqual(44);
      expect(bounds?.height).toBeGreaterThanOrEqual(44);
      await trigger.tap();
      const dialog = mobilePage.getByRole("dialog", { name: label });
      await expect(dialog).toBeInViewport();
      await expect(dialog).toBeFocused();
      expect(
        await mobilePage.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await dialog.getByRole("button", { name: "Stäng" }).tap();
    }

    const incomeTrigger = mobilePage.getByRole("button", {
      name: "Lägg till inkomst",
      exact: true,
    });
    await incomeTrigger.tap();
    const incomeDialog = mobilePage.getByRole("dialog", {
      name: "Lägg till inkomst",
      exact: true,
    });
    await incomeDialog.getByLabel("Namn på inkomsten").fill("Mobilinkomst");

    // Simulate a keyboard that shrinks only the visual viewport, as on phones.
    // Resizing the Playwright window alone would also shrink dvh and miss this bug.
    await mobilePage.evaluate(() => {
      const viewport = window.visualViewport!;
      Object.defineProperty(viewport, "height", {
        configurable: true,
        value: 280,
      });
      viewport.dispatchEvent(new Event("resize"));
    });
    await expect
      .poll(async () => {
        const bounds = await incomeDialog.boundingBox();
        return !!bounds && bounds.y >= 16 && bounds.y + bounds.height <= 264;
      })
      .toBe(true);

    // Browsers can also pan the visual viewport while a field has focus.
    await mobilePage.evaluate(() => {
      const viewport = window.visualViewport!;
      Object.defineProperty(viewport, "offsetTop", {
        configurable: true,
        value: 48,
      });
      viewport.dispatchEvent(new Event("scroll"));
    });
    await expect
      .poll(async () => {
        const bounds = await incomeDialog.boundingBox();
        return !!bounds && bounds.y >= 64 && bounds.y + bounds.height <= 312;
      })
      .toBe(true);
    expect(await mobilePage.evaluate(() => window.innerHeight)).toBe(640);
    await incomeDialog
      .getByLabel("Belopp per månad efter skatt (kr)")
      .fill("1234");
    const saveIncome = incomeDialog.getByRole("button", {
      name: "Spara inkomst",
    });
    await saveIncome.scrollIntoViewIfNeeded();
    const saveBounds = await saveIncome.boundingBox();
    expect(saveBounds!.y).toBeGreaterThanOrEqual(64);
    expect(saveBounds!.y + saveBounds!.height).toBeLessThanOrEqual(312);
    await saveIncome.tap();
    await expect(incomeDialog).toHaveCount(0);
    await expect(
      mobilePage.getByText("Mobilinkomst", { exact: true }),
    ).toBeVisible();
    await expect(incomeTrigger).toBeFocused();

    await mobilePage.evaluate(() => {
      const viewport = window.visualViewport!;
      Reflect.deleteProperty(viewport, "height");
      Reflect.deleteProperty(viewport, "offsetTop");
      viewport.dispatchEvent(new Event("resize"));
    });
    await incomeTrigger.tap();
    await expect(incomeDialog).toBeInViewport({ ratio: 1 });
    await expect(
      incomeDialog.getByRole("button", { name: "Spara inkomst" }),
    ).toBeInViewport({ ratio: 1 });
    await incomeDialog
      .getByRole("button", { name: "Stäng", exact: true })
      .tap();
  } finally {
    await mobile.close();
  }
});
