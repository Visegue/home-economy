import { expect, type Page } from "@playwright/test";
import { monthLabel } from "../../src/features/budget/model";
const labels: Record<string, string> = {
  "Lägg till utgift": "Direkt utgift",
  "Lägg till sparande": "Sparande",
  "Lägg till avräkning": "Avräkning",
};
export function formTitle(trigger: string) {
  return trigger === "Lägg till utgift" ? "Lägg till direkt utgift" : trigger;
}
export async function openForm(page: Page, trigger: string) {
  const label = labels[trigger] ?? trigger;
  if (
    ["Direkt utgift", "Avsatt utgift", "Avräkning", "Sparande"].includes(label)
  ) {
    await page.getByRole("button", { name: "Lägg till", exact: true }).click();
    await page.getByRole("menuitem", { name: new RegExp(`^${label}`) }).click();
  } else await page.getByRole("button", { name: trigger, exact: true }).click();
}
export async function changeCreateType(page: Page, label: string) {
  await page.getByRole("button", { name: "Byt typ", exact: true }).click();
  const discard = page.getByRole("button", {
    name: "Kasta ändringar och byt typ",
    exact: true,
  });
  if (await discard.isVisible()) await discard.click();
  await page
    .getByRole("dialog", { name: "Byt typ", exact: true })
    .getByRole("button", { name: new RegExp(`^${label}`) })
    .click();
}
export async function selectMonth(page: Page, value: string) {
  const input = page.getByLabel("Välj månad", { exact: true });
  if (!(await input.isVisible()))
    await page.getByRole("button", { name: "Öppna månadsväljaren" }).click();
  await input.fill(value);
  await input.press("Escape");
  await expect(
    page.getByRole("button", { name: "Öppna månadsväljaren" }),
  ).toBeFocused();
}
export async function expectMonth(page: Page, value: string) {
  await expect(
    page.getByRole("button", { name: "Öppna månadsväljaren" }),
  ).toHaveText(monthLabel(value));
  await expect(
    page.getByRole("heading", { name: monthLabel(value), exact: true }),
  ).toBeVisible();
}
export async function monthlyPage(page: Page, label: string) {
  await page
    .getByRole("button", { name: "Månadsöversikt", exact: true })
    .click();
  await page.getByRole("menuitem", { name: label, exact: true }).click();
}
