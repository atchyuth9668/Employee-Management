-- =====================================================================
-- Field Operations Management Platform - PostgreSQL Schema
-- Apply this file in the Supabase SQL editor or via supabase db push.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums (created as text + check constraints for portability)
-- ---------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('admin', 'team_lead', 'engineer', 'viewer');
  end if;
  if not exists (select 1 from pg_type where typname = 'visit_status') then
    create type visit_status as enum ('scheduled', 'accepted', 'completed', 'rejected', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'activity_type') then
    create type activity_type as enum ('school_visit', 'work_from_home', 'leave', 'holiday', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'escalation_status') then
    create type escalation_status as enum ('open', 'in_progress', 'resolved', 'closed');
  end if;
  if not exists (select 1 from pg_type where typname = 'escalation_urgency') then
    create type escalation_urgency as enum ('low', 'medium', 'high', 'critical');
  end if;
  if not exists (select 1 from pg_type where typname = 'escalation_issue_type') then
    create type escalation_issue_type as enum ('missing_material', 'undelivered_material', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'material_status') then
    create type material_status as enum ('pending', 'in_transit', 'delivered', 'returned');
  end if;
  if not exists (select 1 from pg_type where typname = 'lms_status') then
    create type lms_status as enum ('active', 'pending', 'revoked');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- updated_at trigger function
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- Helper: current user role
-- ---------------------------------------------------------------------
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_engineer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select engineer_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin_or_lead()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role in ('admin', 'team_lead') from public.profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(full_name) > 0),
  email text not null unique,
  role user_role not null default 'engineer',
  engineer_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_profiles_role on public.profiles(role);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- school_teams
-- ---------------------------------------------------------------------
create table if not exists public.school_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text not null check (region in ('Andhra Pradesh', 'Telangana')),
  created_at timestamptz not null default now()
);
create unique index if not exists uq_school_teams_name_region on public.school_teams(lower(name), region);

-- ---------------------------------------------------------------------
-- engineers
-- ---------------------------------------------------------------------
create table if not exists public.engineers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null check (length(full_name) > 0),
  email text not null unique,
  phone text,
  region text not null check (region in ('Andhra Pradesh', 'Telangana')),
  team_id uuid references public.school_teams(id) on delete set null,
  role user_role not null default 'engineer',
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_engineers_region on public.engineers(region);
create index if not exists idx_engineers_role on public.engineers(role);
create index if not exists idx_engineers_active on public.engineers(is_active);
create index if not exists idx_engineers_team on public.engineers(team_id);

drop trigger if exists trg_engineers_updated_at on public.engineers;
create trigger trg_engineers_updated_at before update on public.engineers
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- schools
-- ---------------------------------------------------------------------
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) > 0),
  spoc_name text not null,
  spoc_contact text not null,
  location text not null,
  region text not null check (region in ('Andhra Pradesh', 'Telangana')),
  area text not null,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  maps_link text,
  assigned_engineer_id uuid references public.engineers(id) on delete set null,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_schools_region on public.schools(region);
create index if not exists idx_schools_engineer on public.schools(assigned_engineer_id);
create index if not exists idx_schools_active on public.schools(is_active);
create index if not exists idx_schools_name on public.schools(lower(name));

drop trigger if exists trg_schools_updated_at on public.schools;
create trigger trg_schools_updated_at before update on public.schools
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- school_visits
-- ---------------------------------------------------------------------
create table if not exists public.school_visits (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  engineer_id uuid not null references public.engineers(id) on delete restrict,
  visit_date date not null,
  checklist_items jsonb not null default '[]'::jsonb,
  notes text,
  reason text not null check (length(reason) > 0),
  next_visit_due date,
  status visit_status not null default 'scheduled',
  cancellation_reason text,
  cancelled_at timestamptz,
  rejection_reason text,
  rejected_at timestamptz,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_reject_state check (
    (status = 'rejected' and rejection_reason is not null) or status <> 'rejected'
  ),
  constraint chk_cancel_state check (
    (status = 'cancelled' and cancellation_reason is not null) or status <> 'cancelled'
  )
);
create index if not exists idx_visits_school on public.school_visits(school_id);
create index if not exists idx_visits_engineer on public.school_visits(engineer_id);
create index if not exists idx_visits_status on public.school_visits(status);
create index if not exists idx_visits_date on public.school_visits(visit_date);

