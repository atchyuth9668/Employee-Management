-- =====================================================================
-- Row Level Security Policies
-- Run this AFTER schema.sql
-- =====================================================================

-- Helper SQL: enable RLS on every table
alter table public.profiles enable row level security;
alter table public.school_teams enable row level security;
alter table public.engineers enable row level security;
alter table public.schools enable row level security;
alter table public.school_visits enable row level security;
alter table public.school_checklists enable row level security;
alter table public.daily_logs enable row level security;
alter table public.escalations enable row level security;
alter table public.visit_feedback enable row level security;
alter table public.material_deliveries enable row level security;
alter table public.lms_access enable row level security;
alter table public.monthly_visit_targets enable row level security;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select using (auth.role() = 'authenticated');

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
for update using (id = auth.uid() or public.is_admin_or_lead())
with check (id = auth.uid() or public.is_admin_or_lead());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
for all using (public.is_admin_or_lead())
with check (public.is_admin_or_lead());

-- ---------------------------------------------------------------------
-- school_teams
-- ---------------------------------------------------------------------
drop policy if exists school_teams_read on public.school_teams;
create policy school_teams_read on public.school_teams for select using (auth.role() = 'authenticated');

drop policy if exists school_teams_admin_write on public.school_teams;
create policy school_teams_admin_write on public.school_teams
for all using (public.is_admin_or_lead()) with check (public.is_admin_or_lead());

-- ---------------------------------------------------------------------
-- engineers
-- ---------------------------------------------------------------------
drop policy if exists engineers_read on public.engineers;
create policy engineers_read on public.engineers
for select using (auth.role() = 'authenticated');

drop policy if exists engineers_admin_write on public.engineers;
create policy engineers_admin_write on public.engineers
for all using (public.is_admin_or_lead()) with check (public.is_admin_or_lead());

-- ---------------------------------------------------------------------
-- schools
-- ---------------------------------------------------------------------
drop policy if exists schools_select on public.schools;
create policy schools_select on public.schools
for select using (
  auth.role() = 'authenticated'
  and deleted_at is null
  and (
    public.is_admin_or_lead()
    or assigned_engineer_id = public.current_engineer_id()
  )
);

drop policy if exists schools_admin_write on public.schools;
create policy schools_admin_write on public.schools
for all using (public.is_admin_or_lead()) with check (public.is_admin_or_lead());

-- ---------------------------------------------------------------------
-- school_visits
-- ---------------------------------------------------------------------
drop policy if exists visits_select on public.school_visits;
create policy visits_select on public.school_visits
for select using (
  auth.role() = 'authenticated' and (
    public.is_admin_or_lead()
    or engineer_id = public.current_engineer_id()
  )
);

drop policy if exists visits_admin_write on public.school_visits;
create policy visits_admin_write on public.school_visits
for insert with check (
  public.is_admin_or_lead() or engineer_id = public.current_engineer_id()
);

drop policy if exists visits_engineer_update on public.school_visits;
create policy visits_engineer_update on public.school_visits
for update using (
  public.is_admin_or_lead() or engineer_id = public.current_engineer_id()
)
with check (
  public.is_admin_or_lead() or engineer_id = public.current_engineer_id()
);

-- ---------------------------------------------------------------------
-- school_checklists
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- daily_logs
-- ---------------------------------------------------------------------
drop policy if exists logs_select on public.daily_logs;
create policy logs_select on public.daily_logs
for select using (
  public.is_admin_or_lead() or engineer_id = public.current_engineer_id()
);

drop policy if exists logs_insert on public.daily_logs;
create policy logs_insert on public.daily_logs
for insert with check (
  public.is_admin_or_lead() or engineer_id = public.current_engineer_id()
);

drop policy if exists logs_update_engineer on public.daily_logs;
create policy logs_update_engineer on public.daily_logs
for update using (
  engineer_id = public.current_engineer_id() and is_approved = false
)
with check (
  engineer_id = public.current_engineer_id() and is_approved = false
);

drop policy if exists logs_admin_approval on public.daily_logs;
create policy logs_admin_approval on public.daily_logs
for update using (public.is_admin_or_lead() and engineer_id <> public.current_engineer_id())
with check (public.is_admin_or_lead());

-- ---------------------------------------------------------------------
-- escalations
-- ---------------------------------------------------------------------
drop policy if exists escalations_select on public.escalations;
create policy escalations_select on public.escalations
for select using (auth.role() = 'authenticated');

drop policy if exists escalations_insert on public.escalations;
create policy escalations_insert on public.escalations
for insert with check (auth.role() = 'authenticated');

drop policy if exists escalations_admin_update on public.escalations;
create policy escalations_admin_update on public.escalations
for update using (public.is_admin_or_lead() or engineer_id = public.current_engineer_id())
with check (public.is_admin_or_lead() or engineer_id = public.current_engineer_id());

-- ---------------------------------------------------------------------
-- visit_feedback, material_deliveries, lms_access, monthly_visit_targets
-- ---------------------------------------------------------------------
drop policy if exists feedback_read on public.visit_feedback;
create policy feedback_read on public.visit_feedback for select using (auth.role() = 'authenticated');
drop policy if exists feedback_admin_write on public.visit_feedback;
create policy feedback_admin_write on public.visit_feedback
for all using (public.is_admin_or_lead()) with check (public.is_admin_or_lead());

drop policy if exists materials_read on public.material_deliveries;
create policy materials_read on public.material_deliveries for select using (auth.role() = 'authenticated');
drop policy if exists materials_admin_write on public.material_deliveries;
create policy materials_admin_write on public.material_deliveries
for all using (public.is_admin_or_lead() or engineer_id = public.current_engineer_id())
with check (public.is_admin_or_lead() or engineer_id = public.current_engineer_id());

drop policy if exists lms_read on public.lms_access;
create policy lms_read on public.lms_access for select using (auth.role() = 'authenticated');
drop policy if exists lms_admin_write on public.lms_access;
create policy lms_admin_write on public.lms_access
for all using (public.is_admin_or_lead()) with check (public.is_admin_or_lead());

drop policy if exists targets_read on public.monthly_visit_targets;
create policy targets_read on public.monthly_visit_targets
for select using (
  public.is_admin_or_lead() or engineer_id = public.current_engineer_id()
);
drop policy if exists targets_admin_write on public.monthly_visit_targets;
create policy targets_admin_write on public.monthly_visit_targets
for all using (public.is_admin_or_lead()) with check (public.is_admin_or_lead());

-- ---------------------------------------------------------------------
-- Grants for anon / authenticated roles
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

-- Allow users to insert their own profile row (signup race condition)
drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles
for insert with check (id = auth.uid() or public.is_admin_or_lead());