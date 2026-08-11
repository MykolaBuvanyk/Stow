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
