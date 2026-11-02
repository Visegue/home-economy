import { actionReflowCases } from "./helpers/reflow";
import { setSession, expect, test } from "./helpers/session";
import { openForm, monthlyPage, expectMonth } from "./helpers/monthly";
test(`gemensamma åtgärder bevarar text, fokus, länkar och GET-filter`, async ({
  page,
  context,
  session,
}, testInfo) => {
  test.setTimeout(90000);
  await setSession(context, session.token);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/onboarding");
  await page
    .getByLabel("Namn på hushållet")
    .fill("Ett syntetiskt hushåll med ett långt namn för reflow");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  await expect(
    page.getByRole("link", {
      name: "Hushållets medlemmar och inkomster",
      exact: true,
    }),
  ).toHaveCount(0);
  for (const viewport of actionReflowCases) {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ colorScheme: viewport.theme });
    await page.evaluate((size) => {
      document.documentElement.style.fontSize = size;
    }, viewport.textSize);
    const picker = page.getByRole("button", { name: "Öppna månadsväljaren" });
    await picker.click();
    const today = page.getByRole("button", {
      name: "Denna månad",
      exact: true,
    });
    await today.scrollIntoViewIfNeeded();
    const bounds = (await today.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
    await today.press("Escape");
    const add = page.getByRole("button", { name: "Lägg till", exact: true });
    await add.scrollIntoViewIfNeeded();
    expect(await add.evaluate((n) => n.scrollWidth <= n.clientWidth)).toBe(
      true,
    );
    const overflow = await page.evaluate(() =>
      [...document.querySelectorAll("body *")]
        .filter((n) => {
          const b = n.getBoundingClientRect();
          return b.width > 0 && (b.right > innerWidth + 1 || b.left < -1);
        })
        .map((n) => ({
          tag: n.tagName,
          text: n.textContent?.slice(0, 80),
          class: n.className,
        })),
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      JSON.stringify({ viewport, overflow }),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(
        `overview-${viewport.theme}-${viewport.width}-${viewport.textSize}.png`,
      ),
    });
  }
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  await page.getByRole("link", { name: "Inställningar", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await page.goBack();
  const add = page.getByRole("button", { name: "Lägg till", exact: true });
  await openForm(page, "Sparande");
  const dialog = page.getByRole("dialog", {
    name: "Lägg till sparande",
    exact: true,
  });
  const name = dialog.getByLabel("Namn på sparandet", { exact: true });
  const draft = "Syntetiskt sparande med ett långt namn för framtida semester";
  await name.fill(draft);
  await name.press("Escape");
  const prompt = page.getByRole("alertdialog", {
    name: "Du har osparade ändringar",
  });
  const resume = prompt.getByRole("button", {
      name: "Fortsätt redigera",
      exact: true,
    }),
    discard = prompt.getByRole("button", {
      name: "Kasta ändringar",
      exact: true,
    });
  await expect(resume).toBeFocused();
  await expect(discard).toBeVisible();
  for (const viewport of actionReflowCases) {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ colorScheme: viewport.theme });
    await page.evaluate((size) => {
      document.documentElement.style.fontSize = size;
    }, viewport.textSize);
    await prompt.screenshot({
      path: testInfo.outputPath(
        `discard-${viewport.theme}-${viewport.width}-${viewport.textSize}.png`,
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
        `discard-bottom-${viewport.theme}-${viewport.width}-${viewport.textSize}.png`,
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

  await name.press("Escape");
  await discard.click();
  await expect(add).toBeFocused();
  await openForm(page, "Sparande");
  await expect(name).toHaveValue("");
  await dialog.getByRole("button", { name: "Stäng", exact: true }).click();
  await monthlyPage(page, "Överföringar och värden");
  await page.getByLabel("Avser månad", { exact: true }).fill("2027-02");
  const requested = page.waitForRequest(
    (request) =>
      request.isNavigationRequest() &&
      new URL(request.url()).pathname === "/transfers",
  );
  await page.getByRole("button", { name: "Visa", exact: true }).click();
  expect((await requested).method()).toBe("GET");
  await expect(page).toHaveURL(/\/transfers\?month=2027-02$/);
  await expect(page.getByLabel("Avser månad", { exact: true })).toHaveValue(
    "2027-02",
  );
  await page.setViewportSize({ width: 320, height: 640 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  const show = page.getByRole("button", { name: "Visa", exact: true });
  await show.scrollIntoViewIfNeeded();
  expect(await show.evaluate((n) => n.scrollWidth <= n.clientWidth)).toBe(true);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  await monthlyPage(page, "Månadsöversikt");
  await expectMonth(page, "2027-02");
});
