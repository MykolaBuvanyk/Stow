alter table public.files
  add column declared_size_bytes bigint;

update public.files
set declared_size_bytes = greatest(coalesce(size_bytes, 1), 1)
where declared_size_bytes is null;

alter table public.files
  alter column declared_size_bytes set not null,
  add constraint files_declared_size_bytes_valid
    check (declared_size_bytes between 1 and 26214400);

create table public.api_rate_limits (
  subject_hash text not null,
  action text not null,
  window_started_at timestamptz not null,
  request_count integer not null,

  primary key (subject_hash, action),
  constraint api_rate_limits_subject_hash_valid
    check (subject_hash ~ '^[0-9a-f]{64}$'),
  constraint api_rate_limits_action_valid
    check (action ~ '^[a-z][a-z-]{0,63}$'),
  constraint api_rate_limits_request_count_positive
    check (request_count > 0)
);

alter table public.api_rate_limits enable row level security;

revoke all on table public.api_rate_limits from public, anon, authenticated;
grant all on table public.api_rate_limits to service_role;

create or replace function public.consume_api_rate_limit(
  p_subject_hash text,
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window timestamptz;
  stored_window timestamptz;
  stored_count integer;
begin
  if p_subject_hash !~ '^[0-9a-f]{64}$'
    or p_action !~ '^[a-z][a-z-]{0,63}$'
    or p_limit < 1
    or p_limit > 10000
    or p_window_seconds < 1
    or p_window_seconds > 86400 then
    raise exception 'invalid rate-limit policy';
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds)
      * p_window_seconds
  );

  insert into public.api_rate_limits as limits (
    subject_hash,
    action,
    window_started_at,
    request_count
  )
  values (p_subject_hash, p_action, v_window, 1)
  on conflict (subject_hash, action) do update
  set
    window_started_at = case
      when limits.window_started_at = v_window
        then limits.window_started_at
      else v_window
    end,
    request_count = case
      when limits.window_started_at = v_window
        then limits.request_count + 1
      else 1
    end
  returning window_started_at, request_count
  into stored_window, stored_count;

  return query select
    stored_count <= p_limit,
    greatest(
      1,
      ceil(
        extract(epoch from stored_window + make_interval(secs => p_window_seconds) - v_now)
      )::integer
    );
end;
$$;

revoke all on function public.consume_api_rate_limit(
  text,
  text,
  integer,
  integer
) from public, anon, authenticated;

grant execute on function public.consume_api_rate_limit(
  text,
  text,
  integer,
  integer
) to service_role;

create or replace function public.reserve_file_upload(
  p_id uuid,
  p_owner_id uuid,
  p_object_path text,
  p_original_name text,
  p_declared_mime text,
  p_declared_size_bytes bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_pending_count integer;
  reserved_bytes bigint;
begin
  if p_declared_size_bytes < 1 or p_declared_size_bytes > 26214400 then
    raise exception using errcode = '22023', message = 'invalid_declared_size';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text, 0)
  );

  select
    count(*) filter (where status = 'pending'),
    coalesce(sum(
      case
        when status = 'ready' then size_bytes
        else declared_size_bytes
      end
    ), 0)
  into active_pending_count, reserved_bytes
  from public.files
  where owner_id = p_owner_id
    and deleted_at is null
    and status in ('pending', 'ready');

  if active_pending_count >= 5 then
    raise exception using errcode = 'P0001', message = 'pending_upload_limit';
  end if;

  if reserved_bytes + p_declared_size_bytes > 1073741824 then
    raise exception using errcode = 'P0001', message = 'storage_quota_exceeded';
  end if;

  insert into public.files (
    id,
    owner_id,
    object_path,
    original_name,
    declared_mime,
    declared_size_bytes,
    status
  ) values (
    p_id,
    p_owner_id,
    p_object_path,
    p_original_name,
    p_declared_mime,
    p_declared_size_bytes,
    'pending'
  );
end;
$$;

revoke all on function public.reserve_file_upload(
  uuid,
  uuid,
  text,
  text,
  text,
  bigint
) from public, anon, authenticated;

grant execute on function public.reserve_file_upload(
  uuid,
  uuid,
  text,
  text,
  text,
  bigint
) to service_role;

comment on table public.api_rate_limits is
  'Fixed-window counters for distributed application-level abuse controls.';
comment on column public.files.declared_size_bytes is
  'Validated reservation size used for atomic per-owner storage quotas.';
comment on function public.reserve_file_upload(uuid, uuid, text, text, text, bigint) is
  'Atomically enforces pending-upload and storage quotas before reservation.';
