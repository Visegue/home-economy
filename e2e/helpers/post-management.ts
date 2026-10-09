import { expect, type Page } from "@playwright/test";

/** Enter the public monthly Details flow, without depending on row markup. */
export async function openPostAction(
  page: Page,
  name: string,
  action: "Ändra" | "Avsluta",
) {
  const existing = page.getByRole("dialog", { name, exact: true });
  if (!(await existing.isVisible()))
    await page
      .getByRole("table")
      .getByRole("button", { name, exact: true })
      .click();
  await existing.getByRole("button", { name: action, exact: true }).click();
}

export async function closePostDetails(page: Page, name: string) {
  const details = page.getByRole("dialog", { name, exact: true });
  await expect(details).toBeVisible();
  await details.getByRole("button", { name: "Stäng", exact: true }).click();
  await expect(details).toHaveCount(0);
}
