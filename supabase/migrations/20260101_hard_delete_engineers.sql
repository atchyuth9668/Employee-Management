-- =====================================================================
-- Migration: allow engineers to be hard-deleted by nulling references
-- Run this ONCE in Supabase SQL editor.
-- =====================================================================

alter table public.school_visits
  drop constraint if exists school_visits_engineer_id_fkey;
alter table public.school_visits
  add constraint school_visits_engineer_id_fkey
  foreign key (engineer_id) references public.engineers(id) on delete set null;

alter table public.daily_logs
  drop constraint if exists daily_logs_engineer_id_fkey;
alter table public.daily_logs
  add constraint daily_logs_engineer_id_fkey
  foreign key (engineer_id) references public.engineers(id) on delete set null;

alter table public.escalations
  drop constraint if exists escalations_engineer_id_fkey;
alter table public.escalations
  add constraint escalations_engineer_id_fkey
  foreign key (engineer_id) references public.engineers(id) on delete set null;

alter table public.escalations
  drop constraint if exists escalations_assigned_to_fkey;
alter table public.escalations
  add constraint escalations_assigned_to_fkey
  foreign key (assigned_to) references public.engineers(id) on delete set null;

alter table public.material_deliveries
  drop constraint if exists material_deliveries_engineer_id_fkey;
alter table public.material_deliveries
  add constraint material_deliveries_engineer_id_fkey
  foreign key (engineer_id) references public.engineers(id) on delete set null;

alter table public.schools
  drop constraint if exists schools_assigned_engineer_id_fkey;
alter table public.schools
  add constraint schools_assigned_engineer_id_fkey
  foreign key (assigned_engineer_id) references public.engineers(id) on delete set null;