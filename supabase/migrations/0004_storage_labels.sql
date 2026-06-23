-- Private bucket for generated label PDFs (created now, used in Phase 2).
insert into storage.buckets (id, name, public)
values ('labels','labels', false) on conflict (id) do nothing;

create policy "labels auth read"  on storage.objects for select to authenticated
  using (bucket_id = 'labels');
create policy "labels auth write" on storage.objects for insert to authenticated
  with check (bucket_id = 'labels');
create policy "labels auth update" on storage.objects for update to authenticated
  using (bucket_id = 'labels');
