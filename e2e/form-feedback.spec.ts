import { expect, test } from "@playwright/test";
import { setSession } from "./helpers/session";

test("skyddar formulärändringar och bekräftar endast lyckad sparning", async ({
  page,
  context,
}, testInfo) => {
  test.slow();
  await setSession(context, `form-feedback-${testInfo.retry}`);
  await page.goto("/onboarding");
  await page.getByLabel("Namn på hushållet").fill("Formulärtest");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  await expect(page).toHaveURL(/\/$/);

  for (const form of [
    {
      path: "/",
      trigger: "Lägg till utgift",
      field: "Namn på utgiften",
      amount: "Belopp per betalning (kr)",
      name: "Mobil",
      save: "Spara utgift",
      message: "Utgiften tillagd",
    },
    {
      path: "/",
      trigger: "Lägg till sparande",
      field: "Namn på sparandet",
      amount: "Belopp per månad (kr)",
      name: "Buffert",
      save: "Spara sparande",
      message: "Sparandet tillagt",
    },
    {
      path: "/settings",
      trigger: "Lägg till inkomst",
      field: "Namn på inkomsten",
      amount: "Belopp per månad efter skatt (kr)",
      name: "Lön",
      save: "Spara inkomst",
      message: "Inkomsten tillagd",
    },
    {
      path: "/settings",
      trigger: "Lägg till familjemedlem",
      field: "Medlemmens namn",
      name: "Kim",
      save: "Spara familjemedlem",
      message: "Familjemedlemmen tillagd",
    },
  ]) {
    await page.goto(form.path);
    const trigger = page.getByRole("button", {
      name: form.trigger,
      exact: true,
    });
    await trigger.click();
    let dialog = page.getByRole("dialog", { name: form.trigger, exact: true });
    // An untouched form and a restored original value close without a warning.
    await dialog.getByLabel(form.field).fill("Tillfälligt");
    await dialog.getByLabel(form.field).fill("");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await trigger.click();
    dialog = page.getByRole("dialog", { name: form.trigger, exact: true });
    await dialog.getByLabel(form.field).fill(form.name);
    await page.keyboard.press("Escape");
    const confirmation = page.getByRole("alertdialog", {
      name: "Du har osparade ändringar",
    });
    await expect(
      confirmation.getByRole("button", { name: "Fortsätt redigera" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(confirmation).toHaveCount(0);
    await expect(dialog.getByLabel(form.field)).toHaveValue(form.name);
    await expect(dialog.getByLabel(form.field)).toBeFocused();

    await dialog.getByRole("button", { name: "Stäng", exact: true }).click();
    await expect(confirmation).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(confirmation).toHaveCount(0);
    await expect(dialog.getByLabel(form.field)).toHaveValue(form.name);

    await page.mouse.click(5, 5);
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole("button", { name: "Kasta ändringar" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(dialog.getByLabel(form.field)).toBeEmpty();
    await dialog.getByLabel(form.field).fill(form.name);
    if (form.amount) {
      await dialog.getByLabel(form.amount).fill("-1");
      await dialog.getByRole("button", { name: form.save }).click();
      await expect(dialog.getByRole("alert")).toBeVisible();
      await expect(
        page.getByRole("status").filter({ hasText: form.message }),
      ).toHaveCount(0);
      await expect(dialog.getByLabel(form.field)).toHaveValue(form.name);
      await dialog.getByLabel(form.amount).fill("1000");
    }
    await dialog.getByRole("button", { name: form.save }).click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("status").filter({ hasText: form.message }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Stäng bekräftelsen" }).click();
  }

  // Touch-sized confirmation stays visible and keeps unsaved data.
  await page.setViewportSize({ width: 320, height: 640 });
  await page.getByRole("button", { name: "Lägg till familjemedlem" }).click();
  await page.getByLabel("Medlemmens namn").fill("Robin");
  await page.getByRole("button", { name: "Stäng", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeInViewport({ ratio: 1 });
  await page.screenshot({
    path: testInfo.outputPath("unsaved-changes-mobile.png"),
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Fortsätt redigera" }).click();
  await expect(page.getByLabel("Medlemmens namn")).toHaveValue("Robin");

  // A close request during the server action must not lose its result.
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let reached!: () => void;
  const requested = new Promise<void>((resolve) => {
    reached = resolve;
  });
  await page.route("**/settings", async (route) => {
    if (route.request().method() === "POST") {
      reached();
      await gate;
    }
    await route.continue();
  });
  try {
    await page.getByRole("button", { name: "Spara familjemedlem" }).click();
    await requested;
    await expect(
      page.getByRole("button", { name: "Spara familjemedlem" }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Stäng", exact: true }).click();
    await expect(
      page.getByRole("dialog", {
        name: "Lägg till familjemedlem",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
  } finally {
    release();
  }
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText(/Familjemedlemmen tillagd/);
  await expect(page.getByRole("status")).toBeEmpty({ timeout: 7000 });
});
