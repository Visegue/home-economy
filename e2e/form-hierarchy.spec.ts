import { setSession, expect, test } from "./helpers/session";
import { openForm } from "./helpers/monthly";
import { currentPeriod } from "../src/features/budget/model";

test("gemensamt skapa-flöde väljer typ en gång och skyddar ändrad inmatning", async ({
  page,
  context,
  session,
}, testInfo) => {
  await setSession(context, session.token);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  const add = page.getByRole("button", { name: "Lägg till", exact: true });
  for (const type of [
    "Direkt utgift",
    "Avsatt utgift",
    "Avräkning",
    "Sparande",
  ]) {
    await openForm(page, type);
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("radio")).toHaveCount(0);
    await expect(
      dialog.getByRole("button", { name: "Byt typ", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Stäng", exact: true }).click();
    await expect(add).toBeFocused();
  }
  await openForm(page, "Direkt utgift");
  await page.getByLabel("Namn på utgiften").fill("Utkast");
  await page.getByLabel("Belopp per betalning (kr)").fill("1200");
  await page.getByRole("button", { name: "Byt typ", exact: true }).click();
  const prompt = page.getByRole("alertdialog");
  await expect(
    prompt.getByRole("button", { name: "Fortsätt redigera", exact: true }),
  ).toBeFocused();
  await prompt
    .getByRole("button", { name: "Fortsätt redigera", exact: true })
    .click();
  await expect(page.getByLabel("Namn på utgiften")).toHaveValue("Utkast");
  await page.getByRole("button", { name: "Byt typ", exact: true }).click();
  await prompt
    .getByRole("button", { name: "Kasta ändringar och byt typ", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Byt typ", exact: true })
    .getByRole("button", { name: /^Sparande/ })
    .click();
  await expect(page.getByLabel("Namn på sparandet")).toHaveValue("");
  await page.getByLabel("Namn på sparandet").fill("Framtida sparande");
  await page.getByLabel("Belopp per månad (kr)", { exact: true }).fill("100");
  await page.getByLabel("Från och med", { exact: true }).fill("2099-01-01");
  await page
    .getByRole("button", { name: "Spara sparande", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("status").filter({ hasText: "Gäller från" }),
  ).toContainText("visas inte i");
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("region", { name: "Spara", exact: true }),
  ).not.toContainText("Framtida sparande");
  await expect(add).toBeFocused();
  await openForm(page, "Sparande");
  await expect(page.getByLabel("Namn på sparandet")).toHaveValue("");
  await expect(page.getByLabel("Från och med", { exact: true })).toHaveValue(
    currentPeriod() + "-01",
  );
  await page.screenshot({
    path: testInfo.outputPath("create-flow-mobile.png"),
    fullPage: true,
  });
});
