-- The old model has no validity dates. Use its last saved month in Swedish time
-- as the start, and preserve each member's income as a separate ongoing source.
-- Fail rather than silently omitting rows if the migration role cannot bypass RLS.
SET LOCAL row_security = off;
--> statement-breakpoint
INSERT INTO household_incomes (household_id, name, amount, starts_on, ends_on)
SELECT income.household_id,
       left('Månadsinkomst' || coalesce(' – ' || nullif(member.display_name, ''), ''), 160),
       income.monthly_net_income,
       date_trunc('month', income.updated_at AT TIME ZONE 'Europe/Stockholm')::date,
       NULL
FROM household_member_income AS income
JOIN household_members AS member
  ON member.household_id = income.household_id AND member.user_id = income.user_id
WHERE income.monthly_net_income IS NOT NULL;
