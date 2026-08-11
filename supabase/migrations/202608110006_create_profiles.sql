create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  email_normalized text generated always as (lower(email)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_normalized_idx
  on public.profiles (email_normalized);

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant all on table public.profiles to service_role;

create or replace function private.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null then
    delete from public.profiles where id = new.id;
    return new;
  end if;

  insert into public.profiles (id, email, created_at, updated_at)
  values (new.id, new.email, coalesce(new.created_at, now()), now())
  on conflict (id) do update
  set
    email = excluded.email,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

revoke all on function private.sync_auth_user_profile() from public;

create trigger sync_auth_user_profile
after insert or update of email on auth.users
for each row execute function private.sync_auth_user_profile();

insert into public.profiles (id, email, created_at, updated_at)
select id, email, created_at, now()
from auth.users
where email is not null
on conflict (id) do update
set
  email = excluded.email,
  updated_at = excluded.updated_at;

comment on table public.profiles is
  'Server-only user directory used for exact recipient lookup and share display.';
