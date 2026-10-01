CREATE TABLE "confirmed_transfers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" bigint NOT NULL,
	"item_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"occurred_on" date NOT NULL,
	"attribution_month" date NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "confirmed_transfers_kind" CHECK ("confirmed_transfers"."kind" in ('deposit', 'withdrawal', 'opening')),
	CONSTRAINT "confirmed_transfers_amount" CHECK ("confirmed_transfers"."amount" >= 0 and ("confirmed_transfers"."kind" = 'opening' or "confirmed_transfers"."amount" > 0)),
	CONSTRAINT "confirmed_transfers_month" CHECK (extract(day from "confirmed_transfers"."attribution_month") = 1),
	CONSTRAINT "confirmed_transfers_note" CHECK (char_length("confirmed_transfers"."note") <= 500)
);
--> statement-breakpoint
ALTER TABLE "confirmed_transfers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "financial_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" bigint NOT NULL,
	"kind" text NOT NULL,
	CONSTRAINT "financial_items_id_household_unique" UNIQUE("id","household_id"),
	CONSTRAINT "financial_items_kind" CHECK ("financial_items"."kind" in ('expense', 'income', 'saving'))
);
--> statement-breakpoint
ALTER TABLE "financial_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "household_incomes" ADD COLUMN "item_id" uuid;--> statement-breakpoint
ALTER TABLE "household_incomes" ADD COLUMN "effective_from" date;--> statement-breakpoint
ALTER TABLE "household_incomes" ADD COLUMN "effective_through" date;--> statement-breakpoint
ALTER TABLE "household_incomes" ADD COLUMN "scheduled_day" smallint;--> statement-breakpoint
ALTER TABLE "household_incomes" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "household_incomes" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "income_day" smallint DEFAULT 25 NOT NULL;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "direct_day" smallint DEFAULT 25 NOT NULL;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "allocated_day" smallint DEFAULT 25 NOT NULL;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "replacement_day" smallint DEFAULT 25 NOT NULL;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "saving_day" smallint DEFAULT 25 NOT NULL;--> statement-breakpoint
ALTER TABLE "recurring_items" ADD COLUMN "item_id" uuid;--> statement-breakpoint
ALTER TABLE "recurring_items" ADD COLUMN "effective_from" date;--> statement-breakpoint
ALTER TABLE "recurring_items" ADD COLUMN "effective_through" date;--> statement-breakpoint
ALTER TABLE "recurring_items" ADD COLUMN "scheduled_day" smallint;--> statement-breakpoint
ALTER TABLE "recurring_items" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD COLUMN "item_id" uuid;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD COLUMN "effective_from" date;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD COLUMN "effective_through" date;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD COLUMN "scheduled_day" smallint;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "confirmed_transfers" ADD CONSTRAINT "confirmed_transfers_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirmed_transfers" ADD CONSTRAINT "confirmed_transfers_item_household_fk" FOREIGN KEY ("item_id","household_id") REFERENCES "public"."financial_items"("id","household_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_items" ADD CONSTRAINT "financial_items_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "confirmed_transfers_one_opening" ON "confirmed_transfers" USING btree ("item_id") WHERE "confirmed_transfers"."kind" = 'opening';--> statement-breakpoint
CREATE INDEX "confirmed_transfers_household_date_idx" ON "confirmed_transfers" USING btree ("household_id","occurred_on");--> statement-breakpoint
CREATE INDEX "confirmed_transfers_item_month_idx" ON "confirmed_transfers" USING btree ("item_id","attribution_month");--> statement-breakpoint
CREATE INDEX "financial_items_household_idx" ON "financial_items" USING btree ("household_id");--> statement-breakpoint
ALTER TABLE "household_incomes" ADD CONSTRAINT "household_incomes_identity_fk" FOREIGN KEY ("item_id","household_id") REFERENCES "public"."financial_items"("id","household_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_items" ADD CONSTRAINT "recurring_items_identity_fk" FOREIGN KEY ("item_id","household_id") REFERENCES "public"."financial_items"("id","household_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_identity_fk" FOREIGN KEY ("item_id","household_id") REFERENCES "public"."financial_items"("id","household_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "household_incomes_identity_idx" ON "household_incomes" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "recurring_items_identity_idx" ON "recurring_items" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "savings_goals_identity_idx" ON "savings_goals" USING btree ("item_id");--> statement-breakpoint
ALTER TABLE "household_incomes" ADD CONSTRAINT "household_incomes_effective_order" CHECK ("household_incomes"."effective_through" is null or "household_incomes"."effective_from" is null or "household_incomes"."effective_through" >= "household_incomes"."effective_from");--> statement-breakpoint
ALTER TABLE "household_incomes" ADD CONSTRAINT "household_incomes_day" CHECK ("household_incomes"."scheduled_day" between 1 and 31);--> statement-breakpoint
ALTER TABLE "households" ADD CONSTRAINT "households_scheduled_days" CHECK ("households"."income_day" between 1 and 31 and "households"."direct_day" between 1 and 31 and "households"."allocated_day" between 1 and 31 and "households"."replacement_day" between 1 and 31 and "households"."saving_day" between 1 and 31);--> statement-breakpoint
ALTER TABLE "recurring_items" ADD CONSTRAINT "recurring_items_effective_order" CHECK ("recurring_items"."effective_through" is null or "recurring_items"."effective_from" is null or "recurring_items"."effective_through" >= "recurring_items"."effective_from");--> statement-breakpoint
ALTER TABLE "recurring_items" ADD CONSTRAINT "recurring_items_day" CHECK ("recurring_items"."scheduled_day" between 1 and 31);--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_effective_order" CHECK ("savings_goals"."effective_through" is null or "savings_goals"."effective_from" is null or "savings_goals"."effective_through" >= "savings_goals"."effective_from");--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_day" CHECK ("savings_goals"."scheduled_day" between 1 and 31);--> statement-breakpoint
CREATE POLICY "confirmed_transfers_access" ON "confirmed_transfers" AS PERMISSIVE FOR ALL TO public USING ((select private.has_household_access("confirmed_transfers"."household_id"))) WITH CHECK ((select private.has_household_access("confirmed_transfers"."household_id")));--> statement-breakpoint
CREATE POLICY "financial_items_access" ON "financial_items" AS PERMISSIVE FOR ALL TO public USING ((select private.has_household_access("financial_items"."household_id"))) WITH CHECK ((select private.has_household_access("financial_items"."household_id")));
--> statement-breakpoint
ALTER TABLE "financial_items" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "confirmed_transfers" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'home_economy_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON financial_items, confirmed_transfers TO home_economy_runtime;
  END IF;
END $$;
