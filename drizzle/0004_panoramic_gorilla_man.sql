CREATE TABLE "household_people" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "household_people_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"household_id" bigint NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "household_people_id_household_unique" UNIQUE("id","household_id"),
	CONSTRAINT "household_people_household_name_unique" UNIQUE("household_id","name"),
	CONSTRAINT "household_people_name_length" CHECK (char_length("household_people"."name") between 1 and 120)
);
--> statement-breakpoint
ALTER TABLE "household_people" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recurring_item_owners" (
	"household_id" bigint NOT NULL,
	"recurring_item_id" bigint NOT NULL,
	"person_id" bigint NOT NULL,
	CONSTRAINT "recurring_item_owners_recurring_item_id_person_id_pk" PRIMARY KEY("recurring_item_id","person_id")
);
--> statement-breakpoint
ALTER TABLE "recurring_item_owners" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "household_people" ADD CONSTRAINT "household_people_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_item_owners" ADD CONSTRAINT "recurring_item_owners_item_household_fk" FOREIGN KEY ("recurring_item_id","household_id") REFERENCES "public"."recurring_items"("id","household_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_item_owners" ADD CONSTRAINT "recurring_item_owners_person_household_fk" FOREIGN KEY ("person_id","household_id") REFERENCES "public"."household_people"("id","household_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_item_owners_household_idx" ON "recurring_item_owners" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "recurring_item_owners_person_idx" ON "recurring_item_owners" USING btree ("person_id");--> statement-breakpoint
CREATE POLICY "household_people_access" ON "household_people" AS PERMISSIVE FOR ALL TO public USING ((select private.has_household_access("household_people"."household_id"))) WITH CHECK ((select private.has_household_access("household_people"."household_id")));--> statement-breakpoint
CREATE POLICY "recurring_item_owners_access" ON "recurring_item_owners" AS PERMISSIVE FOR ALL TO public USING ((select private.has_household_access("recurring_item_owners"."household_id"))) WITH CHECK ((select private.has_household_access("recurring_item_owners"."household_id")));
--> statement-breakpoint
ALTER TABLE "household_people" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "recurring_item_owners" FORCE ROW LEVEL SECURITY;
