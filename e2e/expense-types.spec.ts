import { closePostDetails } from "./helpers/post-management";
import { expect, test } from "@playwright/test";
import { currentPeriod, shiftPeriod } from "../src/features/budget/model";
import { setSession } from "./helpers/session";

for (const [type, label] of [
  ["direct", "Direkt utgift"],
  ["allocated", "Avsatt utgift"],
  ["settlement", "Avräkning"],
] as const) {
  test(`${label}: typen väljs vid skapande och är låst vid ändring och rättelse`, async ({
    page,
    context,
  }, testInfo) => {
    const period = currentPeriod();
    const name = `Typtest ${type}`;
    await setSession(context, `expense-types-${type}-${testInfo.retry}`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/onboarding");
    await page.getByLabel("Namn på hushållet").fill("Typtestfamiljen");
    await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
    await page
      .getByRole("button", { name: "Lägg till utgift", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("radio")).toHaveCount(3);
    await dialog.getByRole("radio", { name: label, exact: true }).check();
    await dialog.getByLabel("Namn på utgiften").fill(name);
    await dialog
      .getByLabel(
        type === "settlement"
          ? "Kostnad i dag (kr)"
          : "Belopp per betalning (kr)",
      )
      .fill("1200");
    if (type !== "direct") {
      await dialog
        .getByLabel(
          type === "settlement" ? "Nästa utgiftsdatum" : "Nästa betalning",
        )
        .fill(`${shiftPeriod(period, 12)}-01`);
    }
    const save = dialog.getByRole("button", {
      name: type === "settlement" ? "Spara avräkning" : "Spara utgift",
      exact: true,
    });
    await save.click();
    await expect(dialog).toHaveCount(0);
    const card = page.locator('[data-slot="card"]').filter({
      has: page.getByRole("heading", {
        name: type === "settlement" ? "Avräkningar" : "Utgifter",
        exact: true,
      }),
    });
    const nameButton = card.getByRole("button", { name, exact: true });
    await nameButton.press("Enter");
    const edit = page
      .getByRole("dialog", { name, exact: true })
      .getByRole("button", { name: "Ändra", exact: true });
    await edit.press("Enter");
    await expect(dialog.getByRole("radio")).toHaveCount(0);
    await expect(dialog.getByText(label, { exact: true })).toBeVisible();
    await expect(dialog).toContainText("Avsluta posten och skapa en ny");
    await dialog.getByRole("combobox", { name: "Typ av ändring" }).click();
    await page.getByRole("option", { name: "Rätta denna version" }).click();
    await expect(dialog.getByRole("radio")).toHaveCount(0);
    // Hidden fields are client-controlled: the server must reject a forged type.
    await dialog
      .locator('input[name="type"]')
      .evaluate((input: HTMLInputElement) => {
        input.value = input.value === "direct" ? "allocated" : "direct";
        if (input.value === "allocated") {
          for (const [name, value] of [
            ["months", "12"],
            ["nextDueOn", "2099-01-01"],
          ]) {
            const field = document.createElement("input");
            field.type = "hidden";
            field.name = name;
            field.value = value;
            input.form!.append(field);
          }
        }
      });
    await save.click();
    await expect(dialog.getByRole("alert")).toContainText(
      "Utgiftstypen kan inte ändras",
    );
    await dialog
      .locator('input[name="type"]')
      .evaluate((input: HTMLInputElement, value) => {
        input.value = value;
      }, type);
    await dialog
      .getByLabel(
        type === "settlement"
          ? "Kostnad i dag (kr)"
          : "Belopp per betalning (kr)",
      )
      .fill("1500");
    await save.click();
    await expect(edit).toBeFocused();
    await edit.click();
    await expect(dialog.getByText(label, { exact: true })).toBeVisible();
    await expect(
      dialog.getByLabel(
        type === "settlement"
          ? "Kostnad i dag (kr)"
          : "Belopp per betalning (kr)",
      ),
    ).toHaveValue("1500,00");
    await dialog.getByRole("button", { name: "Stäng", exact: true }).click();
    await closePostDetails(page, name);
    await expect(nameButton).toBeFocused();
  });
}
