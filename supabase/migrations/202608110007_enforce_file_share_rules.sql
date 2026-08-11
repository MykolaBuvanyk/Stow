create or replace function private.validate_file_share()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_owner_id uuid;
  target_status text;
  target_deleted_at timestamptz;
begin
  select owner_id, status, deleted_at
  into target_owner_id, target_status, target_deleted_at
  from public.files
  where id = new.file_id
  for update;

  if target_owner_id is null then
    raise foreign_key_violation using message = 'Target file does not exist.';
  end if;

  if target_owner_id = new.grantee_id then
    raise check_violation using message = 'A file cannot be shared with its owner.';
  end if;

  if target_status <> 'ready' or target_deleted_at is not null then
    raise check_violation using message = 'Only active ready files can be shared.';
  end if;

  if (
    select count(*)
    from public.file_shares
    where file_id = new.file_id
  ) >= 100 then
    raise check_violation using message = 'The file share limit has been reached.';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_file_share() from public;

create trigger validate_file_share
before insert on public.file_shares
for each row execute function private.validate_file_share();

comment on function private.validate_file_share() is
  'Serializes writes per file and enforces ready, non-owner, and bounded shares.';
