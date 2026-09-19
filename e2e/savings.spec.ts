import { expect, test } from "@playwright/test";
import { setSession } from "./helpers/session";
import { currentPeriod } from "../src/features/budget/model";

test("hanterar månadssparande med bestående belopp och uppdaterad totalsumma", async ({
  page,
  context,
}, testInfo) => {
  const start = currentPeriod();
  await setSession(context, `savings-${testInfo.retry}`);
  await page.goto("/onboarding");
  await page
    .getByRole("textbox", { name: "Namn på hushållet" })
    .fill("Sparmålstest");
  await page
    .getByRole("textbox", { name: "Din månadsinkomst efter skatt (valfritt)" })
    .fill("5000");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  await expect(page).toHaveURL(/\/$/);
  const section = page.getByRole("region", { name: "Dina sparmål" });
  const total = section.getByRole("status", { name: "Totalt månadssparande" });
  const summary = page.getByRole("region", { name: "Månadens nyckeltal" });
  const cardTitles = await page
    .locator('[data-slot="card-title"]')
    .allTextContents();
  expect(cardTitles.indexOf("Utgifter")).toBeLessThan(
    cardTitles.indexOf("Sparmål"),
  );
  await expect(page.getByLabel("Välj månad")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /föregående|nästa månad/i }),
  ).toHaveCount(0);
  await expect(page.getByText(/Månad för månad/)).toHaveCount(0);
  await expect(total).toHaveText("0 kr");
  await expect(section).toContainText("Inga sparmål ännu");
  await expect(
    section
      .locator('[data-slot="card-action"]')
      .getByRole("button", { name: "Lägg till sparande" }),
  ).toBeVisible();

  await section.getByRole("button", { name: "Lägg till sparande" }).click();
  const dialog = page.getByRole("dialog");
  const name = dialog.getByRole("textbox", { name: "Namn på sparandet" });
  const amount = dialog.getByRole("textbox", { name: "Belopp per månad (kr)" });
  await name.fill("Buffert");
  await amount.fill("-100");
  await dialog.getByRole("button", { name: "Spara sparande" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Ange ett positivt belopp eller 0",
  );
  await expect(name).toHaveValue("Buffert");
  await amount.fill("1 250,75");
  await dialog.getByRole("button", { name: "Spara sparande" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(total).toHaveText("1 250,75 kr");

  await section.getByRole("button", { name: "Lägg till sparande" }).click();
  await name.fill("Semester");
  await amount.fill("500,29");
  await dialog.getByRole("button", { name: "Spara sparande" }).click();
  await expect(total).toHaveText("1 751,04 kr");
  await expect(summary).toContainText("Kvar efter utgifter och sparande");
  await expect(summary).toContainText("3 248,96 kr");
  await section.getByRole("button", { name: "Ändra Buffert" }).click();
  await expect(dialog.getByLabel("Ändringen gäller från")).toHaveValue(start);
  await expect(amount).toHaveValue("1250,75");
  await name.fill("Ny buffert");
  await amount.fill("2000,99");
  await dialog.getByRole("button", { name: "Spara sparande" }).click();
  await expect(total).toHaveText("2 501,28 kr");
  await expect(summary).toContainText("2 498,72 kr");
  await page.reload();
  await expect(section).toContainText("Ny buffert");
  await expect(total).toHaveText("2 501,28 kr");

  await page.goto("/?month=1900-01");
  await expect(page).toHaveURL(/\/$/);
  await expect(total).toHaveText("2 501,28 kr");
  await section.getByRole("button", { name: "Ändra Ny buffert" }).click();
  await expect(dialog.getByLabel("Ändringen gäller från")).toHaveValue(start);
  await dialog.getByRole("button", { name: "Stäng", exact: true }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await section.getByRole("button", { name: "Avsluta Ny buffert" }).click();
  await section
    .getByRole("button", { name: "Bekräfta avslut av Ny buffert" })
    .click();
  await expect(total).toHaveText("500,29 kr");
  await section.getByRole("button", { name: "Avsluta Semester" }).click();
  await section
    .getByRole("button", { name: "Bekräfta avslut av Semester" })
    .click();
  await expect(total).toHaveText("0 kr");
  await page.reload();
  await expect(summary).toContainText("5 000,00 kr");
  await expect(section).toContainText("Inga sparmål ännu");
  await expect(total).toHaveText("0 kr");
});
