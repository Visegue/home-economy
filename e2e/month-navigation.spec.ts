import { setSession, expect, test, type Page } from "./helpers/session";
import {
  openForm,
  selectMonth,
  expectMonth,
  monthlyPage,
} from "./helpers/monthly";
import { currentPeriod } from "../src/features/budget/model";

async function createJanuarySaving(page: Page) {
  await page.goto("/onboarding");
  await page.getByLabel("Namn på hushållet").fill("Månadstest");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  await openForm(page, "Sparande");
  await page.getByLabel("Namn på sparandet").fill("Januarisparande");
  await page.getByLabel("Belopp per månad (kr)", { exact: true }).fill("1000");
  await page.getByLabel("Från och med", { exact: true }).fill("2027-01-01");
  await page
    .getByRole("button", { name: "Spara sparande", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function holdMonth(page: Page, month: string) {
  let release!: () => void, reached!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requested = new Promise<void>((resolve) => {
    reached = resolve;
  });
  await page.route(`**/*month=${month}*`, async (route) => {
    if (route.request().headers().rsc !== "1") return route.continue();
    reached();
    await gate;
    await route.continue();
  });
  return { release, requested };
}

test("väljer månad i väljaren, bevarar parametrar, data, fokus och historik", async ({
  page,
  context,
  session,
}) => {
  await setSession(context, session.token);
  await createJanuarySaving(page);
  await page.goto("/?month=2026-12&view=compact&view=other");
  const transfers = page.getByRole("region", {
    name: "Att föra över",
    exact: true,
  });
  await expect(transfers).toContainText("december 2026");
  await selectMonth(page, "2027-01");
  await expect(page).toHaveURL(/month=2027-01&view=compact&view=other/);
  await expect(transfers).toContainText("januari 2027");
  await page
    .getByRole("button", { name: "Januarisparande", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Januarisparande", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expectMonth(page, "2026-12");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(transfers).toContainText("december 2026");
  await page.goForward();
  await expect(transfers).toContainText("januari 2027");
  await page.reload();
  await expectMonth(page, "2027-01");
  const length = await page.evaluate(() => history.length);
  await selectMonth(page, "2027-01");
  expect(await page.evaluate(() => history.length)).toBe(length);
  const previous = page.getByRole("button", { name: "Föregående månad" });
  await previous.focus();
  await page.keyboard.press("Enter");
  await expect(transfers).toContainText("december 2026");
  await expect(previous).toBeFocused();
  await page.goto("/?month=1900-01");
  await expect(previous).toBeDisabled();
  await page.goto("/?month=2199-12");
  await expect(
    page.getByRole("button", { name: "Nästa månad" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Öppna månadsväljaren" }).click();
  await page.getByRole("button", { name: "Denna månad", exact: true }).click();
  await expectMonth(page, currentPeriod());
  await page.getByLabel("Välj månad", { exact: true }).press("Escape");
  await page.goto("/?month=2200-01");
  await expect(page).toHaveURL("http://127.0.0.1:3000/");
});

test("mobil: synlig laddning behåller gammal månad och senaste mål vinner", async ({
  browser,
  session,
}, testInfo) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  await setSession(context, session.token);
  const page = await context.newPage();
  try {
    await createJanuarySaving(page);
    await page.goto("/?month=2026-12");
    const transfers = page.getByRole("region", {
      name: "Att föra över",
      exact: true,
    });
    const old = await holdMonth(page, "2027-01"),
      second = await holdMonth(page, "2027-02"),
      last = await holdMonth(page, "2027-03");
    const next = page.getByRole("button", { name: "Nästa månad" });
    await next.focus();
    await page.evaluate(() => window.scrollTo(0, 100));
    const scroll = await page.evaluate(() => scrollY);
    try {
      await page.keyboard.press("Enter");
      await old.requested;
      await expect(
        page.getByRole("status").filter({ hasText: "Byter till januari 2027" }),
      ).toBeVisible();
      await expect(transfers).toContainText("december 2026");
      await expect(
        page.getByRole("button", { name: "Lägg till", exact: true }),
      ).toBeDisabled();
      await expect(next).toBeEnabled();
      await expect(
        transfers.locator('xpath=ancestor::div[@aria-busy="true"]').first(),
      ).toHaveClass(/opacity-40/);
      await next.click();
      await second.requested;
      await next.click();
      await last.requested;
      await expect(
        page.getByRole("status").filter({ hasText: "Byter till mars 2027" }),
      ).toBeVisible();
      last.release();
      await expect(transfers).toContainText("mars 2027");
      await expectMonth(page, "2027-03");
      second.release();
      old.release();
      await expect(transfers).toContainText("mars 2027");
      await expect(
        page.getByRole("button", { name: "Lägg till", exact: true }),
      ).toBeEnabled();
      await expect(next).toBeFocused();
      expect(await page.evaluate(() => scrollY)).toBe(scroll);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath("month-pending-mobile.png"),
        fullPage: true,
      });
    } finally {
      old.release();
      second.release();
      last.release();
    }
    await monthlyPage(page, "Historik och kommande ändringar");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Historik och kommande ändringar",
    );
    await monthlyPage(page, "Överföringar och värden");
    await expect(page.getByLabel("Avser månad")).toHaveValue("2027-03");
    await monthlyPage(page, "Månadsöversikt");
    await expect(transfers).toContainText("mars 2027");
  } finally {
    await context.close();
  }
});

test("offline månadsmål ger kvarstående fel och säkert omförsök utan mutation", async ({
  page,
  context,
  session,
}) => {
  await setSession(context, session.token);
  await createJanuarySaving(page);
  await page.goto("/?month=2026-12");
  let writes = 0;
  page.on("request", (request) => {
    if (request.method() === "POST") writes++;
  });
  await context.setOffline(true);
  await page.getByRole("button", { name: "Nästa månad" }).click();
  const error = page
    .getByRole("status")
    .filter({ hasText: "kunde inte laddas" });
  await expect(error).toContainText("december 2026 visas fortfarande");
  await expect(
    page.getByRole("button", { name: "Lägg till", exact: true }),
  ).toBeEnabled();
  await expect(error).toContainText("Försök igen");
  await context.setOffline(false);
  await page.getByRole("button", { name: "Försök igen", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Att föra över", exact: true }),
  ).toContainText("januari 2027");
  await expect(error).toHaveCount(0);
  expect(writes).toBe(0);
});

test("sidbyte bevarar bekräftad vy och fokus tills målet är klart", async ({
  page,
  context,
  session,
}) => {
  await setSession(context, session.token);
  await createJanuarySaving(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/salary?*", async (route) => {
    if (route.request().headers().rsc !== "1") return route.continue();
    await gate;
    await route.continue();
  });
  const target = page.getByRole("link", { name: "Lönekoll", exact: true });
  try {
    await target.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("status").filter({ hasText: "Öppnar Lönekoll" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Månadsöversikt",
    );
    await expect(
      page.getByRole("button", { name: "Månadsöversikt", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(target).not.toHaveAttribute("aria-current", "page");
    await expect(target).toBeFocused();
    await expect(
      page
        .getByRole("button", { name: "Lägg till", exact: true })
        .locator("xpath=ancestor::*[@inert][1]"),
    ).toBeVisible();
    release();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Lönekoll",
    );
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await expect(target).toHaveAttribute("aria-current", "page");
    await context.setOffline(true);
    await page
      .getByRole("link", { name: "Inställningar", exact: true })
      .click();
    await expect(
      page.getByText(
        "Inställningar kunde inte laddas. Lönekoll visas fortfarande.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Lönekoll",
    );
    await context.setOffline(false);
    await page
      .getByRole("button", { name: "Försök igen", exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Inställningar",
    );
    await expect(
      page.getByText("Inställningar kunde inte laddas.", { exact: false }),
    ).toHaveCount(0);
  } finally {
    release();
    await context.setOffline(false);
  }
});

test("serverfel vid sidbyte behåller tidigare sida och kan försöka igen", async ({
  page,
  context,
  session,
}) => {
  await setSession(context, session.token);
  await createJanuarySaving(page);
  let failOnce = true;
  await page.route("**/salary?*", async (route) => {
    if (!failOnce || route.request().headers().rsc !== "1")
      return route.continue();
    const response = await route.fetch();
    const body = await response.text();
    // Replace one Server Component model with a failed read in the real Flight response.
    // The pinned Next/React transport stays intact; no production test hook is needed.
    const rows = body.split("\n");
    const index = rows.findIndex((row) => row.includes('"pathname":"/salary"'));
    if (index < 0) throw new Error("Synthetic route page record not found");
    const id = rows[index].slice(0, rows[index].indexOf(":"));
    rows[index] =
      `${id}:E${JSON.stringify({ digest: "synthetic-navigation-error", name: "Error", message: "Synthetic route read failure", stack: [], env: "Server" })}`;
    failOnce = false;
    await route.fulfill({ response, body: rows.join("\n") });
  });
  await page.getByRole("link", { name: "Lönekoll", exact: true }).click();
  await expect(
    page.getByText(
      "Lönekoll kunde inte laddas. Månadsöversikt visas fortfarande.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Månadsöversikt",
  );
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: "Försök igen", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lönekoll");
});

test("serverfel vid månadsbyte återställer en skrivbar och uppdaterad gammal månad", async ({
  page,
  context,
  session,
}) => {
  await setSession(context, session.token);
  await createJanuarySaving(page);
  await page.goto("/?month=2027-01");
  let failOnce = true;
  await page.route("**/*month=2027-02*", async (route) => {
    if (!failOnce || route.request().headers().rsc !== "1")
      return route.continue();
    const response = await route.fetch();
    const rows = (await response.text()).split("\n");
    const index = rows.findIndex(
      (row) =>
        row.includes('"pathname":"/"') && row.includes('"month":"2027-02"'),
    );
    if (index < 0) throw new Error("Synthetic month page record not found");
    const id = rows[index].slice(0, rows[index].indexOf(":"));
    rows[index] =
      `${id}:E${JSON.stringify({ digest: "synthetic-month-error", name: "Error", message: "Synthetic month read failure", stack: [], env: "Server" })}`;
    failOnce = false;
    await route.fulfill({ response, body: rows.join("\n") });
  });
  await page.getByRole("button", { name: "Nästa månad", exact: true }).click();
  const error = page.getByText(
    "februari 2027 kunde inte laddas. januari 2027 visas fortfarande.",
    { exact: true },
  );
  await expect(error).toBeVisible();
  await expect(page).toHaveURL(/month=2027-01$/);
  await openForm(page, "Sparande");
  await page.getByLabel("Namn på sparandet").fill("Sparat efter läsfel");
  await page.getByLabel("Belopp per månad (kr)", { exact: true }).fill("200");
  await page
    .getByRole("button", { name: "Spara sparande", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Sparat efter läsfel", exact: true }),
  ).toBeVisible();
  await expect(error).toBeVisible();
  await page.getByRole("button", { name: "Försök igen", exact: true }).click();
  await expectMonth(page, "2027-02");
  await expect(error).toHaveCount(0);
});
