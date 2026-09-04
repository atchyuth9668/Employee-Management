-- Holidays: declared by admin/team_lead, apply to all engineers.
create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  reason text not null check (length(reason) > 0),
  declared_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_holidays_date on public.holidays(holiday_date);

drop trigger if exists trg_holidays_updated_at on public.holidays;
create trigger trg_holidays_updated_at before update on public.holidays
  for each row execute function public.set_updated_at();

alter table public.holidays enable row level security;

drop policy if exists holidays_read on public.holidays;
create policy holidays_read on public.holidays
  for select using (auth.role() = 'authenticated');

drop policy if exists holidays_admin_write on public.holidays;
create policy holidays_admin_write on public.holidays
  for all using (public.is_admin_or_lead())
  with check (public.is_admin_or_lead());

-- Add to realtime publication so the logs page reflects new holidays live
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = 'holidays'
    ) then
      alter publication supabase_realtime add table public.holidays;
    end if;
  end if;
end $$;
