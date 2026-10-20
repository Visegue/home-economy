import { setSession, expect, test } from "./helpers/session";

for (const theme of ["light", "dark"] as const) {
  test(`${theme}: ekonomiska åtgärder bevarar hela texten och fokus vid reflow`, async ({
    session,
    page,
    context,
  }, testInfo) => {
    test.setTimeout(90_000);
    await setSession(context, session.token);
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/onboarding");
    await page.getByLabel("Namn på hushållet").fill("Syntetiska åtgärder");
    await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
    await page
      .getByRole("button", { name: "Lägg till sparande", exact: true })
      .click();
    const name = "Syntetiskt sparande med ett långt namn för framtida semester";
    await page.getByLabel("Namn på sparandet", { exact: true }).fill(name);
    await page.getByLabel("Belopp per månad (kr)").fill("100");
    await page
      .getByRole("button", { name: "Spara sparande", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const trigger = page
      .getByRole("table")
      .getByRole("button", { name, exact: true });
    await page
      .getByRole("button", { name: "Stäng bekräftelsen", exact: true })
      .click();
    await trigger.click();
    const details = page.getByRole("dialog", { name, exact: true });
    const edit = details.getByRole("button", { name: "Ändra", exact: true });
    const end = details.getByRole("button", { name: "Avsluta", exact: true });
    const close = details.getByRole("button", { name: "Stäng", exact: true });
    for (const viewport of [
      { width: 320, height: 640, textSize: "100%" },
      { width: 1440, height: 900, textSize: "100%" },
      { width: 384, height: 360, textSize: "100%" },
      { width: 320, height: 640, textSize: "200%" },
    ]) {
      await page.setViewportSize(viewport);
      await page.evaluate((size) => {
        document.documentElement.style.fontSize = size;
      }, viewport.textSize);
      for (const action of [edit, end, close]) {
        await action.scrollIntoViewIfNeeded();
        await expect(action).toBeVisible();
        const bounds = (await action.boundingBox())!;
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
        expect(
          await action.evaluate((node) => node.scrollWidth <= node.clientWidth),
        ).toBe(true);
      }
      const heading = (await details
        .getByRole("heading", { name, exact: true })
        .boundingBox())!;
      const closing = (await close.boundingBox())!;
      expect(
        heading.x + heading.width <= closing.x ||
          heading.y >= closing.y + closing.height ||
          heading.y + heading.height <= closing.y,
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(
          `details-${theme}-${viewport.width}-${viewport.textSize}.png`,
        ),
      });
    }
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
    });
    await edit.press("Enter");
    await page.keyboard.press("Escape");
    await expect(edit).toBeFocused();
    await end.press("Enter");
    const confirmation = page.getByRole("dialog", {
      name: "Avsluta sparande",
      exact: true,
    });
    await expect(
      confirmation.getByRole("button", {
        name: `Bekräfta avslut av ${name}`,
        exact: true,
      }),
    ).toHaveText("Ja, avsluta");
    await confirmation
      .getByRole("button", { name: "Avbryt", exact: true })
      .click();
    await expect(end).toBeFocused();
    await close.press("Enter");
    await expect(trigger).toBeFocused();
    await trigger.press("Enter");
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await page
      .getByRole("link", { name: "Överföringar och värden", exact: true })
      .click();
    const register = page.getByRole("button", {
      name: `Registrera för ${name}`,
      exact: true,
    });
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await register.scrollIntoViewIfNeeded();
      expect(
        await register.evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
      const bounds = (await register.boundingBox())!;
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: testInfo.outputPath(`registration-${theme}-${width}.png`),
      });
    }
    await page.setViewportSize({ width: 320, height: 640 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await register.scrollIntoViewIfNeeded();
    expect(
      await register.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    const bounds = (await register.boundingBox())!;
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
    await register.click();
    const form = page.getByRole("dialog", {
      name: `Registrera för ${name}`,
      exact: true,
    });
    await expect(form).toContainText("Appen flyttar inga pengar.");
    const confirm = form.getByRole("button", {
      name: "Bekräfta registrering",
      exact: true,
    });
    for (const viewport of [
      { width: 320, height: 640, textSize: "100%" },
      { width: 1440, height: 900, textSize: "100%" },
      { width: 384, height: 360, textSize: "100%" },
      { width: 320, height: 640, textSize: "200%" },
    ]) {
      await page.setViewportSize(viewport);
      await page.evaluate((size) => {
        document.documentElement.style.fontSize = size;
      }, viewport.textSize);
      await confirm.scrollIntoViewIfNeeded();
      expect(
        await confirm.evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
      const bounds = (await confirm.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
      await page.screenshot({
        path: testInfo.outputPath(
          `confirmation-${theme}-${viewport.width}-${viewport.textSize}.png`,
        ),
      });
    }
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
    });
    let release!: () => void;
    let reached!: () => void;
    let writes = 0;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const requested = new Promise<void>((resolve) => {
      reached = resolve;
    });
    await page.route("**/transfers*", async (route) => {
      if (route.request().method() === "POST") {
        writes++;
        reached();
        await gate;
      }
      await route.continue();
    });
    try {
      await confirm.click();
      await requested;
      const pending = form.getByRole("button", {
        name: "Sparar…",
        exact: true,
      });
      await expect(pending).toBeDisabled();
      await expect(form.getByLabel("Faktiskt belopp (kr)")).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(form).toBeVisible();
      for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await pending.scrollIntoViewIfNeeded();
        await page.screenshot({
          path: testInfo.outputPath(`pending-${theme}-${width}.png`),
        });
      }
    } finally {
      release();
    }
    await expect(form.getByRole("status")).toBeVisible();
    await expect(confirm).toBeDisabled();
    expect(writes).toBe(1);
    await page.unroute("**/transfers*");
    await form.getByRole("button", { name: "Stäng", exact: true }).click();
    await expect(register).toBeFocused();
    await page.goto("/settings");
    const save = page.getByRole("button", {
      name: "Spara standarddagar",
      exact: true,
    });
    for (const viewport of [
      { width: 320, height: 640, textSize: "100%" },
      { width: 1440, height: 900, textSize: "100%" },
      { width: 384, height: 360, textSize: "100%" },
      { width: 320, height: 640, textSize: "200%" },
    ]) {
      await page.setViewportSize(viewport);
      await page.evaluate((size) => {
        document.documentElement.style.fontSize = size;
      }, viewport.textSize);
      await save.scrollIntoViewIfNeeded();
      expect(
        await save.evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
      const bounds = (await save.boundingBox())!;
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
      const sectionRight = await save.evaluate(
        (node) => node.parentElement!.getBoundingClientRect().right,
      );
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(sectionRight);
      await page.screenshot({
        path: testInfo.outputPath(
          `defaults-${theme}-${viewport.width}-${viewport.textSize}.png`,
        ),
      });
    }
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
    });
    await page.getByLabel("Sparande", { exact: true }).fill("17");
    await save.click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Standarddagarna har sparats." }),
    ).toContainText("Standarddagarna har sparats.");
    await page.reload();
    await expect(page.getByLabel("Sparande", { exact: true })).toHaveValue(
      "17",
    );
  });
}
