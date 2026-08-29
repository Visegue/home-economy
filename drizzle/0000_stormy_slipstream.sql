CREATE TYPE "public"."account_kind" AS ENUM('cash', 'saving', 'investment', 'pension', 'asset', 'liability');--> statement-breakpoint
CREATE TYPE "public"."cadence_unit" AS ENUM('week', 'month', 'year');--> statement-breakpoint
CREATE TYPE "public"."category_kind" AS ENUM('income', 'expense', 'saving');--> statement-breakpoint
CREATE TYPE "public"."household_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TYPE "public"."plan_item_status" AS ENUM('planned', 'paid', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."recurring_destination" AS ENUM('direct', 'allocated', 'shared_saving');--> statement-breakpoint
CREATE TYPE "public"."recurring_item_kind" AS ENUM('income', 'expense', 'saving', 'reserve');--> statement-breakpoint
CREATE TYPE "public"."transaction_source" AS ENUM('manual', 'import');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"issuer" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "accounts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"household_id" bigint NOT NULL,
	"name" text NOT NULL,
	"owner_label" text,
	"kind" "account_kind" NOT NULL,
	"institution" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_id_household_unique" UNIQUE("id","household_id"),
	CONSTRAINT "accounts_name_length" CHECK (char_length("accounts"."name") between 1 and 120),
	CONSTRAINT "accounts_owner_label_length" CHECK ("accounts"."owner_label" is null or char_length("accounts"."owner_label") <= 120),
	CONSTRAINT "accounts_institution_length" CHECK ("accounts"."institution" is null or char_length("accounts"."institution") <= 120)
);
--> statement-breakpoint
CREATE TABLE "balance_snapshots" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "balance_snapshots_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"household_id" bigint NOT NULL,
	"account_id" bigint NOT NULL,
	"snapshot_date" date NOT NULL,
	"balance" numeric(14, 2) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "balance_snapshots_account_date_unique" UNIQUE("account_id","snapshot_date"),
	CONSTRAINT "balance_snapshots_note_length" CHECK ("balance_snapshots"."note" is null or char_length("balance_snapshots"."note") <= 2000)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"household_id" bigint NOT NULL,
	"name" text NOT NULL,
	"kind" "category_kind" NOT NULL,
	"color" text,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_household_name_kind_unique" UNIQUE("household_id","name","kind"),
	CONSTRAINT "categories_id_household_unique" UNIQUE("id","household_id"),
	CONSTRAINT "categories_name_length" CHECK (char_length("categories"."name") between 1 and 120),
	CONSTRAINT "categories_color_hex" CHECK ("categories"."color" is null or "categories"."color" ~ '^#[0-9A-Fa-f]{6}$')
);
--> statement-breakpoint
CREATE TABLE "household_members" (
	"household_id" bigint NOT NULL,
	"user_id" text NOT NULL,
	"role" "household_role" DEFAULT 'member' NOT NULL,
	"display_name" text,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "household_members_household_id_user_id_pk" PRIMARY KEY("household_id","user_id"),
	CONSTRAINT "household_members_display_name_length" CHECK ("household_members"."display_name" is null or char_length("household_members"."display_name") <= 120)
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "households_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"currency" char(3) DEFAULT 'SEK' NOT NULL,
	"owner_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "households_name_length" CHECK (char_length("households"."name") between 1 and 120)
);
--> statement-breakpoint
CREATE TABLE "monthly_liquidity_snapshots" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "monthly_liquidity_snapshots_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"household_id" bigint NOT NULL,
	"period" date NOT NULL,
	"account_balance" numeric(14, 2) NOT NULL,
	"extra_added" numeric(14, 2) DEFAULT 0 NOT NULL,
	"extra_deducted" numeric(14, 2) DEFAULT 0 NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_liquidity_period_first_day" CHECK (extract(day from "monthly_liquidity_snapshots"."period") = 1),
	CONSTRAINT "monthly_liquidity_extra_added_nonnegative" CHECK ("monthly_liquidity_snapshots"."extra_added" >= 0),
	CONSTRAINT "monthly_liquidity_extra_deducted_nonnegative" CHECK ("monthly_liquidity_snapshots"."extra_deducted" >= 0),
	CONSTRAINT "monthly_liquidity_note_length" CHECK ("monthly_liquidity_snapshots"."note" is null or char_length("monthly_liquidity_snapshots"."note") <= 2000)
);
--> statement-breakpoint
CREATE TABLE "monthly_plan_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "monthly_plan_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"household_id" bigint NOT NULL,
	"monthly_plan_id" bigint NOT NULL,
	"recurring_item_id" bigint,
	"label" text NOT NULL,
	"planned_amount" numeric(14, 2) DEFAULT 0 NOT NULL,
	"actual_amount" numeric(14, 2) DEFAULT 0 NOT NULL,
	"status" "plan_item_status" DEFAULT 'planned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_plan_items_label_length" CHECK (char_length("monthly_plan_items"."label") between 1 and 160),
	CONSTRAINT "monthly_plan_items_planned_nonnegative" CHECK ("monthly_plan_items"."planned_amount" >= 0),
	CONSTRAINT "monthly_plan_items_actual_nonnegative" CHECK ("monthly_plan_items"."actual_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "monthly_plans" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "monthly_plans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"household_id" bigint NOT NULL,
	"period" date NOT NULL,
	"planned_income" numeric(14, 2) DEFAULT 0 NOT NULL,
	"planned_variable" numeric(14, 2) DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_plans_household_period_unique" UNIQUE("household_id","period"),
	CONSTRAINT "monthly_plans_id_household_unique" UNIQUE("id","household_id"),
	CONSTRAINT "monthly_plans_period_first_day" CHECK (extract(day from "monthly_plans"."period") = 1),
	CONSTRAINT "monthly_plans_income_nonnegative" CHECK ("monthly_plans"."planned_income" >= 0),
	CONSTRAINT "monthly_plans_variable_nonnegative" CHECK ("monthly_plans"."planned_variable" >= 0),
	CONSTRAINT "monthly_plans_notes_length" CHECK ("monthly_plans"."notes" is null or char_length("monthly_plans"."notes") <= 2000)
);
--> statement-breakpoint
CREATE TABLE "recurring_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "recurring_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"household_id" bigint NOT NULL,
	"category_id" bigint,
	"name" text NOT NULL,
	"kind" "recurring_item_kind" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"cadence_unit" "cadence_unit" NOT NULL,
	"cadence_interval" numeric(8, 2) DEFAULT 1 NOT NULL,
	"starts_on" date,
	"next_due_on" date,
	"destination" "recurring_destination" DEFAULT 'direct' NOT NULL,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_items_id_household_unique" UNIQUE("id","household_id"),
	CONSTRAINT "recurring_items_name_length" CHECK (char_length("recurring_items"."name") between 1 and 160),
	CONSTRAINT "recurring_items_amount_nonnegative" CHECK ("recurring_items"."amount" >= 0),
	CONSTRAINT "recurring_items_cadence_positive" CHECK ("recurring_items"."cadence_interval" > 0),
	CONSTRAINT "recurring_items_notes_length" CHECK ("recurring_items"."notes" is null or char_length("recurring_items"."notes") <= 2000)
);
--> statement-breakpoint
CREATE TABLE "savings_goals" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "savings_goals_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"household_id" bigint NOT NULL,
	"account_id" bigint,
	"name" text NOT NULL,
	"target_amount" numeric(14, 2) NOT NULL,
	"target_date" date,
	"monthly_contribution" numeric(14, 2) DEFAULT 0 NOT NULL,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "savings_goals_name_length" CHECK (char_length("savings_goals"."name") between 1 and 160),
	CONSTRAINT "savings_goals_target_positive" CHECK ("savings_goals"."target_amount" > 0),
	CONSTRAINT "savings_goals_contribution_nonnegative" CHECK ("savings_goals"."monthly_contribution" >= 0),
	CONSTRAINT "savings_goals_notes_length" CHECK ("savings_goals"."notes" is null or char_length("savings_goals"."notes") <= 2000)
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "transactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"household_id" bigint NOT NULL,
	"account_id" bigint NOT NULL,
	"category_id" bigint,
	"occurred_on" date NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"description" text NOT NULL,
	"note" text,
	"source" "transaction_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_amount_nonzero" CHECK ("transactions"."amount" <> 0),
	CONSTRAINT "transactions_description_length" CHECK (char_length("transactions"."description") between 1 and 240),
	CONSTRAINT "transactions_note_length" CHECK ("transactions"."note" is null or char_length("transactions"."note") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_snapshots" ADD CONSTRAINT "balance_snapshots_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_snapshots" ADD CONSTRAINT "balance_snapshots_account_household_fk" FOREIGN KEY ("account_id","household_id") REFERENCES "public"."accounts"("id","household_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "households" ADD CONSTRAINT "households_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_liquidity_snapshots" ADD CONSTRAINT "monthly_liquidity_snapshots_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_plan_items" ADD CONSTRAINT "monthly_plan_items_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_plan_items" ADD CONSTRAINT "monthly_plan_items_plan_household_fk" FOREIGN KEY ("monthly_plan_id","household_id") REFERENCES "public"."monthly_plans"("id","household_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_plan_items" ADD CONSTRAINT "monthly_plan_items_recurring_household_fk" FOREIGN KEY ("recurring_item_id","household_id") REFERENCES "public"."recurring_items"("id","household_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_plans" ADD CONSTRAINT "monthly_plans_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_items" ADD CONSTRAINT "recurring_items_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_items" ADD CONSTRAINT "recurring_items_category_household_fk" FOREIGN KEY ("category_id","household_id") REFERENCES "public"."categories"("id","household_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_account_household_fk" FOREIGN KEY ("account_id","household_id") REFERENCES "public"."accounts"("id","household_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_household_fk" FOREIGN KEY ("account_id","household_id") REFERENCES "public"."accounts"("id","household_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_household_fk" FOREIGN KEY ("category_id","household_id") REFERENCES "public"."categories"("id","household_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_issuer_account_id_uidx" ON "account" USING btree ("issuer","account_id");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "accounts_household_active_idx" ON "accounts" USING btree ("household_id","active");--> statement-breakpoint
CREATE INDEX "balance_snapshots_household_date_idx" ON "balance_snapshots" USING btree ("household_id","snapshot_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "categories_household_id_idx" ON "categories" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "household_members_user_id_idx" ON "household_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "households_owner_user_id_idx" ON "households" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "monthly_liquidity_household_period_uidx" ON "monthly_liquidity_snapshots" USING btree ("household_id","period");--> statement-breakpoint
CREATE INDEX "monthly_liquidity_household_period_idx" ON "monthly_liquidity_snapshots" USING btree ("household_id","period" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "monthly_plan_items_plan_idx" ON "monthly_plan_items" USING btree ("monthly_plan_id");--> statement-breakpoint
CREATE INDEX "monthly_plan_items_household_idx" ON "monthly_plan_items" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "monthly_plan_items_recurring_item_idx" ON "monthly_plan_items" USING btree ("recurring_item_id");--> statement-breakpoint
CREATE INDEX "monthly_plans_household_period_idx" ON "monthly_plans" USING btree ("household_id","period" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "recurring_items_household_active_due_idx" ON "recurring_items" USING btree ("household_id","active","next_due_on");--> statement-breakpoint
CREATE INDEX "recurring_items_category_id_idx" ON "recurring_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "savings_goals_household_active_idx" ON "savings_goals" USING btree ("household_id","active");--> statement-breakpoint
CREATE INDEX "savings_goals_account_id_idx" ON "savings_goals" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "transactions_household_date_id_idx" ON "transactions" USING btree ("household_id","occurred_on" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "transactions_account_id_idx" ON "transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "transactions_category_id_idx" ON "transactions" USING btree ("category_id");