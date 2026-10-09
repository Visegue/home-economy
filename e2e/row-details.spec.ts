import { expect, test } from "@playwright/test";
import { setSession } from "./helpers/session";
import { currentPeriod, shiftPeriod } from "../src/features/budget/model";

test("öppnar postdetaljer från belopp och återför fokus till namnet", async ({
  page,
  context,
  browser,
}, testInfo) => {
  test.slow(); // This journey provisions the household through public forms.
  await setSession(context, `row-details-${testInfo.retry}`);
  await page.goto("/onboarding");
  await page.getByLabel("Namn på hushållet").fill("Radtest");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  await page.getByRole("button", { name: "Lägg till sparande" }).click();
  await page.getByLabel("Namn på sparandet").fill("Radens sparande");
  await page.getByLabel("Belopp per månad (kr)").fill("1000");
  await page.getByRole("button", { name: "Spara sparande" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const row = page
    .getByRole("table", { name: "Månadssparande" })
    .getByRole("row")
    .filter({ hasText: "Radens sparande" });
  await row.getByRole("cell").nth(1).click();
  const details = page.getByRole("dialog", {
    name: "Radens sparande",
    exact: true,
  });
  await expect(details).toBeVisible();
  await expect(details).toContainText("1 000,00 kr");
  await details.getByRole("button", { name: "Stäng", exact: true }).click();
  await expect(
    row.getByRole("button", { name: "Radens sparande", exact: true }),
  ).toBeFocused();
  const period = currentPeriod();
  for (const [type, name] of [
    ["Direkt utgift", "Radens direkta"],
    ["Avsatt utgift", "Radens avsatta"],
    ["Avräkning", "Radens avräkning"],
  ]) {
    await page.getByRole("button", { name: "Lägg till utgift" }).click();
    await page.getByRole("radio", { name: type, exact: true }).check();
    await page.getByLabel("Namn på utgiften").fill(name);
    if (type === "Avräkning") {
      await page.getByLabel("Kostnad i dag (kr)").fill("12000");
      await page
        .getByLabel("Nästa utgiftsdatum")
        .fill(`${shiftPeriod(period, 24)}-01`);
      await page.getByRole("checkbox", { name: "Lägg till påslag" }).uncheck();
      await page
        .getByRole("checkbox", { name: "Räkna med inflation" })
        .uncheck();
      await page.getByRole("button", { name: "Spara avräkning" }).click();
    } else {
      await page.getByLabel("Belopp per betalning (kr)").fill("1200");
      if (type === "Avsatt utgift")
        await page
          .getByLabel("Nästa betalning")
          .fill(`${shiftPeriod(period, 12)}-01`);
      await page.getByRole("button", { name: "Spara utgift" }).click();
    }
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  const cases = [
    {
      table: "Direkta utgifter",
      name: "Radens direkta",
      manage: "utgifter",
      edit: "Ändra utgift",
    },
    {
      table: "Avsatta utgifter",
      name: "Radens avsatta",
      manage: "utgifter",
      edit: "Ändra utgift",
    },
    {
      table: "Planerade avräkningar",
      name: "Radens avräkning",
      manage: "avräkningar",
      edit: "Ändra avräkning",
    },
    {
      table: "Månadssparande",
      name: "Radens sparande",
      manage: "sparande",
      edit: "Ändra sparande",
    },
  ];
  for (const item of cases) {
    const table = page.getByRole("table", { name: item.table, exact: true });
    const row = table.getByRole("row").filter({ hasText: item.name });
    const name = row.getByRole("button", { name: item.name, exact: true });
    const panel = page.getByRole("dialog", { name: item.name, exact: true });
    await expect(row.getByRole("button")).toHaveCount(1);
    expect(await row.evaluate((element) => element.tagName)).toBe("TR");
    await expect(row).not.toHaveAttribute("tabindex");
    await row.getByRole("cell").nth(1).click();
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(name).toBeFocused();
    await row
      .getByRole("cell")
      .first()
      .click({ position: { x: 2, y: 2 } });
    await expect(panel).toBeVisible();
    await panel.getByRole("button", { name: "Stäng", exact: true }).click();
    await expect(name).toBeFocused();
    for (const key of ["Enter", "Space"]) {
      await name.press(key);
      await expect(panel).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(name).toBeFocused();
    }
    if (item.table !== "Direkta utgifter") {
      await row.getByRole("cell").nth(2).click();
      await expect(panel).toBeVisible();
      await panel.getByRole("button", { name: "Stäng", exact: true }).click();
    }
    await table
      .getByRole("columnheader", { name: "Per månad", exact: true })
      .click();
    await table
      .getByRole("row")
      .filter({ hasText: "Totalt per månad" })
      .getByRole("cell")
      .nth(1)
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Drag and copy actual selectable amount text; never activate details.
    const amount = row.getByRole("cell").nth(1).locator("span");
    await amount.scrollIntoViewIfNeeded();
    const textBox = (await amount.boundingBox())!;
    await page.mouse.move(textBox.x + 1, textBox.y + textBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      textBox.x + textBox.width - 1,
      textBox.y + textBox.height / 2,
      { steps: 8 },
    );
    await page.mouse.up();
    expect(
      await page.evaluate(() => window.getSelection()?.toString()),
    ).not.toBe("");
    await page.keyboard.press("ControlOrMeta+c");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.evaluate(() => window.getSelection()?.removeAllRanges());

    // A drag across blank row padding is a gesture, not a click.
    const box = (await row.getByRole("cell").first().boundingBox())!;
    await page.mouse.move(box.x + 2, box.y + box.height - 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 40, box.y + box.height - 2, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await row
    .getByRole("button", { name: "Radens sparande", exact: true })
    .focus();
  await row.hover();
  await page.screenshot({
    path: testInfo.outputPath("row-details-desktop-focus.png"),
    animations: "disabled",
  });
  for (const label of ["utgifter", "avräkningar", "sparande"]) {
    await page
      .getByRole("button", { name: `Hantera ${label}`, exact: true })
      .click();
  }
  for (const item of cases) {
    const row = page
      .getByRole("table", { name: item.table, exact: true })
      .getByRole("row")
      .filter({ hasText: item.name });
    await row.getByRole("cell").nth(1).click();
    await expect(
      page.getByRole("dialog", { name: item.name, exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await row
      .getByRole("button", { name: `Ändra ${item.name}`, exact: true })
      .click();
    const form = page.getByRole("dialog", { name: item.edit, exact: true });
    await expect(form).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await form.getByRole("heading").click(); // Portal content must not bubble into the row.
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await form.getByRole("button", { name: "Stäng", exact: true }).click();
    await row
      .getByRole("button", { name: `Avsluta ${item.name}`, exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Avbryt", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  const mobileContext = await browser.newContext({
    baseURL: new URL(page.url()).origin,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  try {
    await setSession(mobileContext, `row-details-${testInfo.retry}`);
    const mobile = await mobileContext.newPage();
    await mobile.goto("/");
    for (const item of cases) {
      const row = mobile
        .getByRole("table", { name: item.table, exact: true })
        .getByRole("row")
        .filter({ hasText: item.name });
      await row.getByRole("cell").nth(1).tap();
      const panel = mobile.getByRole("dialog", {
        name: item.name,
        exact: true,
      });
      await expect(panel).toBeVisible();
      await panel.getByRole("button", { name: "Stäng", exact: true }).tap();
      await expect(
        row.getByRole("button", { name: item.name, exact: true }),
      ).toBeFocused();
    }
    const row = mobile
      .getByRole("table", { name: "Månadssparande" })
      .getByRole("row")
      .filter({ hasText: "Radens sparande" });
    await row.scrollIntoViewIfNeeded();
    const box = (await row.boundingBox())!;
    const scrollBefore = await mobile.evaluate(() => window.scrollY);
    const cdp = await mobileContext.newCDPSession(mobile);
    const x = box.x + 10,
      y = box.y + box.height / 2;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: y + 50 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: y + 100 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(mobile.getByRole("dialog")).toHaveCount(0);
    await expect
      .poll(() => mobile.evaluate(() => window.scrollY))
      .toBeLessThan(scrollBefore);
    await row.getByRole("cell").nth(1).tap();
    await mobile.screenshot({
      path: testInfo.outputPath("row-details-mobile-panel.png"),
      animations: "disabled",
    });
    await mobile
      .getByRole("dialog")
      .getByRole("button", { name: "Stäng", exact: true })
      .tap();
    await mobile.setViewportSize({ width: 320, height: 844 });
    expect(
      await mobile.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await mobile.screenshot({
      path: testInfo.outputPath("row-details-mobile.png"),
      fullPage: true,
      animations: "disabled",
    });
  } finally {
    await mobileContext.close();
  }
});

test("visar rätt identitet och datumversion för likadana namn vid historiknavigation", async ({
  page,
  context,
}, testInfo) => {
  test.slow();
  await setSession(context, `row-identities-${testInfo.retry}`);
  await page.goto("/onboarding");
  await page.getByLabel("Namn på hushållet").fill("Identitetstest");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/?month=2027-01");
  await expect(page.getByLabel("Välj månad")).toHaveValue("2027-01");
  for (const amount of ["100", "200"]) {
    await page.getByRole("button", { name: "Lägg till sparande" }).click();
    await page.getByLabel("Namn på sparandet").fill("Delat namn");
    await page.getByLabel("Belopp per månad (kr)").fill(amount);
    await page.getByRole("button", { name: "Spara sparande" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  const table = page.getByRole("table", { name: "Månadssparande" });
  const first = table.getByRole("row").filter({
    has: page.getByRole("cell", { name: "100,00 kr", exact: true }),
  });
  const second = table.getByRole("row").filter({
    has: page.getByRole("cell", { name: "200,00 kr", exact: true }),
  });
  await page
    .getByRole("button", { name: "Hantera sparande", exact: true })
    .click();
  await first
    .getByRole("button", { name: "Ändra Delat namn", exact: true })
    .click();
  await page.getByLabel("Ändringen gäller från").fill("2027-02-01");
  await page.getByLabel("Belopp per månad (kr)").fill("300");
  await page.getByRole("button", { name: "Spara sparande" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const details = page.getByRole("dialog", { name: "Delat namn", exact: true });
  await first.getByRole("cell").nth(1).click();
  await expect(
    details
      .locator("dt")
      .filter({ hasText: "Månadsbelopp vid månadsslut" })
      .locator("..")
      .locator("dd"),
  ).toHaveText("100,00 kr");
  await expect(details).toContainText("31 jan. 2027");
  const firstLink = await details
    .getByRole("link", {
      name: "Registrera överföring för Delat namn",
      exact: true,
    })
    .getAttribute("href");
  await details.getByRole("button", { name: "Stäng", exact: true }).click();
  await second.getByRole("cell").nth(1).click();
  await expect(
    details
      .locator("dt")
      .filter({ hasText: "Månadsbelopp vid månadsslut" })
      .locator("..")
      .locator("dd"),
  ).toHaveText("200,00 kr");
  const secondLink = await details
    .getByRole("link", {
      name: "Registrera överföring för Delat namn",
      exact: true,
    })
    .getAttribute("href");
  expect(firstLink).not.toBe(secondLink);
  expect(firstLink).toContain("month=2027-01#purpose-");
  expect(secondLink).toContain("month=2027-01#purpose-");
  await details.getByRole("button", { name: "Stäng", exact: true }).click();
  await page.getByLabel("Välj månad").fill("2027-02");
  await expect(page.getByLabel("Välj månad")).toHaveValue("2027-02");
  const updated = table.getByRole("row").filter({
    has: page.getByRole("cell", { name: "300,00 kr", exact: true }),
  });
  await updated.getByRole("cell").nth(1).click();
  await expect(
    details
      .locator("dt")
      .filter({ hasText: "Månadsbelopp vid månadsslut" })
      .locator("..")
      .locator("dd"),
  ).toHaveText("300,00 kr");
  await expect(
    details.getByRole("region", { name: "Månadens planuppföljning" }),
  ).toContainText("februari 2027");
  await page.goBack();
  await expect(page.getByLabel("Välj månad")).toHaveValue("2027-01");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await first.getByRole("cell").nth(1).click();
  await expect(details).toContainText("100,00 kr");
  await page.goForward();
  await expect(page.getByLabel("Välj månad")).toHaveValue("2027-02");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await updated.getByRole("cell").nth(1).click();
  await details
    .getByRole("link", {
      name: "Registrera överföring för Delat namn",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/transfers\?month=2027-02#purpose-/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(updated).toBeVisible();
});
