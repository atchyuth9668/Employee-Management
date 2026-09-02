-- =====================================================================
-- Realtime publication - enable realtime updates on operational tables
-- =====================================================================
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

-- Add tables to the publication for realtime events
alter publication supabase_realtime add table
  public.profiles,
  public.school_teams,
  public.engineers,
  public.schools,
  public.school_visits,
  public.school_checklists,
  public.daily_logs,
  public.escalations,
  public.visit_feedback,
  public.material_deliveries,
  public.lms_access,
  public.monthly_visit_targets;

-- =====================================================================
-- Useful views
-- =====================================================================
create or replace view public.v_school_progress AS
select
  s.id as school_id,
  s.name,
  s.region,
  s.area,
  s.assigned_engineer_id,
  coalesce(c.completion_percentage, 0) as completion_percentage,
  s.is_active
from public.schools s
left join public.school_checklists c on c.school_id = s.id
where s.deleted_at is null;

create or replace view public.v_engineer_stats AS
select
  e.id as engineer_id,
  e.full_name,
  e.email,
  e.region,
  e.role,
  e.is_active,
  (
    select count(*) from public.schools s
    where s.assigned_engineer_id = e.id and s.deleted_at is null
  ) as assigned_schools,
  (
    select count(*) from public.school_visits v
    where v.engineer_id = e.id and v.status = 'completed'
  ) as completed_visits
from public.engineers e;