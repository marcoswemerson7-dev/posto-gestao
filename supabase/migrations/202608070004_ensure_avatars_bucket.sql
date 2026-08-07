insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set
  public=true,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "avatars_select" on storage.objects;
drop policy if exists "avatars_insert_own_company" on storage.objects;
drop policy if exists "avatars_update_own_company" on storage.objects;
drop policy if exists "avatars_delete_own_company" on storage.objects;

create policy "avatars_select" on storage.objects for select to authenticated
  using(bucket_id='avatars');
create policy "avatars_insert_own_company" on storage.objects for insert to authenticated
  with check(bucket_id='avatars' and exists(
    select 1 from public.perfis p where p.id=auth.uid()
      and p.empresa_id::text=(storage.foldername(name))[1]
      and p.id::text=(storage.foldername(name))[2]));
create policy "avatars_update_own_company" on storage.objects for update to authenticated
  using(bucket_id='avatars' and exists(
    select 1 from public.perfis p where p.id=auth.uid()
      and p.empresa_id::text=(storage.foldername(name))[1]
      and p.id::text=(storage.foldername(name))[2]));
create policy "avatars_delete_own_company" on storage.objects for delete to authenticated
  using(bucket_id='avatars' and exists(
    select 1 from public.perfis p where p.id=auth.uid()
      and p.empresa_id::text=(storage.foldername(name))[1]
      and p.id::text=(storage.foldername(name))[2]));
