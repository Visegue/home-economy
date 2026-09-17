ALTER TABLE "recurring_items" ADD COLUMN "ends_on" date;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD COLUMN "starts_on" date;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD COLUMN "ends_on" date;--> statement-breakpoint
ALTER TABLE "recurring_items" ADD CONSTRAINT "recurring_items_end_first_day" CHECK ("recurring_items"."ends_on" is null or extract(day from "recurring_items"."ends_on") = 1);--> statement-breakpoint
ALTER TABLE "recurring_items" ADD CONSTRAINT "recurring_items_period_order" CHECK ("recurring_items"."ends_on" is null or "recurring_items"."starts_on" is null or "recurring_items"."ends_on" >= date_trunc('month', "recurring_items"."starts_on")::date);--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_start_first_day" CHECK ("savings_goals"."starts_on" is null or extract(day from "savings_goals"."starts_on") = 1);--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_end_first_day" CHECK ("savings_goals"."ends_on" is null or extract(day from "savings_goals"."ends_on") = 1);--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_period_order" CHECK ("savings_goals"."ends_on" is null or "savings_goals"."starts_on" is null or "savings_goals"."ends_on" >= "savings_goals"."starts_on");