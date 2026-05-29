-- ============================================================
-- 0002_fix_recursive_rls.sql
-- Fixes 0001's "staff full access *" policies which referenced
-- `staff` directly in the USING clause, including the policy on
-- `staff` itself — causing 42P17 (infinite recursion) on every
-- table that uses the same pattern.
--
-- The Supabase-recommended fix is a SECURITY DEFINER function
-- that bypasses RLS when checking the membership.
-- ============================================================

drop policy if exists "staff full access staff"          on staff;
drop policy if exists "staff full access services"       on services;
drop policy if exists "staff full access bookings"       on bookings;
drop policy if exists "staff full access leads"          on bridal_leads;
drop policy if exists "staff full access customers"      on customers;
drop policy if exists "staff full access opening hours"  on opening_hours;
drop policy if exists "staff full access time off"       on time_off;
drop policy if exists "staff full access audit"          on audit_log;

create or replace function public.is_active_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.staff
    where user_id = auth.uid() and is_active = true
  );
$$;

revoke all on function public.is_active_staff() from public;
grant execute on function public.is_active_staff() to authenticated, service_role;

create policy "staff full access staff"
  on staff for all using (public.is_active_staff());

create policy "staff full access services"
  on services for all using (public.is_active_staff());

create policy "staff full access bookings"
  on bookings for all using (public.is_active_staff());

create policy "staff full access leads"
  on bridal_leads for all using (public.is_active_staff());

create policy "staff full access customers"
  on customers for all using (public.is_active_staff());

create policy "staff full access opening hours"
  on opening_hours for all using (public.is_active_staff());

create policy "staff full access time off"
  on time_off for all using (public.is_active_staff());

create policy "staff full access audit"
  on audit_log for all using (public.is_active_staff());
