DROP INDEX "households_owner_user_id_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "households_owner_user_id_uidx" ON "households" USING btree ("owner_user_id");