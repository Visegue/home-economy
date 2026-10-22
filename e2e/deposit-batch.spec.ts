import { setSession, expect, test } from "./helpers/session";
import { currentPeriod, shiftPeriod } from "../src/features/budget/model";
import { currentDate } from "../src/features/periods/model";

test("månadens insättningar bevarar utkast, skyddar sparande och återhämtar förlorat svar utan dubbletter", async ({
  session,
  page,
  context,
}) => {
  test.slow();
  const period = currentPeriod(),
    previous = shiftPeriod(period, -1),
    today = currentDate();
  await page.setViewportSize({ width: 390, height: 844 });
  await setSession(context, session.token);
  await page.goto("/onboarding");
  await page.getByLabel("Namn på hushållet").fill("Månadsinsättningar");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  const dialog = page.getByRole("dialog");
  for (const [name, amount, start] of [
    ["Semester", "1000", `${previous}-01`],
    ["Extra", "0", `${previous}-01`],
    ["Nystartat", "500", today],
  ]) {
    await page.getByRole("button", { name: "Lägg till sparande" }).click();
    await dialog.getByLabel("Namn på sparandet", { exact: true }).fill(name);
    await dialog.getByLabel(/Belopp/).fill(amount);
    await dialog
      .getByLabel("Planerad dag i månaden")
      .fill(String(Number(today.slice(8))));
    await dialog.getByLabel("Från och med", { exact: true }).fill(start);
    await dialog.getByRole("button", { name: "Spara sparande" }).click();
    await expect(dialog).toHaveCount(0);
  }
  await page
    .getByRole("button", { name: "Registrera månadens insättningar" })
    .click();
  await expect(dialog.getByLabel("Utfört datum")).toHaveValue(today);
  await expect(
    dialog.getByRole("checkbox", { name: "Semester", exact: true }),
  ).toBeChecked();
  await expect(
    dialog.getByRole("checkbox", { name: "Extra", exact: true }),
  ).not.toBeChecked();
  const summary = dialog.getByRole("region", { name: "Sammanfattning" });
  let registrationRequests = 0;
  const countRegistration = (request: import("@playwright/test").Request) => {
    if (request.method() === "POST" && request.headers()["next-action"])
      registrationRequests++;
  };
  page.on("request", countRegistration);
  const semesterAmount = dialog.getByLabel("Faktiskt belopp för Semester (kr)");
  for (const invalid of ["", "abc", "0"]) {
    await semesterAmount.fill(invalid);
    await expect(summary).toContainText("Totalt —");
    await dialog
      .getByRole("button", { name: "Bekräfta 2 utförda insättningar" })
      .click();
    await expect(semesterAmount).toHaveAttribute("aria-invalid", "true");
    expect(registrationRequests).toBe(0);
  }
  await semesterAmount.fill("321");
  // A draft amount is preserved but excluded from validation and total when deselected.
  await dialog.getByLabel("Faktiskt belopp för Nystartat (kr)").fill("abc");
  await dialog
    .getByRole("checkbox", { name: "Nystartat", exact: true })
    .uncheck();
  await expect(summary).toContainText("321,00 kr");
  await dialog
    .getByRole("checkbox", { name: "Nystartat", exact: true })
    .check();
  page.off("request", countRegistration);
  await dialog.getByLabel("Faktiskt belopp för Nystartat (kr)").fill("77");
  await dialog.getByLabel("Utfört datum").fill(`${previous}-01`);
  await expect(dialog.getByRole("status")).toContainText("tagits ur urvalet");
  await expect(
    dialog.getByRole("checkbox", { name: "Nystartat", exact: true }),
  ).toHaveCount(0);
  await dialog.getByLabel("Utfört datum").fill(today);
  await expect(
    dialog.getByLabel("Faktiskt belopp för Nystartat (kr)"),
  ).toHaveValue("77");
  await expect(
    dialog.getByRole("checkbox", { name: "Nystartat", exact: true }),
  ).not.toBeChecked();
  await expect(
    dialog.getByLabel("Faktiskt belopp för Semester (kr)"),
  ).toHaveValue("321");
  await dialog
    .getByRole("checkbox", { name: "Nystartat", exact: true })
    .check();
  await dialog.getByLabel("Faktiskt belopp för Nystartat (kr)").fill("abc");
  await dialog
    .getByRole("checkbox", { name: "Nystartat", exact: true })
    .uncheck();
  await dialog.getByRole("checkbox", { name: "Extra", exact: true }).focus();
  await page.keyboard.press("Space");
  await dialog.getByLabel("Faktiskt belopp för Extra (kr)").fill("55");
  await dialog.getByRole("button", { name: "Stäng", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toContainText(
    "osparade ändringar",
  );
  await page.getByRole("button", { name: "Fortsätt redigera" }).click();
  await expect(
    dialog.getByLabel("Faktiskt belopp för Semester (kr)"),
  ).toHaveValue("321");
  await expect(
    dialog.getByRole("region", { name: "Sammanfattning" }),
  ).toContainText("376,00 kr");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  let release!: () => void, reached!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requested = new Promise<void>((resolve) => {
    reached = resolve;
  });
  let loseResponse = true;
  await page.route("**/*", async (route) => {
    if (
      route.request().method() !== "POST" ||
      !route.request().headers()["next-action"] ||
      !loseResponse
    ) {
      await route.continue();
      return;
    }
    reached();
    await gate;
    await route.fetch(); // commit succeeds, but its response never reaches the client
    loseResponse = false;
    await route.abort("failed");
  });
  try {
    await dialog
      .getByRole("button", { name: "Bekräfta 2 utförda insättningar" })
      .click();
    await requested;
    await expect(
      dialog.getByRole("button", { name: "Sparar…" }),
    ).toBeDisabled();
    await dialog.getByRole("button", { name: "Stäng", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
  } finally {
    release();
  }
  await expect(dialog.getByRole("alert")).toContainText("Försök igen");
  await expect(
    dialog.getByLabel("Faktiskt belopp för Semester (kr)"),
  ).toHaveValue("321");
  await dialog
    .getByRole("button", { name: "Bekräfta 2 utförda insättningar" })
    .click();
  await expect(dialog).toHaveCount(0);
  await page.unroute("**/*");
  await expect(
    page.getByRole("status").filter({ hasText: "insättningar registrerade" }),
  ).toContainText("2 insättningar registrerade, totalt 376,00 kr");
  await page
    .getByRole("button", { name: "Registrera månadens insättningar" })
    .click();
  await expect(
    dialog.getByLabel("Faktiskt belopp för Semester (kr)"),
  ).toHaveValue("679,00");
  await expect(
    dialog.getByRole("checkbox", { name: "Extra", exact: true }),
  ).not.toBeChecked();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.getByRole("link", { name: "Överföringar och värden" }).click();
  await expect(page.getByText("Överföringshistorik (1)")).toHaveCount(2);
  await expect(page.getByText("Överföringshistorik (0)")).toHaveCount(1);
});
