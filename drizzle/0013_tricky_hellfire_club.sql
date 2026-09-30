ALTER TYPE "public"."recurring_destination" ADD VALUE 'settlement';--> statement-breakpoint
ALTER TABLE "recurring_items" ADD COLUMN "settlement_starts_on" date;--> statement-breakpoint
ALTER TABLE "recurring_items" ADD COLUMN "markup_amount" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "recurring_items" ADD COLUMN "markup_percent" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "recurring_items" ADD COLUMN "inflation_percent" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "recurring_items" ADD CONSTRAINT "recurring_items_settlement_plan" CHECK ("recurring_items"."destination"::text <> 'settlement' or ("recurring_items"."amount" > 0 and "recurring_items"."settlement_starts_on" is not null and extract(day from "recurring_items"."settlement_starts_on") = 1 and "recurring_items"."next_due_on" is not null and "recurring_items"."next_due_on" >= "recurring_items"."settlement_starts_on"));--> statement-breakpoint
ALTER TABLE "recurring_items" ADD CONSTRAINT "recurring_items_markup_nonnegative" CHECK ("recurring_items"."markup_amount" is null or "recurring_items"."markup_amount" >= 0);--> statement-breakpoint
ALTER TABLE "recurring_items" ADD CONSTRAINT "recurring_items_markup_percent_range" CHECK ("recurring_items"."markup_percent" is null or "recurring_items"."markup_percent" between 0 and 100);--> statement-breakpoint
ALTER TABLE "recurring_items" ADD CONSTRAINT "recurring_items_markup_exclusive" CHECK ("recurring_items"."markup_amount" is null or "recurring_items"."markup_percent" is null);--> statement-breakpoint
ALTER TABLE "recurring_items" ADD CONSTRAINT "recurring_items_inflation_percent_range" CHECK ("recurring_items"."inflation_percent" is null or "recurring_items"."inflation_percent" between 0 and 100);