-- Component status: two explicit options for component verification.
-- 'all_received' = all components received (component_verified = true)
-- 'pending'      = components pending      (component_verified = false)
-- null            = not set yet (preserves old checklist rows)
alter table public.school_checklists
  add column if not exists component_status text
    check (component_status in ('all_received', 'pending'));

-- Backfill existing rows so the UI has a value to show.
update public.school_checklists
  set component_status = case
    when component_verified = true then 'all_received'
    else 'pending'
  end
  where component_status is null;
