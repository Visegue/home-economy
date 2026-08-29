drop policy households_select_accessible on public.households;
--> statement-breakpoint
create policy households_select_accessible
  on public.households for select
  using (
    owner_user_id = (select private.current_user_id())
    or (select private.has_household_access(id))
  );
