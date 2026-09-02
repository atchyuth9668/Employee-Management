-- Drop in dependency order (safe to re-run)
drop view if exists public.v_school_progress cascade;
drop view if exists public.v_engineer_stats cascade;

drop function if exists public.recalculate_checklist_percentage() cascade;
drop function if exists public.handle_new_school() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.current_user_role() cascade;
drop function if exists public.current_engineer_id() cascade;
drop function if exists public.is_admin_or_lead() cascade;

drop table if exists public.monthly_visit_targets cascade;
drop table if exists public.lms_access cascade;
drop table if exists public.material_deliveries cascade;
drop table if exists public.visit_feedback cascade;
drop table if exists public.escalations cascade;
drop table if exists public.daily_logs cascade;
drop table if exists public.school_checklists cascade;
drop table if exists public.school_visits cascade;
drop table if exists public.schools cascade;
drop table if exists public.engineers cascade;
drop table if exists public.school_teams cascade;
drop table if exists public.profiles cascade;

drop type if exists public.user_role cascade;
drop type if exists public.visit_status cascade;
drop type if exists public.activity_type cascade;
drop type if exists public.escalation_status cascade;
drop type if exists public.escalation_urgency cascade;
drop type if exists public.escalation_issue_type cascade;
drop type if exists public.material_status cascade;
drop type if exists public.lms_status cascade;