-- Switch school scoping from assigned engineer to region-based access.
-- Engineers can see/interact with any school/visit/checklist in their region.

create or replace function public.current_engineer_region() returns text
language sql stable security definer set search_path = public as $$
  select region from public.engineers where id = public.current_engineer_id();
$$;

grant execute on function public.current_engineer_region() to authenticated;

-- escalations: only admin/team_lead can update status (start, resolve, close)
drop policy if exists escalations_admin_update on public.escalations;
create policy escalations_admin_update on public.escalations
for update using (public.is_admin_or_lead())
with check (public.is_admin_or_lead());

-- daily_logs: relax admin approval to allow admins who don't have an engineer_id
drop policy if exists logs_admin_approval on public.daily_logs;
create policy logs_admin_approval on public.daily_logs
for update using (
  public.is_admin_or_lead()
  and (public.current_engineer_id() is null or engineer_id <> public.current_engineer_id())
)
with check (public.is_admin_or_lead());

-- schools
drop policy if exists schools_select on public.schools;
create policy schools_select on public.schools
for select using (
  auth.role() = 'authenticated'
  and deleted_at is null
  and (
    public.is_admin_or_lead()
    or region = public.current_engineer_region()
  )
);

-- school_visits: engineers can see visits to schools in their region
drop policy if exists visits_select on public.school_visits;
create policy visits_select on public.school_visits
for select using (
  auth.role() = 'authenticated' and (
    public.is_admin_or_lead()
    or engineer_id = public.current_engineer_id()
    or exists (
      select 1 from public.schools s
      where s.id = school_visits.school_id
        and s.region = public.current_engineer_region()
    )
  )
);

-- school_checklists
drop policy if exists checklists_select on public.school_checklists;
create policy checklists_select on public.school_checklists
for select using (
  auth.role() = 'authenticated' and (
    public.is_admin_or_lead()
    or exists (
      select 1 from public.schools s
      where s.id = school_checklists.school_id
        and s.region = public.current_engineer_region()
    )
  )
);

drop policy if exists checklists_write on public.school_checklists;
create policy checklists_write on public.school_checklists
for all using (
  public.is_admin_or_lead()
  or exists (
    select 1 from public.schools s
    where s.id = school_checklists.school_id
      and s.region = public.current_engineer_region()
  )
) with check (
  public.is_admin_or_lead()
  or exists (
    select 1 from public.schools s
    where s.id = school_checklists.school_id
      and s.region = public.current_engineer_region()
  )
);
