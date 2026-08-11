alter table public.file_share_requests
  drop constraint file_share_requests_grantee_id_fkey,
  add constraint file_share_requests_grantee_id_fkey
    foreign key (grantee_id) references auth.users (id) on delete cascade;

comment on constraint file_share_requests_grantee_id_fkey
  on public.file_share_requests is
  'Deleting a recipient account revokes its requests instead of granting them to a recycled email.';
