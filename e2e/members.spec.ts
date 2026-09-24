import { expect, test } from "@playwright/test";
import { setSession } from "./helpers/session";

test("redigerar och tar bort medlemmar med bevarade utgifter", async ({
  page,
  context,
}, testInfo) => {
  test.slow();
  await setSession(context, `members-${testInfo.retry}`);
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Namn på hushållet").fill("Medlemstest");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/settings");
  for (const name of ["Kim", "Robin"]) {
    await page.getByRole("button", { name: "Lägg till familjemedlem" }).click();
    await page.getByLabel("Medlemmens namn").fill(name);
    await page.getByRole("button", { name: "Spara familjemedlem" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  const members = page.getByRole("list", { name: "Hushållets medlemmar" });
  await expect(members.getByRole("button")).toHaveCount(0);
  const addButton = page.getByRole("button", {
    name: "Lägg till familjemedlem",
  });
  const editButton = page.getByRole("button", { name: "Hantera medlemmar" });
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    // Responsive button sizes transition after a resize. Measure both buttons
    // in the same browser frame and retry until their final alignment is reached.
    await expect(async () => {
      const positions = await addButton.or(editButton).evaluateAll((buttons) =>
        buttons.map((button) => {
          const rect = button.getBoundingClientRect();
          return {
            label: button.getAttribute("aria-label"),
            x: rect.x,
            y: rect.y,
            width: rect.width,
          };
        }),
      );
      const add = positions.find(
        (button) => button.label === "Lägg till familjemedlem",
      )!;
      const edit = positions.find(
        (button) => button.label === "Hantera medlemmar",
      )!;
      expect(add.x).toBeGreaterThanOrEqual(edit.x + edit.width);
      expect(Math.abs(add.y - edit.y)).toBeLessThan(0.5);
    }).toPass({ timeout: 5000 });
  }
  const account = await page
    .getByRole("heading", { name: "Konto", exact: true })
    .boundingBox();
  const version = await page
    .getByText("Förhandsversion aaaaaaa", { exact: true })
    .boundingBox();
  expect(version!.y).toBeGreaterThan(account!.y);

  await page.goto("/");
  await page.getByRole("button", { name: "Lägg till utgift" }).click();
  await page.getByLabel("Namn på utgiften").fill("Mobil");
  await page.getByLabel("Belopp per betalning (kr)").fill("250,25");
  await page.getByRole("checkbox", { name: "Kim", exact: true }).check();
  await page.getByRole("button", { name: "Spara utgift" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Hantera medlemmar" }).click();
  await page.screenshot({
    path: testInfo.outputPath("members-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Ändra Kim", exact: true }).click();
  await page.getByLabel("Medlemmens namn").fill("Robin");
  await page.getByRole("button", { name: "Spara familjemedlem" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText(
    "Det finns redan en medlem med det namnet.",
  );
  await page.getByLabel("Medlemmens namn").fill("Kim Ny");
  await page.getByRole("button", { name: "Spara familjemedlem" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Ändra Kim Ny", exact: true }).click();
  await expect(page.getByLabel("Medlemmens namn")).toHaveValue("Kim Ny");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/");
  const expense = page.getByRole("row").filter({ hasText: "Mobil" });
  await expect(expense).toContainText("Kim Ny");
  await page.goto("/settings");
  await page.getByRole("button", { name: "Hantera medlemmar" }).click();
  await page
    .getByRole("button", { name: "Ta bort Kim Ny", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Avbryt", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Avbryt", exact: true }).click();
  await expect(members).toContainText("Kim Ny");
  for (const name of ["Kim Ny", "Robin"]) {
    await page
      .getByRole("button", { name: `Ta bort ${name}`, exact: true })
      .click();
    await page
      .getByRole("button", { name: `Bekräfta borttagning av ${name}` })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await expect(page.getByText("Inga medlemmar tillagda ännu.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Inga medlemmar tillagda ännu.")).toBeVisible();
  await page.goto("/");
  await expect(expense).toContainText("Ingen vald");
  await expect(expense).toContainText("250,25 kr");
});
