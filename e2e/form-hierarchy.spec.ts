import { setSession, expect, test } from "./helpers/session";
import { currentPeriod, shiftPeriod } from "../src/features/budget/model";

test("kompakt typval först, tydliga grupper, giltiga förhandsbelopp och bevarade utkast", async ({
  session,
  page,
  context,
}, testInfo) => {
  await setSession(context, session.token);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  await page
    .getByRole("button", { name: "Lägg till utgift", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Lägg till utgift",
    exact: true,
  });
  await expect(
    dialog.getByRole("group", { name: "Grunduppgifter", exact: true }),
  ).toBeVisible();
  const radios = dialog.getByRole("radio");
  expect(
    await radios
      .first()
      .evaluate(
        (radio) =>
          radio.closest("form")!.querySelector("input:not([type=hidden])") ===
          radio,
      ),
  ).toBe(true);
  await dialog.getByLabel("Namn på utgiften").fill("Utkast");
  await dialog
    .getByRole("radio", { name: "Avsatt utgift", exact: true })
    .check();
  await expect(
    dialog.getByLabel("Beräknad månadsavsättning", { exact: true }),
  ).toHaveText("—");
  await dialog.getByLabel("Belopp per betalning (kr)").fill("1200");
  await dialog
    .getByLabel("Nästa betalning")
    .fill(`${shiftPeriod(currentPeriod(), 12)}-01`);
  await dialog.getByLabel("Planerad dag i månaden").fill("10");
  await expect(
    dialog.getByLabel("Beräknad månadsavsättning", { exact: true }),
  ).toHaveText("100,00 kr");
  await dialog.getByRole("radio", { name: "Avräkning", exact: true }).check();
  await expect(dialog.getByLabel("Nästa utgiftsdatum")).toHaveValue(
    `${shiftPeriod(currentPeriod(), 12)}-01`,
  );
  await dialog.getByLabel("Planerad dag i månaden").fill("15");
  await dialog.getByLabel("Påslag (%)").fill("7");
  await dialog
    .getByRole("radio", { name: "Direkt utgift", exact: true })
    .check();
  await expect(dialog.getByLabel("Namn på utgiften")).toHaveValue("Utkast");
  await expect(dialog.getByLabel("Belopp per betalning (kr)")).toHaveValue(
    "1200",
  );
  await expect(dialog.getByLabel("Nästa betalning")).toHaveCount(0);
  await dialog
    .getByRole("radio", { name: "Avsatt utgift", exact: true })
    .check();
  await expect(dialog.getByLabel("Planerad dag i månaden")).toHaveValue("10");
  await dialog.getByRole("radio", { name: "Avräkning", exact: true }).check();
  await expect(dialog.getByLabel("Planerad dag i månaden")).toHaveValue("15");
  await expect(dialog.getByLabel("Påslag (%)")).toHaveValue("7");
  await dialog.getByLabel("Kostnad i dag (kr)").fill("fel");
  await expect(
    dialog.getByLabel("Beräknad månadsavsättning", { exact: true }),
  ).toHaveText("—");
  await page.screenshot({
    path: testInfo.outputPath("form-hierarchy-light-320.png"),
    fullPage: true,
  });
});
