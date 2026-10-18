import { expect, setSession, test } from "./helpers/session";

test("vanliga databassessioner håller parallella hushållsskrivningar åtskilda", async ({
  session,
  page,
  context,
  browser,
}) => {
  await setSession(context, session.otherToken);
  const auth = await context.request.get("/api/auth/get-session");
  expect(await auth.json()).toMatchObject({ user: { id: session.userId } });
  await setSession(context, session.token);
  const outsiderContext = await browser.newContext({
    baseURL: "http://127.0.0.1:3000",
  });
  try {
    await setSession(outsiderContext, session.outsider.token);
    const outsider = await outsiderContext.newPage();
    await Promise.all(
      [page, outsider].map(async (current, index) => {
        await current.goto("/");
        await expect(current).toHaveURL(/\/onboarding$/);
        await current.getByLabel("Namn på hushållet").fill(`Hushåll ${index}`);
        await current
          .getByRole("button", { name: "Skapa mitt hushåll" })
          .click();
        await expect(current).toHaveURL(/\/$/);
        await current
          .getByRole("button", { name: "Lägg till sparande" })
          .click();
        const dialog = current.getByRole("dialog");
        await dialog.getByLabel("Namn").fill(`Sparande ${index}`);
        await dialog.getByLabel(/Belopp/).fill("123");
        await dialog.getByRole("button", { name: "Spara sparande" }).click();
        await expect(dialog).toHaveCount(0);
      }),
    );
    for (const [index, current] of [page, outsider].entries()) {
      await current.reload();
      await expect(
        current.getByText(`Hushåll ${index}`, { exact: true }),
      ).toBeVisible();
      await expect(
        current.getByRole("row").filter({ hasText: `Sparande ${index}` }),
      ).toHaveCount(1);
      await expect(
        current.getByText(`Sparande ${1 - index}`, { exact: true }),
      ).toHaveCount(0);
    }
  } finally {
    await outsiderContext.close();
  }
});
