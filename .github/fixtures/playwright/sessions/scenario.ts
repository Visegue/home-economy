import { expect, setSession, test } from "../../../../e2e/helpers/session";

// A separate contract run deliberately fails after writes, then retries.
// It is not part of the normal app suite and never changes expected app outcomes.
for (const name of ["Första hushållet", "Andra hushållet"]) {
  test(name, async ({ session, page, context }, testInfo) => {
    await setSession(context, session.token);
    const response = await context.request.get("/api/auth/get-session");
    expect(response.ok()).toBe(true);
    expect((await response.json()).user.id).toBe(session.userId);
    await page.goto("/");
    await expect(page).toHaveURL(/\/onboarding$/);
    await page.getByLabel("Namn på hushållet").fill(name);
    await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    const otherName =
      name === "Första hushållet" ? "Andra hushållet" : "Första hushållet";
    await expect(page.getByText(otherName, { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Lägg till sparande" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Namn").fill(name);
    await dialog.getByLabel(/Belopp/).fill("123");
    await dialog.getByRole("button", { name: "Spara sparande" }).click();
    await expect(dialog).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("row").filter({ hasText: name })).toHaveCount(
      1,
    );
    await expect(page.getByText(otherName, { exact: true })).toHaveCount(0);
    expect(
      testInfo.retry,
      "Intentional failure after writes; retry must start without a household",
    ).toBe(1);
  });
}
