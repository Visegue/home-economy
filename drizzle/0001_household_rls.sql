create schema if not exists private;
--> statement-breakpoint
revoke all on schema private from public;
--> statement-breakpoint
grant usage on schema private to public;
--> statement-breakpoint
create or replace function private.current_user_id()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select nullif(current_setting('app.user_id', true), '');
$$;
--> statement-breakpoint
create or replace function private.has_household_access(requested_household_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.households h
    where h.id = requested_household_id
      and h.owner_user_id = private.current_user_id()
  ) or exists (
    select 1
    from public.household_members hm
    where hm.household_id = requested_household_id
      and hm.user_id = private.current_user_id()
  );
$$;
--> statement-breakpoint
create or replace function private.owns_household(requested_household_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.households h
    where h.id = requested_household_id
      and h.owner_user_id = private.current_user_id()
  );
$$;
--> statement-breakpoint
revoke all on function private.current_user_id() from public;
--> statement-breakpoint
revoke all on function private.has_household_access(bigint) from public;
--> statement-breakpoint
revoke all on function private.owns_household(bigint) from public;
--> statement-breakpoint
grant execute on function private.current_user_id() to public;
--> statement-breakpoint
grant execute on function private.has_household_access(bigint) to public;
--> statement-breakpoint
grant execute on function private.owns_household(bigint) to public;
--> statement-breakpoint
alter table public.households enable row level security;
--> statement-breakpoint
alter table public.households force row level security;
--> statement-breakpoint
alter table public.household_members enable row level security;
--> statement-breakpoint
alter table public.household_members force row level security;
--> statement-breakpoint
alter table public.categories enable row level security;
--> statement-breakpoint
alter table public.categories force row level security;
--> statement-breakpoint
alter table public.accounts enable row level security;
--> statement-breakpoint
alter table public.accounts force row level security;
--> statement-breakpoint
alter table public.recurring_items enable row level security;
--> statement-breakpoint
alter table public.recurring_items force row level security;
--> statement-breakpoint
alter table public.monthly_plans enable row level security;
--> statement-breakpoint
alter table public.monthly_plans force row level security;
--> statement-breakpoint
alter table public.monthly_plan_items enable row level security;
--> statement-breakpoint
alter table public.monthly_plan_items force row level security;
--> statement-breakpoint
alter table public.transactions enable row level security;
--> statement-breakpoint
alter table public.transactions force row level security;
--> statement-breakpoint
alter table public.balance_snapshots enable row level security;
--> statement-breakpoint
alter table public.balance_snapshots force row level security;
--> statement-breakpoint
alter table public.savings_goals enable row level security;
--> statement-breakpoint
alter table public.savings_goals force row level security;
--> statement-breakpoint
alter table public.monthly_liquidity_snapshots enable row level security;
--> statement-breakpoint
alter table public.monthly_liquidity_snapshots force row level security;
--> statement-breakpoint
create policy households_select_accessible
  on public.households for select
  using ((select private.has_household_access(id)));
--> statement-breakpoint
create policy households_insert_owned
  on public.households for insert
  with check (owner_user_id = (select private.current_user_id()));
--> statement-breakpoint
create policy households_update_owned
  on public.households for update
  using (owner_user_id = (select private.current_user_id()))
  with check (owner_user_id = (select private.current_user_id()));
--> statement-breakpoint
create policy households_delete_owned
  on public.households for delete
  using (owner_user_id = (select private.current_user_id()));
--> statement-breakpoint
create policy household_members_select_accessible
  on public.household_members for select
  using ((select private.has_household_access(household_id)));
--> statement-breakpoint
create policy household_members_insert_by_owner
  on public.household_members for insert
  with check ((select private.owns_household(household_id)));
--> statement-breakpoint
create policy household_members_update_by_owner
  on public.household_members for update
  using ((select private.owns_household(household_id)))
  with check ((select private.owns_household(household_id)));
--> statement-breakpoint
create policy household_members_delete_by_owner
  on public.household_members for delete
  using ((select private.owns_household(household_id)));
--> statement-breakpoint
do $$
declare
  protected_table text;
begin
  foreach protected_table in array array[
    'categories', 'accounts', 'recurring_items', 'monthly_plans',
    'monthly_plan_items', 'transactions', 'balance_snapshots',
    'savings_goals', 'monthly_liquidity_snapshots'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select using ((select private.has_household_access(household_id)))',
      protected_table || '_select_household', protected_table
    );
    execute format(
      'create policy %I on public.%I for insert with check ((select private.has_household_access(household_id)))',
      protected_table || '_insert_household', protected_table
    );
    execute format(
      'create policy %I on public.%I for update using ((select private.has_household_access(household_id))) with check ((select private.has_household_access(household_id)))',
      protected_table || '_update_household', protected_table
    );
    execute format(
      'create policy %I on public.%I for delete using ((select private.has_household_access(household_id)))',
      protected_table || '_delete_household', protected_table
    );
  end loop;
end
$$;
