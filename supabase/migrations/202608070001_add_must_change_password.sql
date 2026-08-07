alter table public.perfis
  add column if not exists must_change_password boolean not null default false;

comment on column public.perfis.must_change_password is
  'Obriga o usuário a definir uma nova senha no próximo acesso.';

create or replace function public.concluir_troca_senha()
returns void language sql security definer set search_path=public as $$
  update public.perfis set must_change_password=false where id=auth.uid();
$$;
revoke all on function public.concluir_troca_senha() from public;
grant execute on function public.concluir_troca_senha() to authenticated;
