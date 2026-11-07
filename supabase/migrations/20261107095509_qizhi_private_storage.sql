begin;

create table public.qizhi_records (
  namespace text not null check (namespace in ('cloud', 'ppt')),
  key text not null,
  data jsonb not null,
  metadata jsonb not null default '{}',
  etag uuid not null,
  primary key (namespace, key)
);

alter table public.qizhi_records enable row level security;
revoke all on public.qizhi_records from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.qizhi_records to service_role;

insert into storage.buckets (id, name, public, file_size_limit)
values ('qizhi-private-files', 'qizhi-private-files', false, 3500000);

commit;
