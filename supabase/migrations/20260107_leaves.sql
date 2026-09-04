-- Leave requests: engineers apply, admin/team_lead decide.
-- Approval auto-creates a daily_log row per day in the range with
-- activity_type='leave' and the leave reason in activities_done.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'leave_status') then
    create type leave_status as enum ('pending', 'approved', 'rejected', 'cancelled');
  end if;
end $$;

create table if not exists public.leaves (
  id uuid primary key default gen_random_uuid(),
  engineer_id uuid not null references public.engineers(id) on delete cascade,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  reason text not null check (length(reason) > 0),
  status leave_status not null default 'pending',
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leaves_engineer on public.leaves(engineer_id);
create index if not exists idx_leaves_status on public.leaves(status);
create index if not exists idx_leaves_dates on public.leaves(start_date, end_date);

drop trigger if exists trg_leaves_updated_at on public.leaves;
create trigger trg_leaves_updated_at before update on public.leaves
  for each row execute function public.set_updated_at();

alter table public.leaves enable row level security;

-- Engineers can read their own leaves; admins/team_leads can read all.
drop policy if exists leaves_self_select on public.leaves;
create policy leaves_self_select on public.leaves
  for select using (
    engineer_id = public.current_engineer_id()
    or public.is_admin_or_lead()
  );

-- Engineers can apply for leave on their own behalf only.
drop policy if exists leaves_self_insert on public.leaves;
create policy leaves_self_insert on public.leaves
  for insert with check (
    engineer_id = public.current_engineer_id()
    and status = 'pending'
  );

-- Engineers can cancel their own pending leaves; admin/team_lead can
-- update any leave (approve/reject).
drop policy if exists leaves_update on public.leaves;
create policy leaves_update on public.leaves
  for update using (
    (engineer_id = public.current_engineer_id() and status = 'pending')
    or public.is_admin_or_lead()
  )
  with check (
    (engineer_id = public.current_engineer_id() and status in ('pending', 'cancelled'))
    or public.is_admin_or_lead()
  );

-- Add to realtime publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = 'leaves'
    ) then
      alter publication supabase_realtime add table public.leaves;
    end if;
  end if;
end $$;

-- When a leave is approved, auto-create daily_logs for each date in
-- the range. Approved leaves also add the engineer to the
-- approver's profile so RLS visibility is consistent.
create or replace function public.handle_leave_approval()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  d date;
  exists_already boolean;
begin
  if (tg_op = 'UPDATE'
      and new.status = 'approved'
      and (old.status is null or old.status <> 'approved')) then
    d := new.start_date;
    while d <= new.end_date loop
      select exists(
        select 1 from public.daily_logs
        where engineer_id = new.engineer_id and log_date = d
      ) into exists_already;
      if not exists_already then
        insert into public.daily_logs (engineer_id, school_id, log_date, activity_type, activities_done, notes, is_approved, approved_by, approved_at)
        values (
          new.engineer_id,
          null,
          d,
          'leave',
          'Leave: ' || new.reason,
          new.decision_note,
          true,
          new.decided_by,
          coalesce(new.decided_at, now())
        );
      end if;
      d := d + interval '1 day';
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_leaves_approval on public.leaves;
create trigger trg_leaves_approval
  after update on public.leaves
  for each row execute function public.handle_leave_approval();
