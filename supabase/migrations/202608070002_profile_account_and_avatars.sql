alter table public.perfis add column if not exists telefone text;
alter table public.perfis add column if not exists cargo text;
alter table public.perfis add column if not exists avatar_url text;

drop function if exists public.atualizar_meu_perfil(text,text,text);
create or replace function public.atualizar_meu_perfil(p_nome text, p_telefone text default null, p_avatar_url text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.'; end if;
  if nullif(trim(p_nome),'') is null then raise exception 'Informe o nome completo.'; end if;
  update public.perfis set nome=trim(p_nome), telefone=nullif(trim(p_telefone),''), avatar_url=nullif(trim(p_avatar_url),'') where id=auth.uid();
end; $$;
revoke all on function public.atualizar_meu_perfil(text,text,text) from public;
grant execute on function public.atualizar_meu_perfil(text,text,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "avatars_select" on storage.objects;
drop policy if exists "avatars_insert_own_company" on storage.objects;
drop policy if exists "avatars_update_own_company" on storage.objects;
drop policy if exists "avatars_delete_own_company" on storage.objects;
create policy "avatars_select" on storage.objects for select to authenticated using(bucket_id='avatars');
create policy "avatars_insert_own_company" on storage.objects for insert to authenticated with check(
 bucket_id='avatars' and exists(select 1 from public.perfis p where p.id=auth.uid() and p.empresa_id::text=(storage.foldername(name))[1] and p.id::text=(storage.foldername(name))[2]));
create policy "avatars_update_own_company" on storage.objects for update to authenticated using(
 bucket_id='avatars' and exists(select 1 from public.perfis p where p.id=auth.uid() and p.empresa_id::text=(storage.foldername(name))[1] and p.id::text=(storage.foldername(name))[2]));
create policy "avatars_delete_own_company" on storage.objects for delete to authenticated using(
 bucket_id='avatars' and exists(select 1 from public.perfis p where p.id=auth.uid() and p.empresa_id::text=(storage.foldername(name))[1] and p.id::text=(storage.foldername(name))[2]));
