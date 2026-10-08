import { expect, test, type Page } from "@playwright/test";
import { setSession } from "./helpers/session";
import { currentPeriod } from "../src/features/budget/model";

test("väljer månad direkt och bevarar parametrar, data och historik", async ({
  page,
  context,
}, testInfo) => {
  await setSession(context, `month-navigation-${testInfo.retry}`);
  await createJanuarySaving(page);

  await page.goto("/?month=2026-12&view=compact&view=other");
  const month = page.getByLabel("Välj månad");
  const transfers = page.getByRole("region", { name: "Att föra över" });
  await expect(transfers).toContainText("december 2026");
  await expect(
    page.getByRole("button", { name: "Januarisparande", exact: true }),
  ).toHaveCount(0);
  await month.fill("2027-01");
  await expect(page).toHaveURL(/month=2027-01&view=compact&view=other/);
  await expect(month).toHaveValue("2027-01");
  await expect(transfers).toContainText("januari 2027");
  await expect(
    page.getByRole("button", { name: "Januarisparande", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Januarisparande", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Januarisparande", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(month).toHaveValue("2026-12");
  await expect(transfers).toContainText("december 2026");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goForward();
  await expect(month).toHaveValue("2027-01");
  await page.reload();
  await expect(month).toHaveValue("2027-01");
  await expect(transfers).toContainText("januari 2027");
  await expect(page.getByRole("button", { name: "Visa månad" })).toHaveCount(0);
  const historyLength = await page.evaluate(() => history.length);
  await month.fill("");
  await expect(page).toHaveURL(/month=2027-01&view=compact&view=other/);
  await month.fill("2200-01");
  await expect(page).toHaveURL(/month=2027-01&view=compact&view=other/);
  await month.fill("1899-12");
  await expect(page).toHaveURL(/month=2027-01&view=compact&view=other/);
  await month.fill("2027-01");
  expect(await page.evaluate(() => history.length)).toBe(historyLength);

  const previous = page.getByRole("button", { name: "Föregående månad" });
  const next = page.getByRole("button", { name: "Nästa månad" });
  await previous.focus();
  await page.keyboard.press("Enter");
  await expect(month).toHaveValue("2026-12");
  await expect(previous).toBeFocused();
  await next.click();
  await expect(month).toHaveValue("2027-01");
  await expect(next).toBeFocused();
  await page.goto("/?month=1900-01");
  await expect(previous).toBeDisabled();
  await next.click();
  await expect(month).toHaveValue("1900-02");
  await page.goto("/?month=2199-12");
  await expect(next).toBeDisabled();
  await previous.click();
  await expect(month).toHaveValue("2199-11");
  const today = page.getByRole("button", { name: "Denna månad" });
  await today.click();
  await expect(month).toHaveValue(currentPeriod());
  const currentHistoryLength = await page.evaluate(() => history.length);
  await today.click();
  expect(await page.evaluate(() => history.length)).toBe(currentHistoryLength);
  await page.goto("/?month=2200-01");
  await expect(page).toHaveURL("http://127.0.0.1:3000/");
  await expect(month).toHaveValue(currentPeriod());
});

test("visar diskret vänteläge på mobil och bevarar fokus även efter avbruten navigation", async ({
  browser,
}, testInfo) => {
  test.setTimeout(60_000);
  const context = await browser.newContext({
    viewport: { width: 320, height: 640 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  try {
    await setSession(context, `month-pending-${testInfo.retry}`);
    const page = await context.newPage();
    await createJanuarySaving(page);
    await page.goto("/?month=2026-12");
    const month = page.getByLabel("Välj månad");
    const previous = page.getByRole("button", { name: "Föregående månad" });
    const next = page.getByRole("button", { name: "Nästa månad" });
    const today = page.getByRole("button", { name: "Denna månad" });
    const transfers = page.getByRole("region", { name: "Att föra över" });
    const status = page
      .getByRole("status")
      .filter({ hasText: "Laddar månad…" });
    const delayed = await holdMonth(page, "2027-01");
    await next.focus();
    await page.evaluate(() => window.scrollTo(0, 200));
    const scroll = await page.evaluate(() => window.scrollY);
    const before = await transfers.boundingBox();
    try {
      await page.keyboard.press("Enter");
      await delayed.requested;
      await expect(status).toBeVisible();
      for (const control of [month, previous, next, today]) {
        await expect(control).toBeDisabled();
      }
      await expect(month).toHaveValue("2026-12");
      await expect(transfers).toContainText("december 2026");
      await expect(
        page.getByLabel("Totalt att föra över", { exact: true }),
      ).toHaveText("0,00 kr");
      await expect(next).toBeFocused();
      await page.keyboard.press("Enter");
      expect((await transfers.boundingBox())!.y).toBe(before!.y);
      expect(
        await status
          .locator("svg")
          .evaluate((icon) => getComputedStyle(icon).animationName),
      ).toBe("none");
      expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
      // A full-page mobile capture resizes the viewport and changes its scroll.
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: testInfo.outputPath("month-navigation-pending-mobile.png"),
        animations: "disabled",
      });
      await page.evaluate((y) => window.scrollTo(0, y), scroll);
      expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
    } finally {
      delayed.release();
    }
    await expect(month).toHaveValue("2027-01");
    await expect(status).toHaveCount(0);
    await expect(next).toBeEnabled();
    await expect(next).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
    await expect(transfers).toContainText("januari 2027");
    await expect(
      page.getByLabel("Totalt att föra över", { exact: true }),
    ).toHaveText("1 000,00 kr");
    await next.tap();
    await expect(month).toHaveValue("2027-02");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("month-navigation-mobile.png"),
      fullPage: true,
      animations: "disabled",
    });

    const interrupted = await holdMonth(page, "2027-03");
    try {
      await month.fill("2027-03");
      await interrupted.requested;
      await expect(status).toBeVisible();
      await page
        .getByRole("link", { name: "Inställningar", exact: true })
        .tap();
      await expect(page).toHaveURL(/\/settings$/);
    } finally {
      interrupted.release();
    }
    await page.goBack();
    await expect(month).toHaveValue("2027-02");
    await expect(month).toBeEnabled();
    await expect(status).toHaveCount(0);
    await expect(transfers).toContainText("februari 2027");
  } finally {
    await context.close();
  }
});

async function createJanuarySaving(page: Page) {
  await page.goto("/onboarding");
  await page.getByLabel("Namn på hushållet").fill("Månadstest");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  await page.getByRole("button", { name: "Lägg till sparande" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Namn").fill("Januarisparande");
  await dialog.getByLabel(/Belopp/).fill("1000");
  await dialog.getByLabel("Från och med", { exact: true }).fill("2027-01-01");
  await dialog.getByRole("button", { name: "Spara sparande" }).click();
  await expect(dialog).toHaveCount(0);
}

async function holdMonth(page: Page, period: string) {
  let release!: () => void;
  let reached!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requested = new Promise<void>((resolve) => {
    reached = resolve;
  });
  await page.route(`**/*month=${period}*`, async (route) => {
    if (
      new URL(route.request().url()).pathname === "/" &&
      route.request().headers().rsc === "1"
    ) {
      reached();
      await gate;
    }
    await route.continue();
  });
  return { requested, release };
}