drop trigger if exists trg_visits_updated_at on public.school_visits;
create trigger trg_visits_updated_at before update on public.school_visits
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- school_checklists
-- ---------------------------------------------------------------------
create table if not exists public.school_checklists (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null unique references public.schools(id) on delete cascade,
  component_verified boolean not null default false,
  component_verified_date date,
  initial_teacher_training boolean not null default false,
  initial_teacher_training_date date,
  teachers_lms boolean not null default false,
  teachers_lms_date date,
  students_lms boolean not null default false,
  students_lms_date date,
  lab_setup boolean not null default false,
  lab_setup_date date,
  feedback_form boolean not null default false,
  feedback_form_date date,
  training_dates jsonb not null default '[]'::jsonb,
  completion_percentage numeric(5,2) not null default 0 check (completion_percentage between 0 and 100),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_checklists_school on public.school_checklists(school_id);

create or replace function public.recalculate_checklist_percentage()
returns trigger as $$
declare
  total int := 6;
  done int := 0;
begin
  if new.component_verified then done := done + 1; end if;
  if new.initial_teacher_training then done := done + 1; end if;
  if new.teachers_lms then done := done + 1; end if;
  if new.students_lms then done := done + 1; end if;
  if new.lab_setup then done := done + 1; end if;
  if new.feedback_form then done := done + 1; end if;
  new.completion_percentage := round((done::numeric / total::numeric) * 100, 2);
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_checklist_recalc on public.school_checklists;
create trigger trg_checklist_recalc before insert or update on public.school_checklists
for each row execute function public.recalculate_checklist_percentage();

drop trigger if exists trg_checklists_updated_at on public.school_checklists;
create trigger trg_checklists_updated_at before update on public.school_checklists
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- daily_logs
-- ---------------------------------------------------------------------
create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  engineer_id uuid not null references public.engineers(id) on delete restrict,
  school_id uuid references public.schools(id) on delete set null,
  log_date date not null,
  activity_type activity_type not null,
  start_time time,
  end_time time,
  activities_done text not null check (length(activities_done) > 0),
  notes text,
  is_approved boolean not null default false,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  rejection_reason text,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_log_school_when_visit check (
    (activity_type <> 'school_visit') or (activity_type = 'school_visit' and school_id is not null)
  )
);
create index if not exists idx_logs_engineer on public.daily_logs(engineer_id);
create index if not exists idx_logs_date on public.daily_logs(log_date);
create index if not exists idx_logs_school on public.daily_logs(school_id);
create index if not exists idx_logs_approval on public.daily_logs(is_approved);

drop trigger if exists trg_logs_updated_at on public.daily_logs;
create trigger trg_logs_updated_at before update on public.daily_logs
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- escalations
-- ---------------------------------------------------------------------
create table if not exists public.escalations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  engineer_id uuid not null references public.engineers(id) on delete restrict,
  issue_type escalation_issue_type not null,
  issue_description text not null check (length(issue_description) > 0),
  urgency escalation_urgency not null default 'medium',
  status escalation_status not null default 'open',
  assigned_to uuid references public.engineers(id) on delete set null,
  resolution_notes text,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_escalations_school on public.escalations(school_id);
create index if not exists idx_escalations_engineer on public.escalations(engineer_id);
create index if not exists idx_escalations_status on public.escalations(status);
create index if not exists idx_escalations_urgency on public.escalations(urgency);

drop trigger if exists trg_escalations_updated_at on public.escalations;
create trigger trg_escalations_updated_at before update on public.escalations
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- visit_feedback
-- ---------------------------------------------------------------------
create table if not exists public.visit_feedback (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.school_visits(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  engineer_id uuid not null references public.engineers(id) on delete restrict,
  rating int check (rating between 1 and 5),
  feedback_text text,
  created_at timestamptz not null default now()
);
create index if not exists idx_feedback_visit on public.visit_feedback(visit_id);
create index if not exists idx_feedback_school on public.visit_feedback(school_id);

-- ---------------------------------------------------------------------
-- material_deliveries
-- ---------------------------------------------------------------------
create table if not exists public.material_deliveries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  engineer_id uuid references public.engineers(id) on delete set null,
  item_name text not null,
  quantity int not null check (quantity > 0),
  delivered_date date,
  status material_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_materials_school on public.material_deliveries(school_id);
create index if not exists idx_materials_status on public.material_deliveries(status);

drop trigger if exists trg_materials_updated_at on public.material_deliveries;
create trigger trg_materials_updated_at before update on public.material_deliveries
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- lms_access
-- ---------------------------------------------------------------------
create table if not exists public.lms_access (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_email text not null,
  user_role text not null,
  status lms_status not null default 'pending',
  granted_at timestamptz,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_lms_school on public.lms_access(school_id);
create unique index if not exists uq_lms_school_email on public.lms_access(school_id, lower(user_email));

drop trigger if exists trg_lms_updated_at on public.lms_access;
create trigger trg_lms_updated_at before update on public.lms_access
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- monthly_visit_targets
-- ---------------------------------------------------------------------
create table if not exists public.monthly_visit_targets (
  id uuid primary key default gen_random_uuid(),
  engineer_id uuid not null references public.engineers(id) on delete cascade,
  month date not null,
  target_visits int not null check (target_visits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (engineer_id, month)
);

drop trigger if exists trg_targets_updated_at on public.monthly_visit_targets;
create trigger trg_targets_updated_at before update on public.monthly_visit_targets
for each row execute function public.set_updated_at();

-- =====================================================================
-- Auto-create profile + checklist on signup
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'engineer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =====================================================================
-- Auto-create empty checklist when a school is created
-- =====================================================================
create or replace function public.handle_new_school()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.school_checklists (school_id) values (new.id)
  on conflict (school_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_school_created on public.schools;
create trigger on_school_created
after insert on public.schools
for each row execute function public.handle_new_school();