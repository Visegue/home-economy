import { expect, test } from "@playwright/test";
import { setSession } from "./helpers/session";

test("hanterar månadssparande med bestående belopp och uppdaterad totalsumma", async ({
  page,
  context,
}, testInfo) => {
  await setSession(context, `savings-${testInfo.retry}`);
  await page.goto("/onboarding");
  await page
    .getByRole("textbox", { name: "Namn på hushållet" })
    .fill("Sparmålstest");
  await page
    .getByRole("textbox", { name: "Din månadsinkomst efter skatt (valfritt)" })
    .fill("5000");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3000/");
  const section = page.getByRole("region", { name: "Dina sparmål" });
  const total = section.getByRole("status", { name: "Totalt månadssparande" });
  const summary = page.getByRole("region", { name: "Månadens nyckeltal" });
  await expect(total).toHaveText("0 kr");
  await expect(section).toContainText("Du har inga sparmål ännu");

  await section.getByRole("button", { name: "Lägg till sparande" }).click();
  const dialog = page.getByRole("dialog");
  const name = dialog.getByRole("textbox", { name: "Typ av sparande (namn)" });
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
  const annualSavings = page.getByRole("table").filter({
    has: page.getByRole("columnheader", { name: "Sparande", exact: true }),
  });
  await expect(
    annualSavings.getByRole("cell", { name: "1 751,04 kr", exact: true }),
  ).toHaveCount(12);
  await page.getByRole("link", { name: "Nästa månad", exact: true }).click();
  await expect(total).toHaveText("1 751,04 kr");
  await expect(summary).toContainText("3 248,96 kr");
  await page.reload();
  await expect(total).toHaveText("1 751,04 kr");
  await expect(section.getByRole("listitem")).toHaveCount(2);

  await section.getByRole("button", { name: "Ändra Buffert" }).click();
  await expect(amount).toHaveValue("1250,75");
  await name.fill("Ny buffert");
  await amount.fill("2000,99");
  await dialog.getByRole("button", { name: "Spara sparande" }).click();
  await expect(total).toHaveText("2 501,28 kr");
  await expect(summary).toContainText("2 498,72 kr");
  await page.reload();
  await expect(section).toContainText("Ny buffert");
  await expect(total).toHaveText("2 501,28 kr");

  await page.setViewportSize({ width: 390, height: 844 });
  await section.getByRole("button", { name: "Ta bort Ny buffert" }).click();
  await expect(total).toHaveText("500,29 kr");
  await section.getByRole("button", { name: "Ta bort Semester" }).click();
  await expect(total).toHaveText("0 kr");
  await page.reload();
  await expect(summary).toContainText("5 000,00 kr");
  await expect(section).toContainText("Du har inga sparmål ännu");
  await expect(total).toHaveText("0 kr");
});
