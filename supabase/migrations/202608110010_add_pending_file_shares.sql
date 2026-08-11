create table public.file_share_requests (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files (id) on delete cascade,
  recipient_email text not null,
  recipient_email_normalized text generated always as (lower(recipient_email)) stored,
  grantee_id uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint file_share_requests_email_length
    check (char_length(recipient_email) between 3 and 320),
  unique (file_id, recipient_email_normalized)
);

create index file_share_requests_grantee_idx
  on public.file_share_requests (grantee_id)
  where grantee_id is not null;

alter table public.file_share_requests enable row level security;

revoke all on table public.file_share_requests from public, anon, authenticated;
grant all on table public.file_share_requests to service_role;

insert into public.file_share_requests (
  file_id,
  recipient_email,
  grantee_id,
  created_at
)
select
  shares.file_id,
  profiles.email,
  shares.grantee_id,
  shares.created_at
from public.file_shares as shares
join public.profiles as profiles on profiles.id = shares.grantee_id
on conflict (file_id, recipient_email_normalized) do nothing;

create or replace function public.request_file_share(
  p_file_id uuid,
  p_owner_id uuid,
  p_recipient_email text
)
returns table (
  share_id uuid,
  recipient_email text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(p_recipient_email));
  recipient_id uuid;
  request_row public.file_share_requests%rowtype;
begin
  perform 1
  from public.files
  where id = p_file_id
    and owner_id = p_owner_id
    and status = 'ready'
    and deleted_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'share_target_not_available';
  end if;

  select id
  into recipient_id
  from public.profiles
  where email_normalized = normalized_email;

  if recipient_id = p_owner_id then
    recipient_id := null;
  end if;

  select *
  into request_row
  from public.file_share_requests
  where file_id = p_file_id
    and recipient_email_normalized = normalized_email;

  if request_row.id is null then
    if (
      select count(*)
      from public.file_share_requests
      where file_id = p_file_id
    ) >= 100 then
      raise exception using errcode = 'P0001', message = 'share_request_limit';
    end if;

    insert into public.file_share_requests (
      file_id,
      recipient_email,
      grantee_id
    ) values (
      p_file_id,
      normalized_email,
      recipient_id
    )
    returning * into request_row;
  elsif request_row.grantee_id is null and recipient_id is not null then
    update public.file_share_requests
    set grantee_id = recipient_id
    where id = request_row.id
    returning * into request_row;
  end if;

  if request_row.grantee_id is not null then
    insert into public.file_shares (file_id, grantee_id)
    values (p_file_id, request_row.grantee_id)
    on conflict (file_id, grantee_id) do nothing;
  end if;

  return query select
    request_row.id,
    request_row.recipient_email,
    request_row.created_at;
end;
$$;

revoke all on function public.request_file_share(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.request_file_share(uuid, uuid, text)
  to service_role;

create or replace function public.revoke_file_share_request(
  p_file_id uuid,
  p_owner_id uuid,
  p_share_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_grantee_id uuid;
begin
  perform 1
  from public.files
  where id = p_file_id
    and owner_id = p_owner_id
    and deleted_at is null
  for update;

  if not found then
    return false;
  end if;

  delete from public.file_share_requests
  where id = p_share_id
    and file_id = p_file_id
  returning grantee_id into target_grantee_id;

  if not found then
    return false;
  end if;

  if target_grantee_id is not null then
    delete from public.file_shares
    where file_id = p_file_id
      and grantee_id = target_grantee_id;
  end if;

  return true;
end;
$$;

revoke all on function public.revoke_file_share_request(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.revoke_file_share_request(uuid, uuid, uuid)
  to service_role;

create or replace function private.activate_file_share_requests()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null then
    return new;
  end if;

  insert into public.file_shares (file_id, grantee_id)
  select requests.file_id, new.id
  from public.file_share_requests as requests
  join public.files as files on files.id = requests.file_id
  where requests.recipient_email_normalized = lower(new.email)
    and requests.grantee_id is null
    and files.status = 'ready'
    and files.deleted_at is null
    and files.owner_id <> new.id
  on conflict (file_id, grantee_id) do nothing;

  update public.file_share_requests as requests
  set grantee_id = new.id
  where requests.recipient_email_normalized = lower(new.email)
    and requests.grantee_id is null
    and exists (
      select 1
      from public.file_shares as shares
      where shares.file_id = requests.file_id
        and shares.grantee_id = new.id
    );

  return new;
end;
$$;

revoke all on function private.activate_file_share_requests() from public;

create trigger activate_file_share_requests
after insert or update of email on auth.users
for each row execute function private.activate_file_share_requests();

comment on table public.file_share_requests is
  'Owner-visible share requests that do not disclose whether an email is registered.';
