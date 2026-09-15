import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  date,
  foreignKey,
  index,
  numeric,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

const id = () =>
  bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity();
const money = (name: string) =>
  numeric(name, { precision: 14, scale: 2, mode: "number" });
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull();

export const householdRole = pgEnum("household_role", ["owner", "member"]);
export const categoryKind = pgEnum("category_kind", [
  "income",
  "expense",
  "saving",
]);
export const accountKind = pgEnum("account_kind", [
  "cash",
  "saving",
  "investment",
  "pension",
  "asset",
  "liability",
]);
export const recurringItemKind = pgEnum("recurring_item_kind", [
  "income",
  "expense",
  "saving",
  "reserve",
]);
export const cadenceUnit = pgEnum("cadence_unit", ["week", "month", "year"]);
export const recurringDestination = pgEnum("recurring_destination", [
  "direct",
  "allocated",
  "shared_saving",
]);
export const planItemStatus = pgEnum("plan_item_status", [
  "planned",
  "paid",
  "skipped",
]);
export const transactionSource = pgEnum("transaction_source", [
  "manual",
  "import",
]);

export const households = pgTable(
  "households",
  {
    id: id(),
    name: text("name").notNull(),
    currency: char("currency", { length: 3 }).default("SEK").notNull(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      "households_name_length",
      sql`char_length(${table.name}) between 1 and 120`,
    ),
    uniqueIndex("households_owner_user_id_uidx").on(table.ownerUserId),
  ],
);

export const householdMembers = pgTable(
  "household_members",
  {
    householdId: bigint("household_id", { mode: "number" })
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: householdRole().default("member").notNull(),
    displayName: text("display_name"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.householdId, table.userId] }),
    check(
      "household_members_display_name_length",
      sql`${table.displayName} is null or char_length(${table.displayName}) <= 120`,
    ),
    index("household_members_user_id_idx").on(table.userId),
  ],
);

export const householdMemberIncome = pgTable(
  "household_member_income",
  {
    householdId: bigint("household_id", { mode: "number" }).notNull(),
    userId: text("user_id").notNull(),
    monthlyNetIncome: numeric("monthly_net_income", {
      precision: 14,
      scale: 2,
    }),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({ columns: [table.householdId, table.userId] }),
    foreignKey({
      columns: [table.householdId, table.userId],
      foreignColumns: [householdMembers.householdId, householdMembers.userId],
    }).onDelete("cascade"),
    index("household_member_income_user_id_idx").on(table.userId),
    check(
      "household_member_income_nonnegative",
      sql`${table.monthlyNetIncome} >= 0 and ${table.monthlyNetIncome} <= 999999999999.99`,
    ),
    pgPolicy("household_member_income_select", {
      for: "select",
      using: sql`(select private.has_household_access(${table.householdId}))`,
    }),
    pgPolicy("household_member_income_insert", {
      for: "insert",
      withCheck: sql`${table.userId} = (select private.current_user_id()) and (select private.has_household_access(${table.householdId}))`,
    }),
    pgPolicy("household_member_income_update", {
      for: "update",
      using: sql`${table.userId} = (select private.current_user_id()) and (select private.has_household_access(${table.householdId}))`,
      withCheck: sql`${table.userId} = (select private.current_user_id()) and (select private.has_household_access(${table.householdId}))`,
    }),
    pgPolicy("household_member_income_delete", {
      for: "delete",
      using: sql`${table.userId} = (select private.current_user_id()) and (select private.has_household_access(${table.householdId}))`,
    }),
  ],
).enableRLS();

