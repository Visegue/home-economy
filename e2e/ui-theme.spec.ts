import { expect, test } from "@playwright/test";
import { setSession } from "./helpers/session";

for (const system of ["light", "dark"] as const) {
  test(`theme, navigation and guarded dialogs with ${system} system`, async ({
    page,
    context,
  }, testInfo) => {
    test.slow();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && /hydrat/i.test(message.text()))
        errors.push(message.text());
    });
    await page.emulateMedia({ colorScheme: system });
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme-preference",
      "system",
    );
    await expect(page.locator("html")).toHaveCSS("color-scheme", system);
    await expect(page.locator("h1")).toHaveCount(1);
    await page.screenshot({
      path: testInfo.outputPath(`login-${system}-320.png`),
      fullPage: true,
    });
    await setSession(context, `theme-${system}-${testInfo.retry}`);
    await page.goto("/onboarding");
    await expect(page.locator("h1")).toHaveText("Skapa ditt hushåll");
    await expect(page.locator("html")).toHaveCSS("color-scheme", system);
    await page.getByLabel("Namn på hushållet").fill(`Temahushåll ${system}`);
    await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/settings");
    await expect(
      page.getByRole("radio", { name: "System", exact: true }),
    ).toBeChecked();
    await page.getByRole("radio", { name: "Mörkt", exact: true }).check();
    // Observe the same task as the interaction, before a CSS transition can end.
    const simultaneousColors = await page.evaluate(() => {
      const light = document.querySelector<HTMLInputElement>(
        'input[name="theme"][value="light"]',
      )!;
      light.click();
      const field =
        document.querySelector<HTMLInputElement>("#default-incomeDay")!;
      const lightMatches =
        getComputedStyle(field).color === getComputedStyle(document.body).color;
      document
        .querySelector<HTMLInputElement>('input[name="theme"][value="dark"]')!
        .click();
      return (
        lightMatches &&
        getComputedStyle(field).color === getComputedStyle(document.body).color
      );
    });
    expect(simultaneousColors).toBe(true);

    await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
    await page.reload();
    await expect(
      page.getByRole("radio", { name: "Mörkt", exact: true }),
    ).toBeChecked();
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
    await page.getByRole("radio", { name: "Ljust", exact: true }).check();
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
    await page.getByRole("radio", { name: "System", exact: true }).check();
    await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
    await page.emulateMedia({ colorScheme: system });

    const mobile = page.getByRole("navigation", { name: "Mobilmeny" });
    await expect(mobile).toBeVisible();
    await expect(mobile.getByRole("link")).toHaveCount(5);
    await mobile.getByRole("link", { name: "Månaden", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Månaden");
    await page.getByLabel("Välj månad").focus();
    await page.evaluate(() => {
      const viewport = window.visualViewport!;
      Object.defineProperty(viewport, "height", {
        configurable: true,
        value: window.innerHeight - 250,
      });
      viewport.dispatchEvent(new Event("resize"));
    });
    await expect(mobile).toBeHidden();
    await page.evaluate(() => {
      const viewport = window.visualViewport!;
      Reflect.deleteProperty(viewport, "height");
      viewport.dispatchEvent(new Event("resize"));
    });
    await expect(mobile).toBeVisible();

    await page
      .getByRole("button", { name: "Lägg till utgift", exact: true })
      .click();
    const dialog = page.getByRole("dialog").first();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Från och med", { exact: true })).toHaveCSS(
      "color-scheme",
      system,
    );
    await dialog
      .getByRole("radio", { name: "Direkt utgift", exact: true })
      .check();
    await dialog.getByLabel("Namn på utgiften").fill("Syntetisk temautgift");
    await dialog
      .getByLabel("Belopp per betalning (kr)", { exact: true })
      .fill("900");
    await dialog.screenshot({
      path: testInfo.outputPath(`dialog-${system}-320.png`),
    });
    await dialog.getByRole("button", { name: "Stäng", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Fortsätt redigera" }).click();
    await expect(dialog.getByLabel("Namn på utgiften")).toHaveValue(
      "Syntetisk temautgift",
    );
    await dialog
      .getByRole("button", { name: "Spara utgift", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Syntetisk temautgift", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`overview-${system}-320.png`),
      fullPage: true,
    });
    for (const width of [320, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(overflow, `horizontal overflow at ${width}px`).toBe(false);
      await expect(
        page.getByRole("navigation", {
          name: width >= 1024 ? "Huvudmeny" : "Mobilmeny",
        }),
      ).toBeVisible();
    }
    await page.screenshot({
      path: testInfo.outputPath(`overview-${system}-desktop.png`),
      fullPage: true,
    });
    for (const [route, title] of [
      ["/history", "Historik och kommande ändringar"],
      ["/transfers", "Överföringar och värden"],
    ]) {
      await page.goto(route);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      await expect(page.locator("html")).toHaveCSS("color-scheme", system);
    }
    await context.clearCookies();
    for (const route of ["/login", "/forgot-password", "/reset-password"]) {
      await page.goto(route);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("html")).toHaveCSS("color-scheme", system);
    }
    expect(errors).toEqual([]);
  });
}

test("saved invalid or inaccessible preference falls back before hydration", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() =>
    localStorage.setItem("home-economy-theme-v1", "invalid"),
  );
  await page.goto("/login");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-preference",
    "system",
  );
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage denied");
      },
    }),
  );
  await page.reload();
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Välkommen tillbaka",
  );
});
