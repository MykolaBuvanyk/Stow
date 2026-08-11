alter table public.files
  add column cleanup_claimed_at timestamptz;

create index files_unfinished_cleanup_idx
  on public.files (created_at, id)
  where deleted_at is null
    and status in ('pending', 'rejected');

create index files_deleted_cleanup_idx
  on public.files (deleted_at, id)
  where deleted_at is not null;

create or replace function public.claim_file_cleanup_candidates(
  p_pending_before timestamptz,
  p_rejected_before timestamptz,
  p_deleted_before timestamptz,
  p_retry_before timestamptz,
  p_limit integer
)
returns table (
  id uuid,
  object_path text,
  claimed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit < 1 or p_limit > 100 then
    raise exception 'cleanup batch limit must be between 1 and 100';
  end if;

  return query
  with candidates as (
    select f.id
    from public.files as f
    where (
        f.cleanup_claimed_at is null
        or f.cleanup_claimed_at < p_retry_before
      )
      and (
        (f.deleted_at is not null and f.deleted_at < p_deleted_before)
        or (
          f.deleted_at is null
          and f.status = 'pending'
          and f.created_at < p_pending_before
        )
        or (
          f.deleted_at is null
          and f.status = 'rejected'
          and f.created_at < p_rejected_before
        )
      )
    order by coalesce(f.deleted_at, f.created_at), f.id
    for update skip locked
    limit p_limit
  )
  update public.files as f
  set
    deleted_at = coalesce(f.deleted_at, now()),
    cleanup_claimed_at = now()
  from candidates
  where f.id = candidates.id
  returning f.id, f.object_path, f.cleanup_claimed_at;
end;
$$;

revoke all on function public.claim_file_cleanup_candidates(
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  integer
) from public, anon, authenticated;

grant execute on function public.claim_file_cleanup_candidates(
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  integer
) to service_role;

comment on column public.files.cleanup_claimed_at is
  'Lease timestamp for idempotent cleanup by the maintenance sweep.';
comment on function public.claim_file_cleanup_candidates(
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  integer
) is
  'Atomically tombstones and leases a bounded batch of stale file records.';
