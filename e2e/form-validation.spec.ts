import { expect, test } from "@playwright/test";
import { setSession } from "./helpers/session";

for (const theme of ["light", "dark"] as const) {
  test(`${theme}: lokala fältfel, blur, nollbelopp och nåbara mobila åtgärder`, async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(120_000);
    await setSession(context, `form-validation-${theme}-${testInfo.retry}`);
    await page.addInitScript(
      (value) => localStorage.setItem("home-economy-theme-v1", value),
      theme,
    );
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/onboarding");
    const optionalIncome = page.getByLabel(
      "Din månadsinkomst efter skatt (valfritt)",
    );
    await optionalIncome.fill("fel");
    await optionalIncome.blur();
    await expect(optionalIncome).not.toHaveAttribute("aria-invalid", "true");
    let writes = 0;
    page.on("request", (request) => {
      if (request.method() === "POST") writes++;
    });
    await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
    await expect(optionalIncome).toBeFocused();
    await expect(optionalIncome).toHaveAttribute("aria-invalid", "true");
    expect(writes).toBe(0);
    await optionalIncome.fill("0");
    await optionalIncome.blur();
    await expect(optionalIncome).not.toHaveAttribute("aria-invalid", "true");
    await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
    await expect(page).toHaveURL(/\/$/);
    for (const form of [
      {
        path: "/",
        trigger: "Lägg till utgift",
        name: "Namn på utgiften",
        amount: "Belopp per betalning (kr)",
        save: "Spara utgift",
        zero: false,
      },
      {
        path: "/",
        trigger: "Lägg till sparande",
        name: "Namn på sparandet",
        amount: "Belopp per månad (kr)",
        save: "Spara sparande",
        zero: true,
      },
      {
        path: "/settings",
        trigger: "Lägg till inkomst",
        name: "Namn på inkomsten",
        amount: "Belopp per månad efter skatt (kr)",
        save: "Spara inkomst",
        zero: true,
      },
    ]) {
      await page.goto(form.path);
      await page
        .getByRole("button", { name: form.trigger, exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: form.trigger,
        exact: true,
      });
      await dialog.getByLabel(form.name).fill(`${theme} ${form.save}`);
      const amount = dialog.getByLabel(form.amount);
      await amount.fill("fel");
      await amount.blur();
      await expect(amount).not.toHaveAttribute("aria-invalid", "true");
      const before = writes;
      await dialog
        .getByRole("button", { name: form.save, exact: true })
        .click();
      await expect(amount).toBeFocused();
      await expect(amount).toHaveAttribute("aria-invalid", "true");
      await expect(amount).toHaveAttribute("aria-describedby", /feedback/);
      expect(writes).toBe(before);
      await amount.fill("0");
      await amount.blur();
      if (!form.zero) {
        await expect(amount).toHaveAttribute("aria-invalid", "true");
        await amount.fill("100");
        await amount.blur();
      }
      await expect(amount).not.toHaveAttribute("aria-invalid", "true");
      expect(writes).toBe(before);
      await amount.focus();
      await page.evaluate(() => {
        Object.defineProperty(window.visualViewport!, "height", {
          configurable: true,
          value: 300,
        });
        window.visualViewport!.dispatchEvent(new Event("resize"));
      });
      const save = dialog.getByRole("button", { name: form.save, exact: true });
      await expect
        .poll(async () => {
          const fieldBounds = await amount.boundingBox();
          const actionBounds = await save.boundingBox();
          return (
            !!fieldBounds &&
            !!actionBounds &&
            fieldBounds.y >= 16 &&
            fieldBounds.y + fieldBounds.height <= actionBounds.y - 16
          );
        })
        .toBe(true);
      await save.scrollIntoViewIfNeeded();
      const bounds = await save.boundingBox();
      expect(bounds!.y).toBeGreaterThanOrEqual(16);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(284);
      expect(
        await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`${theme}-${form.save}-keyboard.png`),
        fullPage: true,
      });
      await save.click();
      await expect(dialog).toHaveCount(0);
      await page.evaluate(() => {
        Reflect.deleteProperty(window.visualViewport!, "height");
        window.visualViewport!.dispatchEvent(new Event("resize"));
      });
    }
  });
}
