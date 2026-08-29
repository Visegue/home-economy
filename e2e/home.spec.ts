import { expect, test } from "@playwright/test";

test("visar ekonomiöversikten", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Min ekonomi" }),
  ).toBeVisible();
  await expect(
    page.getByText("Kvar efter plan", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kassaflöde" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Månadsplan" })).toBeVisible();
});
