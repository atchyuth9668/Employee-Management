-- Auto-link profiles <-> engineers by email, and backfill existing data.

create or replace function public.handle_profile_link_engineer()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  matched_engineer uuid;
begin
  if new.engineer_id is null and new.email is not null then
    select id into matched_engineer
    from public.engineers
    where lower(email) = lower(new.email)
      and (auth_user_id is null or auth_user_id = new.id)
    limit 1;
    if matched_engineer is not null then
      new.engineer_id := matched_engineer;
      update public.engineers
        set auth_user_id = new.id
        where id = matched_engineer and auth_user_id is null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_link_engineer on public.profiles;
create trigger trg_profiles_link_engineer
before insert on public.profiles
for each row execute function public.handle_profile_link_engineer();

-- Backfill: link existing profiles to matching engineers by email
update public.profiles p
set engineer_id = e.id
from public.engineers e
where p.engineer_id is null
  and lower(p.email) = lower(e.email)
  and (e.auth_user_id is null or e.auth_user_id = p.id);

-- Backfill: link existing engineers to matching profiles by email
update public.engineers e
set auth_user_id = p.id
from public.profiles p
where e.auth_user_id is null
  and lower(e.email) = lower(p.email);