export const categories = pgTable(
  "categories",
  {
    id: id(),
    householdId: bigint("household_id", { mode: "number" })
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: categoryKind().notNull(),
    color: text("color"),
    sortOrder: smallint("sort_order").default(0).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      "categories_name_length",
      sql`char_length(${table.name}) between 1 and 120`,
    ),
    check(
      "categories_color_hex",
      sql`${table.color} is null or ${table.color} ~ '^#[0-9A-Fa-f]{6}$'`,
    ),
    unique("categories_household_name_kind_unique").on(
      table.householdId,
      table.name,
      table.kind,
    ),
    unique("categories_id_household_unique").on(table.id, table.householdId),
    index("categories_household_id_idx").on(table.householdId),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    id: id(),
    householdId: bigint("household_id", { mode: "number" })
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    ownerLabel: text("owner_label"),
    kind: accountKind().notNull(),
    institution: text("institution"),
    active: boolean().default(true).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      "accounts_name_length",
      sql`char_length(${table.name}) between 1 and 120`,
    ),
    check(
      "accounts_owner_label_length",
      sql`${table.ownerLabel} is null or char_length(${table.ownerLabel}) <= 120`,
    ),
    check(
      "accounts_institution_length",
      sql`${table.institution} is null or char_length(${table.institution}) <= 120`,
    ),
    unique("accounts_id_household_unique").on(table.id, table.householdId),
    index("accounts_household_active_idx").on(table.householdId, table.active),
  ],
);

export const recurringItems = pgTable(
  "recurring_items",
  {
    id: id(),
    householdId: bigint("household_id", { mode: "number" })
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    categoryId: bigint("category_id", { mode: "number" }),
    name: text("name").notNull(),
    kind: recurringItemKind().notNull(),
    amount: money("amount").notNull(),
    cadenceUnit: cadenceUnit("cadence_unit").notNull(),
    cadenceInterval: numeric("cadence_interval", {
      precision: 8,
      scale: 2,
      mode: "number",
    })
      .default(1)
      .notNull(),
    startsOn: date("starts_on", { mode: "date" }),
    nextDueOn: date("next_due_on", { mode: "date" }),
    destination: recurringDestination().default("direct").notNull(),
    notes: text("notes"),
    active: boolean().default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check(
      "recurring_items_name_length",
      sql`char_length(${table.name}) between 1 and 160`,
    ),
    check("recurring_items_amount_nonnegative", sql`${table.amount} >= 0`),
    check(
      "recurring_items_cadence_positive",
      sql`${table.cadenceInterval} > 0`,
    ),
    check(
      "recurring_items_notes_length",
      sql`${table.notes} is null or char_length(${table.notes}) <= 2000`,
    ),
    unique("recurring_items_id_household_unique").on(
      table.id,
      table.householdId,
    ),
    foreignKey({
      columns: [table.categoryId, table.householdId],
      foreignColumns: [categories.id, categories.householdId],
      name: "recurring_items_category_household_fk",
    }).onDelete("restrict"),
    index("recurring_items_household_active_due_idx").on(
      table.householdId,
      table.active,
      table.nextDueOn,
    ),
    index("recurring_items_category_id_idx").on(table.categoryId),
  ],
);

// Budget participants are names, independent of accounts with login access.
export const householdPeople = pgTable(
  "household_people",
  {
    id: id(),
    householdId: bigint("household_id", { mode: "number" })
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      "household_people_name_length",
      sql`char_length(${table.name}) between 1 and 120`,
    ),
    unique("household_people_id_household_unique").on(
      table.id,
      table.householdId,
    ),
    unique("household_people_household_name_unique").on(
      table.householdId,
      table.name,
    ),
    pgPolicy("household_people_access", {
      for: "all",
      using: sql`(select private.has_household_access(${table.householdId}))`,
      withCheck: sql`(select private.has_household_access(${table.householdId}))`,
    }),
  ],
);

export const recurringItemOwners = pgTable(
  "recurring_item_owners",
  {
    householdId: bigint("household_id", { mode: "number" }).notNull(),
    recurringItemId: bigint("recurring_item_id", { mode: "number" }).notNull(),
    personId: bigint("person_id", { mode: "number" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.recurringItemId, table.personId] }),
    foreignKey({
      columns: [table.recurringItemId, table.householdId],
      foreignColumns: [recurringItems.id, recurringItems.householdId],
      name: "recurring_item_owners_item_household_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.personId, table.householdId],
      foreignColumns: [householdPeople.id, householdPeople.householdId],
      name: "recurring_item_owners_person_household_fk",
    }).onDelete("cascade"),
    index("recurring_item_owners_household_idx").on(table.householdId),
    index("recurring_item_owners_person_idx").on(table.personId),
    pgPolicy("recurring_item_owners_access", {
      for: "all",
      using: sql`(select private.has_household_access(${table.householdId}))`,
      withCheck: sql`(select private.has_household_access(${table.householdId}))`,
    }),
  ],
);

