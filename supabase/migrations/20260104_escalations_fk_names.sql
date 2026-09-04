-- Ensure the two FKs from escalations -> engineers are predictably named,
-- so PostgREST can disambiguate embeds (otherwise select(*, engineer:engineers(...))
-- fails with PGRST201 because there are two FKs between the same tables).
do $$
begin
  -- Rename the engineer_id FK to a known name (idempotent)
  if exists (
    select 1 from pg_constraint
    where conname = 'escalations_engineer_id_fkey'
      and conrelid = 'public.escalations'::regclass
  ) then
    -- already correctly named
    null;
  elsif exists (
    select 1 from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.conrelid = 'public.escalations'::regclass
      and c.contype = 'f'
      and a.attname = 'engineer_id'
  ) then
    execute (
      select format(
        'alter table public.escalations rename constraint %I to %I',
        c.conname, 'escalations_engineer_id_fkey'
      )
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
      where c.conrelid = 'public.escalations'::regclass
        and c.contype = 'f'
        and a.attname = 'engineer_id'
      limit 1
    );
  end if;

  -- Rename the assigned_to FK to a known name (idempotent)
  if exists (
    select 1 from pg_constraint
    where conname = 'escalations_assigned_to_fkey'
      and conrelid = 'public.escalations'::regclass
  ) then
    null;
  elsif exists (
    select 1 from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.conrelid = 'public.escalations'::regclass
      and c.contype = 'f'
      and a.attname = 'assigned_to'
  ) then
    execute (
      select format(
        'alter table public.escalations rename constraint %I to %I',
        c.conname, 'escalations_assigned_to_fkey'
      )
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
      where c.conrelid = 'public.escalations'::regclass
        and c.contype = 'f'
        and a.attname = 'assigned_to'
      limit 1
    );
  end if;
end $$;
