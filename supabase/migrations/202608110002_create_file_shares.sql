create table public.file_shares (
  file_id uuid not null references public.files (id) on delete cascade,
  grantee_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (file_id, grantee_id)
);

create index file_shares_grantee_idx
  on public.file_shares (grantee_id, created_at desc);

alter table public.file_shares enable row level security;

comment on table public.file_shares is
  'Read-only access grants for individual ready files.';
comment on column public.file_shares.grantee_id is
  'Authenticated user who may read and download the shared file.';
