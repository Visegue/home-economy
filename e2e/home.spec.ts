import { expect, test } from "@playwright/test";

test("skickar oinloggade användare till Google-inloggningen", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Välkommen tillbaka" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Fortsätt med Google" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Logga in", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "Skapa konto" })).toBeVisible();
  await expect(
    page.getByText(/Samma verifierade e-postadress ger samma konto/),
  ).toBeVisible();
});

test("visar det publika återställningsflödet", async ({ page }) => {
  await page.goto("/forgot-password");

  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(
    page.getByRole("heading", { name: "Återställ lösenordet" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Skicka återställningslänk" }),
  ).toBeVisible();
});
