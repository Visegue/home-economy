import { setSession, expect, test } from "./helpers/session";

for (const theme of ["light", "dark"] as const) {
  test(`${theme}: gemensamma åtgärder bevarar text, fokus, länkar och GET-filter`, async ({
    session,
    page,
    context,
  }, testInfo) => {
    test.setTimeout(60_000);
    await setSession(context, session.token);
    await page.emulateMedia({ colorScheme: theme });
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/onboarding");
    await page
      .getByLabel("Namn på hushållet")
      .fill("Ett syntetiskt hushåll med ett långt namn för reflow");
    await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
    const settings = page.getByRole("link", {
      name: "Hushållets medlemmar och inkomster",
      exact: true,
    });
    await expect(settings).toHaveAttribute("href", "/settings");
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
      const today = page.getByRole("button", {
        name: "Denna månad",
        exact: true,
      });
      await today.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: testInfo.outputPath(
          `month-${theme}-${viewport.width}-${viewport.textSize}.png`,
        ),
      });
      const todayBounds = (await today.boundingBox())!;
      expect(todayBounds.x + todayBounds.width).toBeLessThanOrEqual(
        viewport.width,
      );
      expect(
        await today.evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
      await settings.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: testInfo.outputPath(
          `overview-${theme}-${viewport.width}-${viewport.textSize}.png`,
        ),
      });
      const bounds = (await settings.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
      expect(
        await settings.evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
    }
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
    });
    await settings.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/settings$/);
    await page.goBack();
    await page.setViewportSize({ width: 320, height: 640 });
    const add = page.getByRole("button", {
      name: "Lägg till sparande",
      exact: true,
    });
    await add.click();
    const dialog = page.getByRole("dialog", {
      name: "Lägg till sparande",
      exact: true,
    });
    const name = dialog.getByLabel("Namn på sparandet", { exact: true });
    const draft =
      "Syntetiskt sparande med ett långt namn för framtida semester";
    await name.fill(draft);
    await name.press("Escape");
    const prompt = page.getByRole("alertdialog", {
      name: "Du har osparade ändringar",
    });
    const resume = prompt.getByRole("button", {
      name: "Fortsätt redigera",
      exact: true,
    });
    const discard = prompt.getByRole("button", {
      name: "Kasta ändringar",
      exact: true,
    });
    await expect(resume).toBeFocused();
    await expect(discard).toBeVisible();
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
      await prompt.screenshot({
        path: testInfo.outputPath(
          `discard-${theme}-${viewport.width}-${viewport.textSize}.png`,
        ),
      });
      expect(
        await prompt.evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
      for (const choice of [resume, discard]) {
        await choice.scrollIntoViewIfNeeded();
        const choiceBounds = (await choice.boundingBox())!;
        const promptBounds = (await prompt.boundingBox())!;
        expect(choiceBounds.y).toBeGreaterThanOrEqual(promptBounds.y);
        expect(choiceBounds.y + choiceBounds.height).toBeLessThanOrEqual(
          promptBounds.y + promptBounds.height,
        );
        expect(
          await choice.evaluate((node) => node.scrollWidth <= node.clientWidth),
        ).toBe(true);
      }
      await prompt.screenshot({
        path: testInfo.outputPath(
          `discard-bottom-${theme}-${viewport.width}-${viewport.textSize}.png`,
        ),
      });
    }
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
    });
    await page.setViewportSize({ width: 320, height: 640 });
    await page.keyboard.press("Escape");
    await expect(prompt).toHaveCount(0);
    await expect(name).toBeFocused();
    await expect(name).toHaveValue(draft);
    await name.press("Escape");
    await resume.click();
    await expect(name).toBeFocused();
    await expect(name).toHaveValue(draft);
    await name.press("Escape");
    await discard.click();
    await expect(dialog).toHaveCount(0);
    await expect(add).toBeFocused();
    await add.click();
    await expect(
      dialog.getByLabel("Namn på sparandet", { exact: true }),
    ).toHaveValue("");
    await dialog.getByRole("button", { name: "Stäng", exact: true }).click();
    await page
      .getByRole("link", { name: "Överföringar och värden", exact: true })
      .click();
    await page.getByLabel("Avser månad", { exact: true }).fill("2027-02");
    const request = page.waitForRequest(
      (request) =>
        request.isNavigationRequest() &&
        new URL(request.url()).pathname === "/transfers",
    );
    await page.getByRole("button", { name: "Visa", exact: true }).click();
    expect((await request).method()).toBe("GET");
    await expect(page).toHaveURL(/\/transfers\?month=2027-02$/);
    await expect(page.getByLabel("Avser månad", { exact: true })).toHaveValue(
      "2027-02",
    );
    await page.screenshot({
      path: testInfo.outputPath(`transfers-${theme}-320.png`),
    });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    const show = page.getByRole("button", { name: "Visa", exact: true });
    await show.scrollIntoViewIfNeeded();
    const showBounds = (await show.boundingBox())!;
    expect(showBounds.x + showBounds.width).toBeLessThanOrEqual(320);
    expect(
      await show.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`transfers-${theme}-320-200%.png`),
    });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
    });
    await page
      .getByRole("link", { name: "Till månadsöversikten", exact: true })
      .click();
    await expect(page.getByLabel("Välj månad")).toHaveValue("2027-02");
  });
}
