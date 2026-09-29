// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  householdIncomes,
  householdMembers,
  householdPeople,
  households,
  recurringItemOwners,
  recurringItems,
  savingsGoals,
  schema,
  user,
} from "@/db/schema";

const identity = vi.hoisted(() => ({ userId: "" }));
const transactions = vi.hoisted(() => ({
  count: 0,
  modes: [] as { isolation: string; readOnly: string; userId: string }[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({
  requireSession: async () => {
    if (!identity.userId) throw new Error("Unauthenticated");
    return { user: { id: identity.userId, name: "Testägare" } };
  },
}));
// Substitute only the connection and session; run real queries and forced RLS.
vi.mock("@/db", () => ({
  db: {
    transaction: (
      operation: Parameters<typeof database.transaction>[0],
      config?: Parameters<typeof database.transaction>[1],
    ) => {
      transactions.count += 1;
      return database.transaction(async (transaction) => {
        await transaction.execute(sql`set local role monthly_overview_test`);
        const result = await operation(transaction);
        const mode = await transaction.execute<{
          isolation: string;
          readOnly: string;
          userId: string;
        }>(sql`select
          current_setting('transaction_isolation') as isolation,
          current_setting('transaction_read_only') as "readOnly",
          current_setting('app.user_id') as "userId"`);
        transactions.modes.push(mode.rows[0]);
        return result;
      }, config);
    },
  },
}));

import { addExpense, saveIncome } from "@/features/budget/data";
import { saveSaving } from "@/features/savings/data";
import { getMonthlyOverview } from "./monthly-overview";

const client = new PGlite("memory://");
const database = drizzle(client, { schema });
let householdId: number;
let fixtureNumber = 0;

beforeAll(async () => {
  await migrate(database, { migrationsFolder: "drizzle" });
  await client.exec(`
    create role monthly_overview_test nologin;
    grant usage on schema public, private to monthly_overview_test;
    grant select, insert, update, delete on all tables in schema public to monthly_overview_test;
    grant usage, select on all sequences in schema public to monthly_overview_test;
  `);
});

beforeEach(async () => {
  fixtureNumber += 1;
  identity.userId = `overview-${fixtureNumber}`;
  await database.insert(user).values({
    id: identity.userId,
    name: "Testägare",
    email: `${identity.userId}@example.test`,
  });
  const [household] = await database
    .insert(households)
    .values({
      name: "Testhushåll",
      ownerUserId: identity.userId,
    })
    .returning();
  householdId = household.id;
  await database.insert(householdMembers).values({
    householdId,
    userId: identity.userId,
    role: "owner",
  });
  transactions.count = 0;
  transactions.modes = [];
});

afterAll(async () => {
  await client.close();
});

async function expense(
  values: Partial<typeof recurringItems.$inferInsert> = {},
) {
  const [item] = await database
    .insert(recurringItems)
    .values({
      householdId,
      name: "Testutgift",
      kind: "expense",
      destination: "direct",
      amount: 100,
      cadenceUnit: "month",
      cadenceInterval: 1,
      startsOn: new Date("2026-01-01T00:00:00Z"),
      ...values,
    })
    .returning();
  return item;
}

describe("monthly overview", () => {
  it("assembles rows and totals in one authenticated read-only snapshot", async () => {
    const people = await database
      .insert(householdPeople)
      .values([
        { householdId, name: "Anna" },
        { householdId, name: "Bo" },
      ])
      .returning();
    const direct = await expense({ name: "Boende", amount: 20_000 });
    await database.insert(recurringItemOwners).values(
      people.map((person) => ({
        householdId,
        recurringItemId: direct.id,
        personId: person.id,
      })),
    );
    await expense({
      name: "Årsavgift",
      destination: "allocated",
      amount: 36_000,
      cadenceInterval: 12,
      nextDueOn: new Date("2026-06-10T00:00:00Z"),
    });
    await database.insert(householdIncomes).values({
      householdId,
      name: "Lön",
      amount: 40_000,
      startsOn: new Date("2026-01-01T00:00:00Z"),
    });
    await database.insert(savingsGoals).values({
      householdId,
      name: "Buffert",
      monthlyContribution: "5000.00",
    });

    const overview = await getMonthlyOverview("2026-06");

    expect(overview.period).toBe("2026-06");
    expect(overview.household.id).toBe(householdId);
    expect(overview.people.map((person) => person.name)).toEqual([
      "Anna",
      "Bo",
    ]);
    expect(overview.expenses[0]).toMatchObject({
      id: direct.id,
      monthlyAmountInOre: 2_000_000,
      startsOn: "2026-01-01",
      endsOn: null,
      owners: people.map(({ id, name, color }) => ({ id, name, color })),
    });
    expect(overview.savings[0]).toMatchObject({
      name: "Buffert",
      amountInOre: 500_000,
    });
    // Two owners do not duplicate the cost. A due reserve payment is not
    // deducted again: this reports contributions, not payment realization.
    expect(overview.totals).toEqual({
      incomeInOre: 4_000_000,
      directExpensesInOre: 2_000_000,
      monthlyAllocationsInOre: 300_000,
      expensesInOre: 2_300_000,
      savingsContributionsInOre: 500_000,
      transfersInOre: 800_000,
      monthlyRemainderInOre: 1_200_000,
    });
    expect(transactions.count).toBe(1);
    expect(transactions.modes).toEqual([
      {
        isolation: "repeatable read",
        readOnly: "on",
        userId: identity.userId,
      },
    ]);

    // Snapshot settings must not leak into subsequent authenticated writes.
    await saveSaving(
      { name: "Semester", amountInOre: 100 },
      undefined,
      "2026-06",
    );
    expect(transactions.modes[1]).toMatchObject({
      isolation: "read committed",
      readOnly: "off",
    });
  });

  it("preserves historical amounts and selects inclusive validity boundaries", async () => {
    const initialExpense = {
      name: "Hyra",
      amount: 100_000,
      type: "direct" as const,
      months: 1,
      nextDueOn: "",
      ownerIds: [],
      period: "2026-01",
    };
    const expenseId = await addExpense(initialExpense);
    await addExpense(
      { ...initialExpense, amount: 120_000, period: "2026-07" },
      expenseId,
    );
    const savingId = await saveSaving(
      { name: "Buffert", amountInOre: 10_000 },
      undefined,
      "2026-01",
    );
    await saveSaving(
      { name: "Buffert", amountInOre: 20_000 },
      savingId,
      "2026-07",
    );
    await saveIncome({
      name: "Lön",
      amount: 200_000,
      startsOn: "2026-01",
      endsOn: "2026-06",
    });
    await saveIncome({
      name: "Lön",
      amount: 250_000,
      startsOn: "2026-07",
      endsOn: null,
    });

    const june = await getMonthlyOverview("2026-06");
    const july = await getMonthlyOverview("2026-07");
    const before = await getMonthlyOverview("2025-12");
    expect(june.expenses).toHaveLength(1);
    expect(june.incomes).toHaveLength(1);
    expect(june.savings).toHaveLength(1);
    expect(june.totals.monthlyRemainderInOre).toBe(90_000);
    expect(june.expenses[0].endsOn).toBe("2026-06-01");
    expect(july.expenses).toHaveLength(1);
    expect(july.incomes).toHaveLength(1);
    expect(july.savings).toHaveLength(1);
    expect(july.totals.monthlyRemainderInOre).toBe(110_000);
    expect(before.expenses).toEqual([]);
    expect(before.incomes).toEqual([]);
    expect(before.savings).toEqual([]);
    expect(before.totals.monthlyRemainderInOre).toBeNull();
  });

  it("keeps unknown income distinct from zero income and allows a deficit", async () => {
    await expense();
    expect((await getMonthlyOverview("2026-06")).totals).toMatchObject({
      incomeInOre: null,
      monthlyRemainderInOre: null,
    });
    await saveIncome({
      name: "Ingen inkomst",
      amount: 0,
      startsOn: "2026-06",
      endsOn: null,
    });
    expect((await getMonthlyOverview("2026-06")).totals).toMatchObject({
      incomeInOre: 0,
      monthlyRemainderInOre: -10_000,
    });
  });

  it("sums rounded monthly amounts and includes legacy open-ended items", async () => {
    await expense({
      name: "Årlig A",
      amount: 1,
      cadenceUnit: "year",
      startsOn: null,
    });
    await expense({
      name: "Årlig B",
      amount: 1,
      cadenceUnit: "year",
      startsOn: null,
    });
    await expense({ active: false });
    await database.insert(savingsGoals).values([
      { householdId, name: "Äldre sparande", monthlyContribution: "0.01" },
      {
        householdId,
        name: "Inaktivt",
        monthlyContribution: "100.00",
        active: false,
      },
    ]);
    const overview = await getMonthlyOverview("2020-01");
    expect(overview.expenses.map((item) => item.monthlyAmountInOre)).toEqual([
      8, 8,
    ]);
    expect(overview.totals.expensesInOre).toBe(16);
    expect(overview.savings).toHaveLength(1);
    expect(overview.totals.savingsContributionsInOre).toBe(1);
  });

  it("does not combine another household even when the user is a member", async () => {
    await expense({ amount: 123 });
    await database.insert(user).values({
      id: "other-owner",
      name: "Annan ägare",
      email: "other-owner@example.test",
    });
    const [other] = await database
      .insert(households)
      .values({
        name: "Annat hushåll",
        ownerUserId: "other-owner",
      })
      .returning();
    await expense({
      householdId: other.id,
      name: "Privat utgift",
      amount: 9000,
    });
    await database.insert(savingsGoals).values({
      householdId: other.id,
      name: "Privat sparande",
      monthlyContribution: "8000.00",
    });
    await database.insert(householdIncomes).values({
      householdId: other.id,
      name: "Privat inkomst",
      amount: 7000,
      startsOn: new Date("2026-01-01T00:00:00Z"),
    });
    // First no access, then RLS permits membership but the overview still
    // selects only the owned household, just like the existing product.
    for (const member of [false, true]) {
      if (member)
        await database
          .insert(householdMembers)
          .values({ householdId: other.id, userId: identity.userId });
      const overview = await getMonthlyOverview("2026-06");
      expect(overview.expenses).toHaveLength(1);
      expect(overview.totals.expensesInOre).toBe(12_300);
      expect(overview.incomes).toEqual([]);
      expect(overview.savings).toEqual([]);
    }
  });

  it("rejects malformed periods and unauthenticated reads before opening a transaction", async () => {
    await expect(getMonthlyOverview("2026-13")).rejects.toThrow(
      "Välj en giltig månad.",
    );
    identity.userId = "";
    await expect(getMonthlyOverview("2026-06")).rejects.toThrow(
      "Unauthenticated",
    );
    expect(transactions.count).toBe(0);
  });

  it("redirects to onboarding when the authenticated user has no household", async () => {
    identity.userId = "no-household";
    await expect(getMonthlyOverview("2026-06")).rejects.toThrow(
      "NEXT_REDIRECT",
    );
  });
});
