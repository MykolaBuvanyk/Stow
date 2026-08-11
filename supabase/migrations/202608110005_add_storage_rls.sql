create or replace function private.can_upload_vault_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.files
    where object_path = object_name
      and owner_id = (select auth.uid())
      and status = 'pending'
      and deleted_at is null
  );
$$;

create or replace function private.can_read_vault_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.files
    where object_path = object_name
      and owner_id = (select auth.uid())
      and status = 'ready'
      and deleted_at is null
  );
$$;

revoke all on function private.can_upload_vault_object(text) from public;
revoke all on function private.can_read_vault_object(text) from public;
grant execute on function private.can_upload_vault_object(text)
  to authenticated, service_role;
grant execute on function private.can_read_vault_object(text)
  to authenticated, service_role;

create policy "vault owners can upload reserved objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vault'
  and cardinality(storage.foldername(name)) = 1
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select private.can_upload_vault_object(name))
);

create policy "vault owners can read ready objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'vault'
  and cardinality(storage.foldername(name)) = 1
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select private.can_read_vault_object(name))
);

comment on function private.can_upload_vault_object(text) is
  'Allows Storage upload only for a server-reserved pending object path.';
comment on function private.can_read_vault_object(text) is
  'Allows direct owner reads only after successful finalization.';
