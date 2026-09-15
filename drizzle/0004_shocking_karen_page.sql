CREATE TABLE "household_member_income" (
	"household_id" bigint NOT NULL,
	"user_id" text NOT NULL,
	"monthly_net_income" numeric(14, 2),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "household_member_income_household_id_user_id_pk" PRIMARY KEY("household_id","user_id"),
	CONSTRAINT "household_member_income_nonnegative" CHECK ("household_member_income"."monthly_net_income" >= 0 and "household_member_income"."monthly_net_income" <= 999999999999.99)
);
--> statement-breakpoint
ALTER TABLE "household_member_income" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "household_member_income" ADD CONSTRAINT "household_member_income_household_id_user_id_household_members_household_id_user_id_fk" FOREIGN KEY ("household_id","user_id") REFERENCES "public"."household_members"("household_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "household_member_income_user_id_idx" ON "household_member_income" USING btree ("user_id");--> statement-breakpoint
CREATE POLICY "household_member_income_select" ON "household_member_income" AS PERMISSIVE FOR SELECT TO public USING ((select private.has_household_access("household_member_income"."household_id")));--> statement-breakpoint
CREATE POLICY "household_member_income_insert" ON "household_member_income" AS PERMISSIVE FOR INSERT TO public WITH CHECK ("household_member_income"."user_id" = (select private.current_user_id()) and (select private.has_household_access("household_member_income"."household_id")));--> statement-breakpoint
CREATE POLICY "household_member_income_update" ON "household_member_income" AS PERMISSIVE FOR UPDATE TO public USING ("household_member_income"."user_id" = (select private.current_user_id()) and (select private.has_household_access("household_member_income"."household_id"))) WITH CHECK ("household_member_income"."user_id" = (select private.current_user_id()) and (select private.has_household_access("household_member_income"."household_id")));--> statement-breakpoint
CREATE POLICY "household_member_income_delete" ON "household_member_income" AS PERMISSIVE FOR DELETE TO public USING ("household_member_income"."user_id" = (select private.current_user_id()) and (select private.has_household_access("household_member_income"."household_id")));--> statement-breakpoint
-- Drizzle models the policies; forced RLS and deployment-role grants are explicit.
ALTER TABLE public.household_member_income FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'home_economy_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_member_income TO home_economy_runtime;
  END IF;
END
$$;
