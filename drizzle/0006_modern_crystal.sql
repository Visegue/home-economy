CREATE TABLE "household_incomes" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "household_incomes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"household_id" bigint NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "household_incomes_name_length" CHECK (char_length("household_incomes"."name") between 1 and 160),
	CONSTRAINT "household_incomes_amount_nonnegative" CHECK ("household_incomes"."amount" >= 0),
	CONSTRAINT "household_incomes_start_first_day" CHECK (extract(day from "household_incomes"."starts_on") = 1),
	CONSTRAINT "household_incomes_end_first_day" CHECK ("household_incomes"."ends_on" is null or extract(day from "household_incomes"."ends_on") = 1),
	CONSTRAINT "household_incomes_period_order" CHECK ("household_incomes"."ends_on" is null or "household_incomes"."ends_on" >= "household_incomes"."starts_on")
);
--> statement-breakpoint
ALTER TABLE "household_incomes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "household_incomes" ADD CONSTRAINT "household_incomes_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "household_incomes_household_period_idx" ON "household_incomes" USING btree ("household_id","starts_on","ends_on");--> statement-breakpoint
CREATE POLICY "household_incomes_access" ON "household_incomes" AS PERMISSIVE FOR ALL TO public USING ((select private.has_household_access("household_incomes"."household_id"))) WITH CHECK ((select private.has_household_access("household_incomes"."household_id")));
--> statement-breakpoint
SET LOCAL row_security = off;
--> statement-breakpoint
-- Preserve previously entered monthly incomes for exactly their original month.
INSERT INTO "household_incomes" ("household_id", "name", "amount", "starts_on", "ends_on")
SELECT "household_id", 'Tidigare registrerad inkomst', "planned_income", "period", "period"
FROM "monthly_plans";
--> statement-breakpoint
ALTER TABLE "household_incomes" FORCE ROW LEVEL SECURITY;
