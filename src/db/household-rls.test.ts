// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  categories,
  householdMembers,
  householdPeople,
  householdIncomes,
  recurringItems,
  recurringItemOwners,
  households,
  savingsGoals,
  schema,
  user,
} from "./schema";

const identity = vi.hoisted(() => ({ userId: "owner" }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({
  requireSession: async () => ({
    user: { id: identity.userId, name: "Testägare" },
  }),
}));
// Exercise the real authorization helper under a role that cannot bypass RLS.
vi.mock("@/db", () => ({
  db: {
    transaction: (operation: Parameters<typeof database.transaction>[0]) =>
      database.transaction(async (transaction) => {
        await transaction.execute(sql`set local role home_economy_test`);
        return operation(transaction);
      }),
  },
}));

import { withAuthenticatedDatabase } from "./authorized";
import { createPersonalHousehold } from "@/features/households/data";
import {
  addExpense,
  addPerson,
  updatePerson,
  removePerson,
  getBudgetData,
  saveIncome,
  removeIncome,
  removeExpense,
} from "@/features/budget/data";
import { currentPeriod, monthlySummary } from "@/features/budget/model";
import { getSavings, removeSaving, saveSaving } from "@/features/savings/data";
import { totalMonthlySavings } from "@/features/savings/validation";

const client = new PGlite("memory://");
const database = drizzle(client, { schema });

beforeAll(async () => {
  await migrate(database, { migrationsFolder: "drizzle" });
  await database.insert(user).values([
    {
      id: "owner",
      name: "Ägare",
      email: "owner@example.test",
      emailVerified: true,
    },
    {
      id: "member",
      name: "Medlem",
      email: "member@example.test",
      emailVerified: true,
    },
    {
      id: "outsider",
      name: "Utomstående",
      email: "outsider@example.test",
      emailVerified: true,
    },
  ]);
  await client.exec(`
    create role home_economy_test nologin;
    grant usage on schema public, private to home_economy_test;
    grant select, insert, update, delete on all tables in schema public to home_economy_test;
    grant usage, select on all sequences in schema public to home_economy_test;
  `);
});

afterAll(async () => {
  await client.close();
});

describe("household row-level security", () => {
  it("isolates households while allowing explicit members", async () => {
    const householdId = await database.transaction(async (transaction) => {
      await transaction.execute(sql`set local role home_economy_test`);
      await transaction.execute(
        sql`select set_config('app.user_id', ${"owner"}, true)`,
      );
      const [household] = await transaction
        .insert(households)
        .values({ name: "Testhushåll", ownerUserId: "owner" })
        .returning({ id: households.id });

      const duplicateHousehold = await transaction
        .insert(households)
        .values({ name: "Dubblett", ownerUserId: "owner" })
        .onConflictDoNothing({ target: households.ownerUserId })
        .returning({ id: households.id });

      expect(duplicateHousehold).toHaveLength(0);

      await transaction.insert(householdMembers).values({
        householdId: household.id,
        userId: "member",
      });
      await transaction.insert(categories).values({
        householdId: household.id,
        name: "Boende",
        kind: "expense",
      });

      return household.id;
    });

    const memberHouseholds = await database.transaction(async (transaction) => {
      await transaction.execute(sql`set local role home_economy_test`);
      await transaction.execute(
        sql`select set_config('app.user_id', ${"member"}, true)`,
      );
      return transaction.select().from(households);
    });

    const outsiderHouseholds = await database.transaction(
      async (transaction) => {
        await transaction.execute(sql`set local role home_economy_test`);
        await transaction.execute(
          sql`select set_config('app.user_id', ${"outsider"}, true)`,
        );
        return transaction.select().from(households);
      },
    );

    expect(memberHouseholds).toHaveLength(1);
    expect(memberHouseholds[0]?.id).toBe(householdId);
    expect(outsiderHouseholds).toHaveLength(0);
  });
});

describe("household writes and transaction context", () => {
  let householdId: number;
  let categoryId: number;

  beforeAll(async () => {
    identity.userId = "outsider";
    const household = await createPersonalHousehold("Isolerat testhushåll");
    householdId = household.id;
    await withAuthenticatedDatabase(async (transaction) => {
      const [category] = await transaction
        .insert(categories)
        .values({
          householdId,
          name: "Testkategori",
          kind: "expense",
        })
        .returning();
      categoryId = category.id;
      await transaction
        .insert(householdMembers)
        .values({ householdId, userId: "member" });
    });
  });

  it("returns one household and one owner membership on repeated creation", async () => {
    identity.userId = "outsider";
    const first = await createPersonalHousehold("Försök igen");
    const second = await createPersonalHousehold("Ännu ett försök");
    expect(first.id).toBe(householdId);
    expect(second).toEqual(first);
    expect(second.name).toBe("Isolerat testhushåll");
    const members = await withAuthenticatedDatabase((transaction) =>
      transaction
        .select()
        .from(householdMembers)
        .where(eq(householdMembers.householdId, householdId)),
    );
    expect(members.filter((member) => member.userId === "outsider")).toEqual([
      expect.objectContaining({ role: "owner", displayName: "Testägare" }),
    ]);
  });

  it("rejects inserts into another household", async () => {
    identity.userId = "owner";
    await expect(
      withAuthenticatedDatabase((transaction) =>
        transaction
          .insert(categories)
          .values({
            householdId,
            name: "Forbidden",
            kind: "expense",
          })
          .returning(),
      ),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
    await expect(
      withAuthenticatedDatabase((transaction) =>
        transaction
          .insert(households)
          .values({
            ownerUserId: "member",
            name: "Forbidden",
          })
          .returning(),
      ),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
  });

  it("hides rows from an outsider's reads, updates and deletes", async () => {
    identity.userId = "owner";
    await withAuthenticatedDatabase(async (transaction) => {
      expect(
        await transaction
          .select()
          .from(categories)
          .where(eq(categories.id, categoryId)),
      ).toHaveLength(0);
      expect(
        await transaction
          .update(categories)
          .set({ name: "Forbidden" })
          .where(eq(categories.id, categoryId))
          .returning(),
      ).toHaveLength(0);
      expect(
        await transaction
          .delete(categories)
          .where(eq(categories.id, categoryId))
          .returning(),
      ).toHaveLength(0);
      expect(
        await transaction
          .update(households)
          .set({ name: "Forbidden" })
          .where(eq(households.id, householdId))
          .returning(),
      ).toHaveLength(0);
      expect(
        await transaction
          .delete(households)
          .where(eq(households.id, householdId))
          .returning(),
      ).toHaveLength(0);
    });
    identity.userId = "outsider";
    const rows = await withAuthenticatedDatabase((transaction) =>
      transaction
        .select()
        .from(categories)
        .where(eq(categories.id, categoryId)),
    );
    expect(rows).toEqual([expect.objectContaining({ name: "Testkategori" })]);
  });

  it("allows member reads but rejects membership administration", async () => {
    identity.userId = "member";
    await withAuthenticatedDatabase(async (transaction) => {
      expect(
        await transaction
          .select()
          .from(categories)
          .where(eq(categories.id, categoryId)),
      ).toHaveLength(1);
      expect(
        await transaction
          .update(householdMembers)
          .set({ role: "owner" })
          .where(eq(householdMembers.householdId, householdId))
          .returning(),
      ).toHaveLength(0);
      expect(
        await transaction
          .delete(householdMembers)
          .where(eq(householdMembers.householdId, householdId))
          .returning(),
      ).toHaveLength(0);
    });
    await expect(
      withAuthenticatedDatabase((transaction) =>
        transaction
          .insert(householdMembers)
          .values({
            householdId,
            userId: "owner",
          })
          .returning(),
      ),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
  });

  it("clears identity after commit and rollback and denies access without it", async () => {
    identity.userId = "outsider";
    await withAuthenticatedDatabase(async (transaction) => {
      expect(await transaction.select().from(households)).toHaveLength(1);
    });
    const assertNoContext = () =>
      database.transaction(async (transaction) => {
        await transaction.execute(sql`set local role home_economy_test`);
        const context = await transaction.execute<{ user_id: string | null }>(
          sql`select nullif(current_setting('app.user_id', true), '') as user_id`,
        );
        expect(context.rows[0]?.user_id).toBeNull();
        expect(await transaction.select().from(households)).toHaveLength(0);
        expect(await transaction.select().from(categories)).toHaveLength(0);
      });
    await assertNoContext();
    const rollback = new Error("Synthetic rollback");
    await expect(
      withAuthenticatedDatabase(async (transaction) => {
        await transaction
          .update(categories)
          .set({ name: "Rolled back" })
          .where(eq(categories.id, categoryId));
        throw rollback;
      }),
    ).rejects.toBe(rollback);
    await assertNoContext();
    const rows = await withAuthenticatedDatabase((transaction) =>
      transaction
        .select()
        .from(categories)
        .where(eq(categories.id, categoryId)),
    );
    expect(rows).toEqual([expect.objectContaining({ name: "Testkategori" })]);
  });
});

describe("budget persistence and isolation", () => {
  let personId: number;
  let expenseId: number;
  let ownerHouseholdId: number;
  let incomeId: number;
  it("saves members, multiple owners and monthly income without duplicates", async () => {
    identity.userId = "owner";
    expect(await addPerson("Kim")).toBe(true);
    expect(await addPerson("Robin")).toBe(true);
    expect(await addPerson("Kim")).toBe(false);
    let data = await getBudgetData();
    expect(data.people.map((person) => person.color)).toEqual([
      "#d5b8ca",
      "#d6c6e5",
    ]);
    personId = data.people[0].id;
    ownerHouseholdId = data.household.id;
    await addExpense({
      name: "Försäkring",
      amount: 120_000,
      period: "2026-09",
      type: "allocated",
      months: 12,
      nextDueOn: "2027-08-31",
      ownerIds: [...data.people.map((person) => person.id), personId],
    });
    await addExpense({
      name: "Hyra",
      amount: 1_000_000,
      period: "2026-09",
      type: "direct",
      months: 1,
      nextDueOn: "",
      ownerIds: [],
    });
    incomeId = await saveIncome({
      name: "Lön",
      amount: 2_000_000,
      startsOn: "2026-09",
      endsOn: null,
    });
    await saveIncome({
      id: incomeId,
      name: "Lön",
      amount: 2_000_000,
      startsOn: "2026-09",
      endsOn: "2026-12",
    });
    await saveIncome({
      name: "Bidrag",
      amount: 100_001,
      startsOn: "2026-09",
      endsOn: null,
    });
    data = await getBudgetData();
    const expense = data.expenses.find((item) => item.name === "Försäkring")!;
    expenseId = expense.id;
    expect(expense.owners).toHaveLength(2);
    expect(expense.nextDueOn).toBe("2027-08-31");
    expect(data.incomes).toHaveLength(2);
    expect(
      monthlySummary("2026-09", data.expenses, data.incomes),
    ).toMatchObject({ totalInOre: 1_010_000, remainingInOre: 1_090_001 });
  });
  it("forces RLS on both new tables", async () => {
    const rows = await client.query<{
      relforcerowsecurity: boolean;
      relrowsecurity: boolean;
    }>(
      "select relforcerowsecurity, relrowsecurity from pg_class where relname in ('household_people', 'recurring_item_owners', 'household_incomes')",
    );
    expect(rows.rows).toHaveLength(3);
    for (const row of rows.rows)
      expect(row).toEqual({ relforcerowsecurity: true, relrowsecurity: true });
  });
  it("hides other households and rejects forged owner IDs atomically", async () => {
    identity.userId = "outsider";
    expect((await getBudgetData()).expenses).toHaveLength(0);
    await withAuthenticatedDatabase(async (transaction) => {
      expect(await transaction.select().from(householdPeople)).toHaveLength(0);
      expect(await transaction.select().from(recurringItemOwners)).toHaveLength(
        0,
      );
      expect(
        await transaction
          .update(householdPeople)
          .set({ name: "Forbidden" })
          .where(eq(householdPeople.id, personId))
          .returning(),
      ).toHaveLength(0);
      expect(
        await transaction
          .delete(recurringItemOwners)
          .where(eq(recurringItemOwners.recurringItemId, expenseId))
          .returning(),
      ).toHaveLength(0);
    });
    await expect(
      addExpense({
        name: "Forbidden",
        amount: 100,
        period: "2026-09",
        type: "direct",
        months: 1,
        nextDueOn: "",
        ownerIds: [personId],
      }),
    ).rejects.toThrow("Invalid household participants");
    expect((await getBudgetData()).expenses).toHaveLength(0);
    await expect(
      withAuthenticatedDatabase((transaction) =>
        transaction
          .insert(householdPeople)
          .values({ householdId: ownerHouseholdId, name: "Forbidden" })
          .returning(),
      ),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
    await expect(
      withAuthenticatedDatabase((transaction) =>
        transaction
          .insert(recurringItemOwners)
          .values({
            householdId: ownerHouseholdId,
            recurringItemId: expenseId,
            personId,
          })
          .returning(),
      ),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
    expect((await getBudgetData()).incomes).toHaveLength(0);
    await expect(
      saveIncome({
        id: incomeId,
        name: "Forbidden",
        amount: 10,
        startsOn: "2026-09",
        endsOn: null,
      }),
    ).rejects.toThrow("Income not found in household");
    await removeIncome(incomeId);
    await withAuthenticatedDatabase(async (transaction) => {
      expect(await transaction.select().from(householdIncomes)).toHaveLength(0);
      expect(
        await transaction
          .update(householdIncomes)
          .set({ amount: 1 })
          .where(eq(householdIncomes.id, incomeId))
          .returning(),
      ).toHaveLength(0);
      expect(
        await transaction
          .delete(householdIncomes)
          .where(eq(householdIncomes.id, incomeId))
          .returning(),
      ).toHaveLength(0);
    });
    await expect(
      withAuthenticatedDatabase((transaction) =>
        transaction
          .insert(householdIncomes)
          .values({
            householdId: ownerHouseholdId,
            name: "Forbidden",
            amount: 1,
            startsOn: new Date("2026-09-01"),
          })
          .returning(),
      ),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
    await removeExpense(expenseId, "2026-09");
    identity.userId = "owner";
    expect(
      (await getBudgetData()).expenses.some(
        (expense) => expense.id === expenseId,
      ),
    ).toBe(true);
  });
  it("edits and removes only the selected income source", async () => {
    identity.userId = "owner";
    const incomes = (await getBudgetData()).incomes;
    expect(incomes.find((income) => income.id === incomeId)).toMatchObject({
      endsOn: "2026-12",
      amountInOre: 2_000_000,
    });
    expect(monthlySummary("2027-01", [], incomes).incomeInOre).toBe(100_001);
    await removeIncome(incomeId);
    expect((await getBudgetData()).incomes).toEqual([
      expect.objectContaining({ name: "Bidrag" }),
    ]);
  });
  it("rejects cross-household links even for a user with access to both", async () => {
    identity.userId = "outsider";
    await addPerson("Annan medlem");
    const other = await getBudgetData();
    identity.userId = "member";
    await expect(
      withAuthenticatedDatabase((transaction) =>
        transaction
          .insert(recurringItemOwners)
          .values({
            householdId: ownerHouseholdId,
            recurringItemId: expenseId,
            personId: other.people[0].id,
          })
          .returning(),
      ),
    ).rejects.toMatchObject({ cause: { code: "23503" } });
    await expect(
      withAuthenticatedDatabase((transaction) =>
        transaction
          .insert(recurringItemOwners)
          .values({
            householdId: other.household.id,
            recurringItemId: expenseId,
            personId: other.people[0].id,
          })
          .returning(),
      ),
    ).rejects.toMatchObject({ cause: { code: "23503" } });
  });
  it("removes an expense from the budget while preserving its stored record", async () => {
    identity.userId = "owner";
    await removeExpense(expenseId, "2026-09");
    expect(
      (await getBudgetData()).expenses.some(
        (expense) => expense.id === expenseId,
      ),
    ).toBe(false);
    const [stored] = await withAuthenticatedDatabase((transaction) =>
      transaction
        .select()
        .from(recurringItems)
        .where(eq(recurringItems.id, expenseId)),
    );
    expect(stored.active).toBe(false);
  });
});

describe("income changes with history", () => {
  it("splits a source atomically, preserves boundaries and rejects stale or unauthorized changes", async () => {
    identity.userId = "owner";
    const original = {
      name: "Historiklön",
      amount: 3_000_050,
      startsOn: "2026-12",
      endsOn: "2027-06",
    };
    const id = await saveIncome(original);
    const change = { ...original, id, amount: 3_200_075, startsOn: "2027-01" };

    identity.userId = "outsider";
    await expect(saveIncome(change)).rejects.toThrow(
      "Income not found in household",
    );
    identity.userId = "owner";
    await expect(
      saveIncome({ ...change, startsOn: "2026-11" }),
    ).rejects.toThrow("giltighetsperiod");
    // An insert failure must also roll back the preceding end-date update.
    await expect(saveIncome({ ...change, name: "" })).rejects.toMatchObject({
      cause: { code: "23514" },
    });
    expect(
      (await getBudgetData()).incomes.find((income) => income.id === id),
    ).toMatchObject({
      startsOn: "2026-12",
      endsOn: "2027-06",
      amountInOre: 3_000_050,
    });

    const nextId = await saveIncome(change);
    expect(nextId).not.toBe(id);
    const sources = (await getBudgetData()).incomes.filter(
      (income) => income.id === id || income.id === nextId,
    );
    expect(sources).toHaveLength(2);
    expect(sources.find((income) => income.id === id)).toMatchObject({
      endsOn: "2026-12",
      amountInOre: 3_000_050,
    });
    expect(sources.find((income) => income.id === nextId)).toMatchObject({
      startsOn: "2027-01",
      endsOn: "2027-06",
      amountInOre: 3_200_075,
    });
    expect(monthlySummary("2026-12", [], sources).incomeInOre).toBe(3_000_050);
    expect(monthlySummary("2027-01", [], sources).incomeInOre).toBe(3_200_075);
    expect(monthlySummary("2027-06", [], sources).incomeInOre).toBe(3_200_075);
    expect(monthlySummary("2027-07", [], sources).incomeInOre).toBeNull();
    await expect(saveIncome(change)).rejects.toThrow("giltighetsperiod");
    expect(await saveIncome({ ...change, id: nextId, amount: 0 })).toBe(nextId);
    expect(
      (await getBudgetData()).incomes.filter(
        (income) => income.name === original.name,
      ),
    ).toHaveLength(2);
    await removeIncome(id);
    await removeIncome(nextId);
  });
});

describe("initial household income", () => {
  it("creates an ongoing source once and preserves zero and omitted income", async () => {
    for (const [id, amount] of [
      ["initial-paid", 3_250_075],
      ["initial-zero", 0],
      ["initial-missing", null],
    ] as const) {
      await database.insert(user).values({
        id,
        name: "Testperson",
        email: `${id}@example.test`,
        emailVerified: true,
      });
      identity.userId = id;
      await createPersonalHousehold("Nytt hushåll", amount);
      await createPersonalHousehold("Upprepning", 100);
      const data = await getBudgetData();
      const expected =
        amount === null
          ? []
          : [
              {
                name: "Månadsinkomst",
                amountInOre: amount,
                startsOn: currentPeriod(),
                endsOn: null,
              },
            ];
      expect(
        data.incomes.map(({ name, amountInOre, startsOn, endsOn }) => ({
          name,
          amountInOre,
          startsOn,
          endsOn,
        })),
      ).toEqual(expected);
      expect(
        monthlySummary(currentPeriod(), [], data.incomes).incomeInOre,
      ).toBe(amount);
    }
  });
});

describe("monthly savings persistence and household isolation", () => {
  let savingHouseholdId: number;

  beforeAll(async () => {
    await database.insert(user).values(
      ["saving-owner", "saving-outsider"].map((id) => ({
        id,
        name: "Synthetic saving user",
        email: `${id}@example.test`,
        emailVerified: true,
      })),
    );
    identity.userId = "saving-owner";
    savingHouseholdId = (await createPersonalHousehold("Sparhushåll")).id;
    identity.userId = "saving-outsider";
    await createPersonalHousehold("Annat sparhushåll");
  });

  it("creates savings without a target, preserves öre and updates and removes contributions", async () => {
    identity.userId = "saving-owner";
    expect(await getSavings()).toEqual([]);
    await saveSaving({ name: "Buffert", amountInOre: 125075 });
    await saveSaving({ name: "Semester", amountInOre: 50029 });
    const [first, second] = await getSavings();
    expect(first).toMatchObject({ name: "Buffert", amountInOre: 125075 });
    expect(second).toMatchObject({ name: "Semester", amountInOre: 50029 });
    await saveSaving({ name: "Ny buffert", amountInOre: 200099 }, first.id);
    expect(await getSavings()).toEqual([
      { ...first, name: "Ny buffert", amountInOre: 200099 },
      second,
    ]);
    await removeSaving(first.id);
    expect(await getSavings()).toEqual([second]);
    await expect(
      saveSaving({ name: "Återställd", amountInOre: 1 }, first.id),
    ).rejects.toThrow("Sparandet finns inte längre.");
  });

  it("rejects cross-household reads and writes through both data helpers and RLS", async () => {
    identity.userId = "saving-owner";
    const [saving] = await getSavings();
    identity.userId = "saving-outsider";
    expect(await getSavings()).toEqual([]);
    await expect(
      saveSaving({ name: "Forbidden", amountInOre: 1 }, saving.id),
    ).rejects.toThrow("Sparandet finns inte längre.");
    await expect(removeSaving(saving.id)).rejects.toThrow(
      "Sparandet finns inte längre.",
    );
    await withAuthenticatedDatabase(async (transaction) => {
      expect(await transaction.select().from(savingsGoals)).toHaveLength(0);
      expect(
        await transaction
          .update(savingsGoals)
          .set({ monthlyContribution: "1.00" })
          .where(eq(savingsGoals.id, saving.id))
          .returning(),
      ).toHaveLength(0);
      expect(
        await transaction
          .delete(savingsGoals)
          .where(eq(savingsGoals.id, saving.id))
          .returning(),
      ).toHaveLength(0);
    });
    await expect(
      withAuthenticatedDatabase((transaction) =>
        transaction
          .insert(savingsGoals)
          .values({
            householdId: savingHouseholdId,
            name: "Forbidden",
            monthlyContribution: "1.00",
          })
          .returning(),
      ),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
    identity.userId = "saving-owner";
    expect(await getSavings()).toEqual([saving]);
  });

  it("rejects invalid amounts at the application and database boundaries", async () => {
    identity.userId = "saving-owner";
    for (const amountInOre of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(
        saveSaving({ name: "Invalid", amountInOre }),
      ).rejects.toMatchObject({ name: "ZodError" });
    }
    await expect(
      withAuthenticatedDatabase((transaction) =>
        transaction
          .insert(savingsGoals)
          .values({
            householdId: savingHouseholdId,
            name: "Negative",
            monthlyContribution: "-0.01",
          })
          .returning(),
      ),
    ).rejects.toMatchObject({ cause: { code: "23514" } });
  });
});

describe("expense and saving validity", () => {
  beforeAll(async () => {
    await database.insert(user).values({
      id: "history-owner",
      name: "Testperson",
      email: "history@example.test",
      emailVerified: true,
    });
    identity.userId = "history-owner";
    await createPersonalHousehold("Historiktest");
  });

  it("splits expenses atomically, retains owners and ends without changing earlier months", async () => {
    identity.userId = "history-owner";
    await addPerson("Kim");
    const person = (await getBudgetData()).people[0];
    const input = {
      name: "Hyra",
      amount: 100001,
      period: "2026-09",
      type: "direct" as const,
      months: 1,
      nextDueOn: "",
      ownerIds: [person.id],
    };
    const first = await addExpense(input);
    const next = await addExpense(
      { ...input, amount: 120075, period: "2026-10" },
      first,
    );
    expect(next).not.toBe(first);
    let expenses = (await getBudgetData()).expenses;
    expect(monthlySummary("2026-08", expenses, []).totalInOre).toBe(0);
    expect(monthlySummary("2026-09", expenses, []).totalInOre).toBe(100001);
    expect(monthlySummary("2026-10", expenses, []).totalInOre).toBe(120075);
    expect(expenses.find((item) => item.id === first)?.owners).toEqual([
      person,
    ]);
    expect(expenses.find((item) => item.id === next)?.owners).toEqual([person]);
    await expect(
      addExpense({ ...input, period: "2026-10" }, first),
    ).rejects.toThrow("giltighetsperiod");
    await expect(
      addExpense({ ...input, period: "2026-08" }, first),
    ).rejects.toThrow("giltighetsperiod");
    await removeExpense(next, "2026-11");
    expenses = (await getBudgetData()).expenses;
    expect(monthlySummary("2026-09", expenses, []).totalInOre).toBe(100001);
    expect(monthlySummary("2026-10", expenses, []).totalInOre).toBe(120075);
    expect(monthlySummary("2026-11", expenses, []).totalInOre).toBe(0);
    identity.userId = "saving-outsider";
    await expect(addExpense({ ...input, ownerIds: [] }, first)).rejects.toThrow(
      "Utgiften finns inte längre",
    );
    identity.userId = "history-owner";
  });

  it("keeps saving amounts before edits and closure, including existing undated savings", async () => {
    identity.userId = "history-owner";
    const first = await saveSaving(
      { name: "Buffert", amountInOre: 10001 },
      undefined,
      "2026-09",
    );
    const next = await saveSaving(
      { name: "Buffert", amountInOre: 20075 },
      first,
      "2026-10",
    );
    let savings = await getSavings();
    expect(totalMonthlySavings(savings, "2026-08")).toBe(0);
    expect(totalMonthlySavings(savings, "2026-09")).toBe(10001);
    expect(totalMonthlySavings(savings, "2026-10")).toBe(20075);
    await expect(
      saveSaving({ name: "Stale", amountInOre: 1 }, first, "2026-10"),
    ).rejects.toThrow("giltighetsperiod");
    await removeSaving(next, "2026-11");
    savings = await getSavings();
    expect(totalMonthlySavings(savings, "2026-09")).toBe(10001);
    expect(totalMonthlySavings(savings, "2026-10")).toBe(20075);
    expect(totalMonthlySavings(savings, "2026-11")).toBe(0);
    const legacy = await withAuthenticatedDatabase(async (transaction) => {
      const [household] = await transaction.select().from(households);
      const [saving] = await transaction
        .insert(savingsGoals)
        .values({
          householdId: household.id,
          name: "Äldre",
          monthlyContribution: "50.25",
        })
        .returning();
      return saving.id;
    });
    await saveSaving({ name: "Äldre", amountInOre: 6000 }, legacy, "2027-01");
    savings = await getSavings();
    expect(totalMonthlySavings(savings, "2020-01")).toBe(5025);
    expect(totalMonthlySavings(savings, "2026-12")).toBe(5025);
    expect(totalMonthlySavings(savings, "2027-01")).toBe(6000);
  });
});

describe("household person management", () => {
  it("renames and removes owners without deleting expenses, and isolates other households", async () => {
    await database.insert(user).values({
      id: "people-owner",
      name: "Testperson",
      email: "people@example.test",
      emailVerified: true,
    });
    identity.userId = "people-owner";
    await createPersonalHousehold("Medlemstest");
    await addPerson("Kim", "#356b9b");
    await addPerson("Robin");
    const people = (await getBudgetData()).people;
    const kim = people.find((person) => person.name === "Kim")!;
    const robin = people.find((person) => person.name === "Robin")!;
    expect(kim.color).toBe("#356b9b");
    expect(robin.color).toBe("#d6c6e5");
    const expenseId = await addExpense({
      name: "Gemensam hyra",
      amount: 123456,
      period: "2026-09",
      type: "direct",
      months: 1,
      nextDueOn: "",
      ownerIds: [kim.id, robin.id],
    });
    expect(await updatePerson(kim.id, "Robin")).toBe(false);
    expect(await updatePerson(kim.id, "Kim Ny", "#36735b")).toBe(true);
    expect(await updatePerson(kim.id, "Kim Ny")).toBe(true);
    let expense = (await getBudgetData()).expenses.find(
      (item) => item.id === expenseId,
    )!;
    expect(expense.owners).toContainEqual({
      id: kim.id,
      name: "Kim Ny",
      color: "#36735b",
    });

    identity.userId = "owner";
    await expect(updatePerson(kim.id, "Intrång", "#ffffff")).rejects.toThrow(
      "Household person not found",
    );
    await expect(removePerson(kim.id)).rejects.toThrow(
      "Household person not found",
    );

    identity.userId = "people-owner";
    expect(
      (await getBudgetData()).people.find((person) => person.id === kim.id)
        ?.color,
    ).toBe("#36735b");
    await expect(updatePerson(kim.id, "Kim Ny", "invalid")).rejects.toThrow(
      /Failed query/,
    );
    await removePerson(kim.id);
    const budget = await getBudgetData();
    expect(budget.people).toEqual([robin]);
    expense = budget.expenses.find((item) => item.id === expenseId)!;
    expect(expense.amountInOre).toBe(123456);
    expect(expense.owners).toEqual([robin]);
    await removePerson(robin.id);
    expect(
      (await getBudgetData()).expenses.find((item) => item.id === expenseId)
        ?.owners,
    ).toEqual([]);
  });
});
