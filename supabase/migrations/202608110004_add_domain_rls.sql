create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_file_owner(target_file_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.files
    where id = target_file_id
      and owner_id = (select auth.uid())
      and deleted_at is null
  );
$$;

create or replace function private.is_file_grantee(target_file_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.file_shares
    where file_id = target_file_id
      and grantee_id = (select auth.uid())
  );
$$;

revoke all on function private.is_file_owner(uuid) from public;
revoke all on function private.is_file_grantee(uuid) from public;
grant execute on function private.is_file_owner(uuid)
  to authenticated, service_role;
grant execute on function private.is_file_grantee(uuid)
  to authenticated, service_role;

revoke all on table public.files from anon, authenticated;
revoke all on table public.file_shares from anon, authenticated;

grant select on table public.files to authenticated;
grant select on table public.file_shares to authenticated;
grant all on table public.files to service_role;
grant all on table public.file_shares to service_role;

create policy "owners and grantees can read visible files"
on public.files
for select
to authenticated
using (
  deleted_at is null
  and (
    owner_id = (select auth.uid())
    or (
      status = 'ready'
      and (select private.is_file_grantee(id))
    )
  )
);

create policy "owners and grantees can read relevant shares"
on public.file_shares
for select
to authenticated
using (
  grantee_id = (select auth.uid())
  or (select private.is_file_owner(file_id))
);

comment on function private.is_file_owner(uuid) is
  'RLS helper that avoids recursive policies between files and file_shares.';
comment on function private.is_file_grantee(uuid) is
  'RLS helper that checks whether the current user has a file share.';
