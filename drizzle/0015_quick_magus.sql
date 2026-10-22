CREATE TABLE "deposit_batches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" bigint NOT NULL,
	"request" text NOT NULL,
	"result" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deposit_batches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "deposit_batches" ADD CONSTRAINT "deposit_batches_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "deposit_batches_access" ON "deposit_batches" AS PERMISSIVE FOR ALL TO public USING ((select private.has_household_access("deposit_batches"."household_id"))) WITH CHECK ((select private.has_household_access("deposit_batches"."household_id")));--> statement-breakpoint
ALTER TABLE "deposit_batches" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'home_economy_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON deposit_batches TO home_economy_runtime;
  END IF;
END $$;
