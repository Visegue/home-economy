import { expect, test, type Page } from "@playwright/test";
import { setSession } from "./helpers/session";

test("återgår från ändring till uppdaterade detaljer för samma sparande", async ({
  page,
  context,
}, testInfo) => {
  test.slow();
  await setSession(context, `detail-management-${testInfo.retry}`);
  await page.goto("/onboarding");
  await page.getByLabel("Namn på hushållet").fill("Detaljhantering");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/?month=2027-01");
  await page.getByRole("button", { name: "Lägg till sparande" }).click();
  await page.getByLabel("Namn på sparandet").fill("Buffert");
  await page.getByLabel("Belopp per månad (kr)").fill("100");
  await page.getByRole("button", { name: "Spara sparande" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("table", { name: "Månadssparande" })
    .getByRole("button", { name: "Buffert", exact: true })
    .click();
  const details = page.getByRole("dialog", { name: "Buffert", exact: true });
  await details.getByRole("button", { name: "Ändra", exact: true }).click();
  const form = page.getByRole("dialog", {
    name: "Ändra sparande",
    exact: true,
  });
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await form.getByRole("button", { name: "Stäng", exact: true }).click();
  await expect(
    details.getByRole("button", { name: "Ändra", exact: true }),
  ).toBeFocused();
  await details.getByRole("button", { name: "Ändra", exact: true }).click();
  await form.getByLabel("Namn på sparandet").fill("Ny buffert");
  await form.getByLabel("Belopp per månad (kr)").fill("200");
  await form.getByLabel("Ändringen gäller från").fill("2027-01-15");
  await form.getByRole("button", { name: "Spara sparande" }).click();
  const updated = page.getByRole("dialog", { name: "Ny buffert", exact: true });
  await expect(updated).toContainText("200,00 kr");
  await expect(
    updated.getByRole("button", { name: "Ändra", exact: true }),
  ).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await updated.getByRole("button", { name: "Avsluta", exact: true }).click();
  const end = page.getByRole("dialog", {
    name: "Avsluta sparande",
    exact: true,
  });
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await end.getByRole("button", { name: "Avbryt", exact: true }).click();
  await expect(
    updated.getByRole("button", { name: "Avsluta", exact: true }),
  ).toBeFocused();
  await updated.getByRole("button", { name: "Avsluta", exact: true }).click();
  await end
    .getByRole("button", { name: "Bekräfta avslut av Ny buffert" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const card = page.getByRole("region", { name: "Spara", exact: true });
  await expect(card).toBeFocused();
  await expect(
    page.getByRole("status").filter({ hasText: "Sparandet avslutat" }),
  ).toBeVisible();
  // The earlier version remains in January, but success always returns to overview.
  await card.getByRole("button", { name: "Buffert", exact: true }).click();
  await details.getByRole("button", { name: "Avsluta", exact: true }).click();
  await end.getByLabel("Avsluta från").fill("2027-01-01");
  await end.getByRole("button", { name: "Bekräfta avslut av Buffert" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card).toContainText("Inget sparande ännu");
  await expect(card).toBeFocused();
});

async function holdAction(page: Page) {
  let release!: () => void;
  let started!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const waiting = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route("**/*", async (route) => {
    if (
      route.request().method() !== "POST" ||
      !route.request().headers()["next-action"]
    )
      return route.continue();
    const response = await route.fetch();
    started();
    await gate;
    await route.fulfill({ response });
  });
  return {
    waiting,
    release: async () => {
      release();
      await page.unrouteAll({ behavior: "wait" });
    },
  };
}

test("skyddar ändring och avslut för alla posttyper med en modal och rätt fokus", async ({
  page,
  context,
}, testInfo) => {
  test.slow();
  await setSession(context, `detail-guards-${testInfo.retry}`);
  await page.goto("/onboarding");
  await page.getByLabel("Namn på hushållet").fill("Formulärskydd för detaljer");
  await page.getByRole("button", { name: "Skapa mitt hushåll" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/?month=2027-01");
  const cases = [
    {
      type: "Direkt utgift",
      name: "Direkt",
      field: "Namn på utgiften",
      amount: "Belopp per betalning (kr)",
      save: "Spara utgift",
      title: "Ändra utgift",
      end: "Avsluta utgift",
      card: "Utgifter",
      value: "1200",
    },
    {
      type: "Avsatt utgift",
      name: "Avsatt",
      field: "Namn på utgiften",
      amount: "Belopp per betalning (kr)",
      save: "Spara utgift",
      title: "Ändra utgift",
      end: "Avsluta utgift",
      card: "Utgifter",
      value: "1200",
    },
    {
      type: "Avräkning",
      name: "Avräkningstest",
      field: "Namn på utgiften",
      amount: "Kostnad i dag (kr)",
      save: "Spara avräkning",
      title: "Ändra avräkning",
      end: "Avsluta utgift",
      card: "Avräkningar",
      value: "12000",
    },
    {
      type: "Sparande",
      name: "Sparande",
      field: "Namn på sparandet",
      amount: "Belopp per månad (kr)",
      save: "Spara sparande",
      title: "Ändra sparande",
      end: "Avsluta sparande",
      card: "Spara",
      value: "100",
    },
  ];
  for (const item of cases) {
    await page
      .getByRole("button", {
        name:
          item.type === "Sparande" ? "Lägg till sparande" : "Lägg till utgift",
        exact: true,
      })
      .click();
    if (item.type !== "Sparande")
      await page.getByRole("radio", { name: item.type, exact: true }).check();
    await page.getByLabel(item.field).fill(item.name);
    await page.getByLabel(item.amount).fill(item.value);
    if (item.type === "Avsatt utgift")
      await page
        .getByLabel("Nästa betalning", { exact: true })
        .fill("2027-12-01");
    if (item.type === "Avräkning") {
      await page.getByLabel("Nästa utgiftsdatum").fill("2029-01-01");
      await page.getByRole("checkbox", { name: "Lägg till påslag" }).uncheck();
      await page
        .getByRole("checkbox", { name: "Räkna med inflation" })
        .uncheck();
    }
    await page.getByRole("button", { name: item.save, exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await expect(
    page.getByRole("button", {
      name: /^(Hantera|Klar med) (utgifter|avräkningar|sparande)$/,
    }),
  ).toHaveCount(0);
  for (const [index, item] of cases.entries()) {
    if (index % 2) await page.setViewportSize({ width: 390, height: 844 });
    else await page.setViewportSize({ width: 1280, height: 844 });
    const nameButton = page
      .getByRole("table")
      .getByRole("button", { name: item.name, exact: true });
    await nameButton.press("Enter");
    const details = page.getByRole("dialog", { name: item.name, exact: true });
    const edit = details.getByRole("button", { name: "Ändra", exact: true });
    await edit.press("Enter");
    const form = page.getByRole("dialog", { name: item.title, exact: true });
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await form.getByLabel(item.field).fill("Osparat");
    await page.keyboard.press("Escape");
    const prompt = page.getByRole("alertdialog", {
      name: "Du har osparade ändringar",
    });
    await prompt.getByRole("button", { name: "Fortsätt redigera" }).click();
    await expect(form.getByLabel(item.field)).toHaveValue("Osparat");
    await form.getByRole("button", { name: "Stäng", exact: true }).click();
    await prompt.getByRole("button", { name: "Kasta ändringar" }).click();
    await expect(edit).toBeFocused();
    await expect(details).not.toContainText("Osparat");
    await edit.click();
    await form.getByLabel(item.amount).fill("-1");
    await form.getByRole("button", { name: item.save, exact: true }).click();
    await expect(form.getByRole("alert")).toBeVisible();
    await expect(form.getByLabel(item.amount)).toHaveValue("-1");
    await form.getByLabel(item.amount).fill(item.value);
    await form.getByLabel(item.field).fill(item.name + " ny");
    await form.getByLabel("Ändringen gäller från").fill("2027-01-15");
    const saveGate = await holdAction(page);
    try {
      await form.getByRole("button", { name: item.save, exact: true }).click();
      await saveGate.waiting;
      await expect(form.getByLabel(item.field)).toBeDisabled();
      await expect(
        form.getByRole("button", { name: item.save, exact: true }),
      ).toBeDisabled();
      await page.keyboard.press("Escape");
      await form.getByRole("button", { name: "Stäng", exact: true }).click();
      await page.mouse.click(3, 3);
      await expect(form).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(1);
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
    } finally {
      await saveGate.release();
    }
    const updated = page.getByRole("dialog", {
      name: item.name + " ny",
      exact: true,
    });
    await expect(
      updated.getByRole("button", { name: "Ändra", exact: true }),
    ).toBeFocused();
    await expect(updated).toContainText("15 jan. 2027");
    if (index < 2)
      await page.screenshot({
        path: testInfo.outputPath(
          `detail-management-${index === 0 ? "desktop" : "mobile"}.png`,
        ),
        animations: "disabled",
      });
    await updated.getByRole("button", { name: "Avsluta", exact: true }).click();
    const end = page.getByRole("dialog", { name: item.end, exact: true });
    await end.getByLabel("Avsluta från").fill("2027-01-15");
    const endGate = await holdAction(page);
    try {
      await end
        .getByRole("button", {
          name: `Bekräfta avslut av ${item.name} ny`,
          exact: true,
        })
        .click();
      await endGate.waiting;
      await expect(
        end.getByRole("button", { name: "Avbryt", exact: true }),
      ).toBeDisabled();
      await expect(
        end.getByRole("button", {
          name: `Bekräfta avslut av ${item.name} ny`,
          exact: true,
        }),
      ).toBeDisabled();
      await page.keyboard.press("Escape");
      await end.getByRole("button", { name: "Stäng", exact: true }).click();
      await page.mouse.click(3, 3);
      await expect(end).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(1);
    } finally {
      await endGate.release();
    }
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: item.card, exact: true }),
    ).toBeFocused();
  }
});

test("följer äldre identitet vid första skrivning och bevarar senare versioner", async ({
  page,
  context,
}, testInfo) => {
  test.slow();
  await setSession(context, `detail-legacy-${testInfo.retry}`);
  await page.goto("/?month=2026-01");
  for (const item of [
    {
      year: 2026,
      table: "Månadssparande",
      name: "Äldre sparande",
      field: "Namn på sparandet",
      amount: "Belopp per månad (kr)",
      save: "Spara sparande",
      title: "Ändra sparande",
      end: "Avsluta sparande",
    },
    {
      year: 2027,
      table: "Direkta utgifter",
      name: "Äldre utgift",
      field: "Namn på utgiften",
      amount: "Belopp per betalning (kr)",
      save: "Spara utgift",
      title: "Ändra utgift",
      end: "Avsluta utgift",
    },
  ]) {
    await page.getByLabel("Välj månad").fill(`${item.year}-01`);
    await expect(page.getByLabel("Välj månad")).toHaveValue(`${item.year}-01`);
    const table = page.getByRole("table", { name: item.table, exact: true });
    const original = table.getByRole("row").filter({
      has: page.getByRole("cell", { name: "100,00 kr", exact: true }),
    });
    const independent = table.getByRole("row").filter({
      has: page.getByRole("cell", { name: "200,00 kr", exact: true }),
    });
    await original
      .getByRole("button", { name: item.name, exact: true })
      .click();
    await page
      .getByRole("dialog", { name: item.name, exact: true })
      .getByRole("button", { name: "Ändra", exact: true })
      .click();
    const form = page.getByRole("dialog", { name: item.title, exact: true });
    await form.getByLabel(item.field).fill(item.name + " ny");
    await form.getByLabel(item.amount).fill("300");
    await form.getByLabel("Ändringen gäller från").fill(`${item.year}-01-15`);
    await form.getByRole("button", { name: item.save, exact: true }).click();
    const details = page.getByRole("dialog", {
      name: item.name + " ny",
      exact: true,
    });
    await expect(
      details.getByRole("button", { name: "Ändra", exact: true }),
    ).toBeFocused();
    await expect(details).toContainText("300,00 kr");
    await details.getByRole("button", { name: "Stäng", exact: true }).click();
    await expect(
      table.getByRole("button", { name: item.name + " ny", exact: true }),
    ).toBeFocused();
    await expect(independent).toContainText(item.name);
    await expect(independent).not.toContainText(item.name + " ny");
    await table
      .getByRole("button", { name: item.name + " ny", exact: true })
      .click();
    await details.getByRole("button", { name: "Ändra", exact: true }).click();
    await form.getByLabel(item.field).fill(item.name + " framtid");
    await form.getByLabel(item.amount).fill("400");
    await form.getByLabel("Ändringen gäller från").fill(`${item.year}-02-01`);
    await form.getByRole("button", { name: item.save, exact: true }).click();
    await expect(
      details.getByRole("button", { name: "Ändra", exact: true }),
    ).toBeFocused();
    await expect(details).toContainText(`31 jan. ${item.year}`);
    await details.getByRole("button", { name: "Ändra", exact: true }).click();
    await expect(form.getByLabel("Ändringen gäller från")).toHaveValue(
      `${item.year}-01-15`,
    );
    await expect(form).toContainText("Senare ändringar bevaras");
    await form.getByRole("combobox", { name: "Typ av ändring" }).click();
    await page
      .getByRole("option", { name: "Rätta denna version", exact: true })
      .click();
    await form.getByLabel(item.amount).fill("350");
    await form.getByRole("button", { name: item.save, exact: true }).click();
    await expect(details).toContainText("350,00 kr");
    await details.getByRole("button", { name: "Avsluta", exact: true }).click();
    const end = page.getByRole("dialog", { name: item.end, exact: true });
    await expect(end.getByLabel("Avsluta från")).toHaveValue(
      `${item.year}-01-15`,
    );
    await end
      .getByRole("button", {
        name: `Bekräfta avslut av ${item.name} ny`,
        exact: true,
      })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByLabel("Välj månad").fill(`${item.year}-02`);
    await expect(page.getByLabel("Välj månad")).toHaveValue(`${item.year}-02`);
    await table
      .getByRole("button", { name: item.name + " framtid", exact: true })
      .click();
    const future = page.getByRole("dialog", {
      name: item.name + " framtid",
      exact: true,
    });
    await expect(future).toContainText("400,00 kr");
    await future.getByRole("button", { name: "Ändra", exact: true }).click();
    await expect(form.getByLabel("Ändringen gäller från")).toHaveValue(
      `${item.year}-02-01`,
    );
    await form.getByRole("button", { name: "Stäng", exact: true }).click();
    await future.getByRole("button", { name: "Stäng", exact: true }).click();
    await page.getByLabel("Välj månad").fill(`${item.year}-01`);
    await expect(page.getByLabel("Välj månad")).toHaveValue(`${item.year}-01`);
  }
});
