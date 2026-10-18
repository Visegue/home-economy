import { setSession, expect, test } from "./helpers/session";

for (const theme of ["light", "dark"] as const) {
  test(`${theme}: fältfel och åtgärder ryms i förstorad reflow-viewport`, async ({
    session,
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      viewport: { width: 384, height: 360 },
      deviceScaleFactor: 2,
    });
    try {
      await setSession(context, session.token);
      await context.addInitScript(
        (value) => localStorage.setItem("home-economy-theme-v1", value),
        theme,
      );
      const page = await context.newPage();
      await page.goto("http://127.0.0.1:3000/onboarding");
      await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
      await expect(page).toHaveURL(/\/$/);
      await page
        .getByRole("button", { name: "Lägg till utgift", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Lägg till utgift",
        exact: true,
      });
      await dialog
        .getByRole("button", { name: "Spara utgift", exact: true })
        .click();
      await expect(dialog.getByLabel("Namn på utgiften")).toBeFocused();
      const amount = dialog.getByLabel("Belopp per betalning (kr)");
      await amount.focus();
      await expect(amount).toBeFocused();
      await expect(amount).toHaveAccessibleDescription(
        "Ange ett belopp i kronor med högst två decimaler.",
      );
      await expect
        .poll(async () => {
          const bounds = await amount.boundingBox();
          const action = await dialog
            .getByRole("button", { name: "Spara utgift", exact: true })
            .boundingBox();
          const feedback = await dialog
            .getByRole("alert")
            .filter({
              hasText: "Ange ett belopp i kronor med högst två decimaler.",
            })
            .boundingBox();
          return (
            !!bounds &&
            !!action &&
            !!feedback &&
            bounds.y >= 16 &&
            bounds.y + bounds.height <= action.y - 16 &&
            feedback.y + feedback.height <= action.y - 16
          );
        })
        .toBe(true);
      expect(
        await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`${theme}-reflow-2x.png`),
      });
      const save = dialog.getByRole("button", {
        name: "Spara utgift",
        exact: true,
      });
      await save.scrollIntoViewIfNeeded();
      const bounds = await save.boundingBox();
      expect(bounds!.y).toBeGreaterThanOrEqual(16);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(344);
    } finally {
      await context.close();
    }
  });
}
