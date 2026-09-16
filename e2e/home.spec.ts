import { expect, test } from "@playwright/test";

test("skickar säkerhetsheaders på inloggningssidan", async ({ request }) => {
  const response = await request.get("/login");
  expect(response.status()).toBe(200);
  const headers = response.headers();
  expect(headers["content-security-policy-report-only"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("skickar oinloggade användare till inloggningen", async ({ page }) => {
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
