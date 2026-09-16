ALTER TABLE "savings_goals" ALTER COLUMN "target_amount" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "savings_goals" ALTER COLUMN "monthly_contribution" SET DEFAULT '0';