export const monthlyPlans = pgTable(
  "monthly_plans",
  {
    id: id(),
    householdId: bigint("household_id", { mode: "number" })
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    period: date("period", { mode: "date" }).notNull(),
    plannedIncome: money("planned_income").default(0).notNull(),
    plannedVariable: money("planned_variable").default(0).notNull(),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check(
      "monthly_plans_period_first_day",
      sql`extract(day from ${table.period}) = 1`,
    ),
    check("monthly_plans_income_nonnegative", sql`${table.plannedIncome} >= 0`),
    check(
      "monthly_plans_variable_nonnegative",
      sql`${table.plannedVariable} >= 0`,
    ),
    check(
      "monthly_plans_notes_length",
      sql`${table.notes} is null or char_length(${table.notes}) <= 2000`,
    ),
    unique("monthly_plans_household_period_unique").on(
      table.householdId,
      table.period,
    ),
    unique("monthly_plans_id_household_unique").on(table.id, table.householdId),
    index("monthly_plans_household_period_idx").on(
      table.householdId,
      table.period.desc(),
    ),
  ],
);

export const monthlyPlanItems = pgTable(
  "monthly_plan_items",
  {
    id: id(),
    householdId: bigint("household_id", { mode: "number" })
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    monthlyPlanId: bigint("monthly_plan_id", { mode: "number" }).notNull(),
    recurringItemId: bigint("recurring_item_id", { mode: "number" }),
    label: text("label").notNull(),
    plannedAmount: money("planned_amount").default(0).notNull(),
    actualAmount: money("actual_amount").default(0).notNull(),
    status: planItemStatus().default("planned").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      "monthly_plan_items_label_length",
      sql`char_length(${table.label}) between 1 and 160`,
    ),
    check(
      "monthly_plan_items_planned_nonnegative",
      sql`${table.plannedAmount} >= 0`,
    ),
    check(
      "monthly_plan_items_actual_nonnegative",
      sql`${table.actualAmount} >= 0`,
    ),
    foreignKey({
      columns: [table.monthlyPlanId, table.householdId],
      foreignColumns: [monthlyPlans.id, monthlyPlans.householdId],
      name: "monthly_plan_items_plan_household_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.recurringItemId, table.householdId],
      foreignColumns: [recurringItems.id, recurringItems.householdId],
      name: "monthly_plan_items_recurring_household_fk",
    }).onDelete("restrict"),
    index("monthly_plan_items_plan_idx").on(table.monthlyPlanId),
    index("monthly_plan_items_household_idx").on(table.householdId),
    index("monthly_plan_items_recurring_item_idx").on(table.recurringItemId),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: id(),
    householdId: bigint("household_id", { mode: "number" })
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    categoryId: bigint("category_id", { mode: "number" }),
    occurredOn: date("occurred_on", { mode: "date" }).notNull(),
    amount: money("amount").notNull(),
    description: text("description").notNull(),
    note: text("note"),
    source: transactionSource().default("manual").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    check("transactions_amount_nonzero", sql`${table.amount} <> 0`),
    check(
      "transactions_description_length",
      sql`char_length(${table.description}) between 1 and 240`,
    ),
    check(
      "transactions_note_length",
      sql`${table.note} is null or char_length(${table.note}) <= 2000`,
    ),
    foreignKey({
      columns: [table.accountId, table.householdId],
      foreignColumns: [accounts.id, accounts.householdId],
      name: "transactions_account_household_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.categoryId, table.householdId],
      foreignColumns: [categories.id, categories.householdId],
      name: "transactions_category_household_fk",
    }).onDelete("restrict"),
    index("transactions_household_date_id_idx").on(
      table.householdId,
      table.occurredOn.desc(),
      table.id.desc(),
    ),
    index("transactions_account_id_idx").on(table.accountId),
    index("transactions_category_id_idx").on(table.categoryId),
  ],
);

