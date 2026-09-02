-- =====================================================================
-- Optional development seed data
-- Run ONLY in development environments.
-- This file creates sample engineers, schools, visits, logs, escalations.
-- It does NOT create auth.users; you must first sign up the engineers
-- through Supabase Auth and update their engineer_id in profiles.
-- =====================================================================

-- Idempotent inserts (only run if empty)
do $$
declare
  e1 uuid;
  e2 uuid;
  e3 uuid;
  s1 uuid;
  s2 uuid;
  s3 uuid;
begin
  if (select count(*) from public.engineers) > 0 then
    raise notice 'Seed skipped: engineers already exist';
    return;
  end if;

  insert into public.engineers (full_name, email, phone, region, role, is_active)
  values
    ('Ravi Kumar', 'ravi.kumar@example.com', '+91 9000000001', 'Andhra Pradesh', 'team_lead', true)
    returning id into e1;

  insert into public.engineers (full_name, email, phone, region, role, is_active)
  values
    ('Priya Sharma', 'priya.sharma@example.com', '+91 9000000002', 'Telangana', 'engineer', true)
    returning id into e2;

  insert into public.engineers (full_name, email, phone, region, role, is_active)
  values
    ('Arjun Reddy', 'arjun.reddy@example.com', '+91 9000000003', 'Andhra Pradesh', 'engineer', true)
    returning id into e3;

  insert into public.schools (name, spoc_name, spoc_contact, location, region, area, latitude, longitude, maps_link, assigned_engineer_id, is_active)
  values
    ('ZPHS Visakhapatnam', 'Mr. Suresh', '+91 9123456701', 'MVP Colony, Visakhapatnam', 'Andhra Pradesh', 'Visakhapatnam', 17.7384, 83.3345, 'https://maps.google.com/?q=17.7384,83.3345', e1, true)
    returning id into s1;

  insert into public.schools (name, spoc_name, spoc_contact, location, region, area, latitude, longitude, maps_link, assigned_engineer_id, is_active)
  values
    ('Govt High School Hyderabad', 'Ms. Lakshmi', '+91 9123456702', 'Banjara Hills, Hyderabad', 'Telangana', 'Hyderabad', 17.4126, 78.4484, 'https://maps.google.com/?q=17.4126,78.4484', e2, true)
    returning id into s2;

  insert into public.schools (name, spoc_name, spoc_contact, location, region, area, latitude, longitude, maps_link, assigned_engineer_id, is_active)
  values
    ('Municipal School Guntur', 'Mr. Ramesh', '+91 9123456703', 'Arundelpet, Guntur', 'Andhra Pradesh', 'Guntur', 16.3067, 80.4365, 'https://maps.google.com/?q=16.3067,80.4365', e3, true)
    returning id into s3;

  insert into public.school_visits (school_id, engineer_id, visit_date, reason, status, accepted_at, completed_at)
  values
    (s1, e1, current_date - 7, 'Initial setup walkthrough', 'completed', now() - interval '7 days', now() - interval '7 days'),
    (s2, e2, current_date - 3, 'Teacher LMS onboarding', 'completed', now() - interval '3 days', now() - interval '3 days'),
    (s3, e3, current_date + 2, 'Lab configuration', 'scheduled', null, null);

  insert into public.daily_logs (engineer_id, school_id, log_date, activity_type, start_time, end_time, activities_done, is_approved, approved_by, approved_at)
  values
    (e1, s1, current_date - 7, 'school_visit', '09:00:00', '13:00:00', 'Installed kits, verified components, trained teachers', true, null, now()),
    (e2, s2, current_date - 3, 'school_visit', '10:00:00', '15:00:00', 'Conducted LMS access training for 12 teachers', true, null, now()),
    (e3, null, current_date, 'work_from_home', '09:30:00', '17:00:00', 'Prepared reports, scheduled upcoming visits', false, null, null);

  insert into public.escalations (school_id, engineer_id, issue_type, issue_description, urgency, status)
  values
    (s1, e1, 'missing_material', 'Robotics kit missing 2 sensors', 'high', 'open'),
    (s2, e2, 'undelivered_material', 'Tablets ordered but not received', 'critical', 'in_progress');
end $$;