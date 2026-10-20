import { setSession, expect, test } from "./helpers/session";

for (const theme of ["light", "dark"] as const) {
  test(`${theme}: återställningsåtgärder behåller full text och tangentbordsnavigation vid reflow`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/forgot-password");
    const send = page.getByRole("button", {
      name: "Skicka återställningslänk",
      exact: true,
    });
    const back = page.getByRole("link", {
      name: "Tillbaka till inloggningen",
      exact: true,
    });
    for (const view of [
      { width: 320, height: 640, textSize: "100%" },
      { width: 1440, height: 900, textSize: "100%" },
      { width: 320, height: 640, textSize: "200%" },
    ]) {
      await page.setViewportSize(view);
      await page.evaluate((size) => {
        document.documentElement.style.fontSize = size;
      }, view.textSize);
      for (const control of [send, back]) {
        await control.scrollIntoViewIfNeeded();
        await expect(control).toBeVisible();
        expect(
          await control.evaluate(
            (node) => node.scrollWidth <= node.clientWidth,
          ),
        ).toBe(true);
        const bounds = (await control.boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(view.width);
      }
      await page.screenshot({
        path: testInfo.outputPath(
          `recovery-${theme}-${view.width}-${view.textSize}.png`,
        ),
        fullPage: true,
      });
    }
    await expect(back).toHaveAttribute("href", "/login");
    await back.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("button", { name: "Logga in", exact: true }),
    ).toBeVisible();
    await page.goBack();
    await expect(send).toBeVisible();
  });
}

for (const theme of ["light", "dark"] as const) {
  test(
    `${theme}: authåtgärder bevarar pending, namn, credentials och återgång på smal skärm`,
    {
      annotation: { type: "session-profile", description: "credential" },
    },
    async ({ page, context, session }, testInfo) => {
      test.setTimeout(90_000);
      await page.emulateMedia({ colorScheme: theme });
      const capture = async (name: string) => {
        for (const view of [
          { width: 320, height: 640, textSize: "100%" },
          { width: 1440, height: 900, textSize: "100%" },
          { width: 320, height: 640, textSize: "200%" },
        ]) {
          await page.setViewportSize(view);
          await page.evaluate((size) => {
            document.documentElement.style.fontSize = size;
          }, view.textSize);
          const controls = page.locator(
            '[data-slot="button"]:visible, [role="tab"]:visible',
          );
          for (const control of await controls.all()) {
            await control.scrollIntoViewIfNeeded();
            expect(
              await control.evaluate(
                (node) => node.scrollWidth <= node.clientWidth,
              ),
            ).toBe(true);
            const bounds = (await control.boundingBox())!;
            expect(bounds.x).toBeGreaterThanOrEqual(0);
            expect(bounds.x + bounds.width).toBeLessThanOrEqual(view.width);
          }
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
          ).toBeLessThanOrEqual(view.width);
          await page.screenshot({
            path: testInfo.outputPath(
              `${name}-${theme}-${view.width}-${view.textSize}.png`,
            ),
            fullPage: true,
          });
        }
      };
      await page.goto("/login");
      await capture("login");
      await expect(page.getByLabel("E-postadress")).toBeDisabled();
      await expect(
        page.getByRole("button", { name: "Logga in", exact: true }),
      ).toBeDisabled();
      await page.getByRole("tab", { name: "Skapa konto", exact: true }).click();
      await capture("signup");
      await page.goto("/reset-password");
      await capture("reset-invalid");
      const newLink = page.getByRole("link", { name: "Begär en ny länk" });
      await expect(newLink).toHaveAttribute("href", "/forgot-password");
      await newLink.focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/forgot-password$/);
      await page.goto("/reset-password?token=synthetic-token");
      await capture("reset");
      await page
        .getByLabel("Nytt lösenord", { exact: true })
        .fill("synthetic-reset-password");
      await page
        .getByLabel("Upprepa lösenordet")
        .fill("synthetic-reset-password");
      let release!: () => void;
      let calls = 0;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route("**/api/auth/reset-password", async (route) => {
        calls++;
        expect(route.request().postDataJSON()).toEqual({
          newPassword: "synthetic-reset-password",
          token: "synthetic-token",
        });
        await gate;
        await route.fulfill({ json: { status: true } });
      });
      await page.getByRole("button", { name: "Spara nytt lösenord" }).click();
      await expect(
        page.getByRole("button", { name: "Sparar…", exact: true }),
      ).toBeDisabled();
      await capture("reset-pending");
      await page.keyboard.press("Enter");
      expect(calls).toBe(1);
      release();
      await expect(
        page.getByText("Lösenordet är uppdaterat. Du kan logga in."),
      ).toBeVisible();
      await capture("reset-complete");
      await page.getByRole("link", { name: "Logga in", exact: true }).click();
      await expect(page).toHaveURL(/\/login$/);
      await setSession(context, session.token);
      await page.goto("/onboarding");
      await page
        .getByLabel("Namn på hushållet")
        .fill("Ett långt syntetiskt hushåll för authreflow");
      await capture("onboarding");
      const income = page.getByLabel(
        "Din månadsinkomst efter skatt (valfritt)",
      );
      expect(
        await income.evaluate(
          (node) =>
            node.getBoundingClientRect().right <=
            node.parentElement!.getBoundingClientRect().right,
        ),
      ).toBe(true);
      let finishCreation!: () => void;
      const creationGate = new Promise<void>((resolve) => {
        finishCreation = resolve;
      });
      await page.route("**/onboarding", async (route) => {
        if (route.request().method() === "POST") await creationGate;
        await route.continue();
      });
      await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
      await expect(
        page.getByRole("button", { name: "Skapar hushållet…" }),
      ).toBeDisabled();
      await capture("onboarding-pending");
      finishCreation();
      await expect(page).toHaveURL(/\/$/);
      await page.goto("/settings");
      await capture("account");
      await page
        .getByRole("button", { name: "Ändra lösenord", exact: true })
        .click();
      await capture("account-password");
      const savePassword = page.getByRole("button", {
        name: "Spara nytt lösenord",
        exact: true,
      });
      await savePassword.focus();
      await expect(savePassword).toBeFocused();
      await expect
        .poll(async () => {
          const bounds = (await savePassword.boundingBox())!;
          return bounds.y >= 0 && bounds.y + bounds.height <= 640;
        })
        .toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`account-save-${theme}-320-200%.png`),
      });
      await page.getByRole("dialog").screenshot({
        path: testInfo.outputPath(`account-dialog-${theme}-320-200%.png`),
      });
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Ändra lösenord", exact: true }),
      ).toBeFocused();
    },
  );
}
