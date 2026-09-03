-- Switch school scoping from assigned engineer to region-based access.
-- Engineers can now see/interact with any school in their region.

create or replace function public.current_engineer_region() returns text
language sql stable security definer set search_path = public as $$
  select region from public.engineers where auth_user_id = auth.uid() limit 1;
$$;

grant execute on function public.current_engineer_region() to authenticated;

-- school_checklists: engineers can see/edit checklists for schools in their region
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