export const balanceSnapshots = pgTable(
  "balance_snapshots",
  {
    id: id(),
    householdId: bigint("household_id", { mode: "number" })
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    snapshotDate: date("snapshot_date", { mode: "date" }).notNull(),
    balance: money("balance").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      "balance_snapshots_note_length",
      sql`${table.note} is null or char_length(${table.note}) <= 2000`,
    ),
    unique("balance_snapshots_account_date_unique").on(
      table.accountId,
      table.snapshotDate,
    ),
    foreignKey({
      columns: [table.accountId, table.householdId],
      foreignColumns: [accounts.id, accounts.householdId],
      name: "balance_snapshots_account_household_fk",
    }).onDelete("cascade"),
    index("balance_snapshots_household_date_idx").on(
      table.householdId,
      table.snapshotDate.desc(),
    ),
  ],
);

export const savingsGoals = pgTable(
  "savings_goals",
  {
    id: id(),
    householdId: bigint("household_id", { mode: "number" })
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    accountId: bigint("account_id", { mode: "number" }),
    name: text("name").notNull(),
    targetAmount: money("target_amount").notNull(),
    targetDate: date("target_date", { mode: "date" }),
    monthlyContribution: money("monthly_contribution").default(0).notNull(),
    notes: text("notes"),
    active: boolean().default(true).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      "savings_goals_name_length",
      sql`char_length(${table.name}) between 1 and 160`,
    ),
    check("savings_goals_target_positive", sql`${table.targetAmount} > 0`),
    check(
      "savings_goals_contribution_nonnegative",
      sql`${table.monthlyContribution} >= 0`,
    ),
    check(
      "savings_goals_notes_length",
      sql`${table.notes} is null or char_length(${table.notes}) <= 2000`,
    ),
    foreignKey({
      columns: [table.accountId, table.householdId],
      foreignColumns: [accounts.id, accounts.householdId],
      name: "savings_goals_account_household_fk",
    }).onDelete("restrict"),
    index("savings_goals_household_active_idx").on(
      table.householdId,
      table.active,
    ),
    index("savings_goals_account_id_idx").on(table.accountId),
  ],
);

export const monthlyLiquiditySnapshots = pgTable(
  "monthly_liquidity_snapshots",
  {
    id: id(),
    householdId: bigint("household_id", { mode: "number" })
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    period: date("period", { mode: "date" }).notNull(),
    accountBalance: money("account_balance").notNull(),
    extraAdded: money("extra_added").default(0).notNull(),
    extraDeducted: money("extra_deducted").default(0).notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      "monthly_liquidity_period_first_day",
      sql`extract(day from ${table.period}) = 1`,
    ),
    check(
      "monthly_liquidity_extra_added_nonnegative",
      sql`${table.extraAdded} >= 0`,
    ),
    check(
      "monthly_liquidity_extra_deducted_nonnegative",
      sql`${table.extraDeducted} >= 0`,
    ),
    check(
      "monthly_liquidity_note_length",
      sql`${table.note} is null or char_length(${table.note}) <= 2000`,
    ),
    uniqueIndex("monthly_liquidity_household_period_uidx").on(
      table.householdId,
      table.period,
    ),
    index("monthly_liquidity_household_period_idx").on(
      table.householdId,
      table.period.desc(),
    ),
  ],
);

export const householdIncomes = pgTable(
  "household_incomes",
  {
    id: id(),
    householdId: bigint("household_id", { mode: "number" })
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    amount: money("amount").notNull(),
    startsOn: date("starts_on", { mode: "date" }).notNull(),
    endsOn: date("ends_on", { mode: "date" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check(
      "household_incomes_name_length",
      sql`char_length(${table.name}) between 1 and 160`,
    ),
    check("household_incomes_amount_nonnegative", sql`${table.amount} >= 0`),
    check(
      "household_incomes_start_first_day",
      sql`extract(day from ${table.startsOn}) = 1`,
    ),
    check(
      "household_incomes_end_first_day",
      sql`${table.endsOn} is null or extract(day from ${table.endsOn}) = 1`,
    ),
    check(
      "household_incomes_period_order",
      sql`${table.endsOn} is null or ${table.endsOn} >= ${table.startsOn}`,
    ),
    index("household_incomes_household_period_idx").on(
      table.householdId,
      table.startsOn,
      table.endsOn,
    ),
    pgPolicy("household_incomes_access", {
      for: "all",
      using: sql`(select private.has_household_access(${table.householdId}))`,
      withCheck: sql`(select private.has_household_access(${table.householdId}))`,
    }),
  ],
);
