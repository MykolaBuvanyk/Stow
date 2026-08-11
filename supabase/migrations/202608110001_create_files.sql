create table public.files (
  id uuid primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  object_path text not null unique,
  original_name text not null,
  declared_mime text not null,
  size_bytes bigint,
  content_type text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  deleted_at timestamptz,

  constraint files_object_path_matches_owner_and_id
    check (object_path = owner_id::text || '/' || id::text),
  constraint files_original_name_length
    check (char_length(btrim(original_name)) between 1 and 255),
  constraint files_declared_mime_allowed
    check (declared_mime in ('application/pdf', 'image/jpeg', 'image/png')),
  constraint files_size_bytes_nonnegative
    check (size_bytes is null or size_bytes >= 0),
  constraint files_content_type_allowed
    check (
      content_type is null
      or content_type in ('application/pdf', 'image/jpeg', 'image/png')
    ),
  constraint files_status_allowed
    check (status in ('pending', 'ready', 'rejected')),
  constraint files_ready_metadata_present
    check (
      status <> 'ready'
      or (
        size_bytes is not null
        and content_type is not null
        and finalized_at is not null
      )
    )
);

create index files_owner_created_idx
  on public.files (owner_id, created_at desc);

alter table public.files enable row level security;

comment on table public.files is
  'Metadata for private objects stored in the vault bucket.';
comment on column public.files.object_path is
  'Server-controlled Storage key in the form owner_id/file_id.';
comment on column public.files.declared_mime is
  'Client-declared MIME used only for the initial reservation check.';
comment on column public.files.content_type is
  'Authoritative MIME detected from file signature during finalization.';
comment on column public.files.deleted_at is
  'Tombstone used to hide a file before its Storage object is removed.';
