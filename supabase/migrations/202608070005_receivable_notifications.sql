create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  tipo text not null default 'conta_receber',
  titulo text not null,
  mensagem text not null default '',
  referencia_tipo text,
  referencia_id uuid,
  lida boolean not null default false,
  read_at timestamptz,
  resolvida boolean not null default false,
  cliente_nome text,
  valor numeric(14,2),
  vencimento date,
  situacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notificacoes add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.notificacoes add column if not exists empresa_id uuid references public.empresas(id) on delete cascade;
alter table public.notificacoes add column if not exists tipo text not null default 'conta_receber';
alter table public.notificacoes add column if not exists titulo text not null default 'Notificação';
alter table public.notificacoes add column if not exists mensagem text not null default '';
alter table public.notificacoes add column if not exists referencia_tipo text;
alter table public.notificacoes add column if not exists referencia_id uuid;
alter table public.notificacoes add column if not exists lida boolean not null default false;
alter table public.notificacoes add column if not exists read_at timestamptz;
alter table public.notificacoes add column if not exists resolvida boolean not null default false;
alter table public.notificacoes add column if not exists cliente_nome text;
alter table public.notificacoes add column if not exists valor numeric(14,2);
alter table public.notificacoes add column if not exists vencimento date;
alter table public.notificacoes add column if not exists situacao text;
alter table public.notificacoes add column if not exists updated_at timestamptz not null default now();
alter table public.notificacoes add column if not exists created_at timestamptz not null default now();

create unique index if not exists notificacoes_usuario_referencia_uidx
  on public.notificacoes(user_id, referencia_tipo, referencia_id)
  where user_id is not null and referencia_id is not null;
create index if not exists notificacoes_usuario_ativas_idx
  on public.notificacoes(user_id, resolvida, lida, created_at desc);

alter table public.notificacoes enable row level security;
drop policy if exists "notificacoes_select_own" on public.notificacoes;
create policy "notificacoes_select_own" on public.notificacoes
  for select to authenticated using (
    user_id = auth.uid()
    and empresa_id = (select empresa_id from public.perfis where id = auth.uid())
  );
drop policy if exists "notificacoes_update_own" on public.notificacoes;
create policy "notificacoes_update_own" on public.notificacoes
  for update to authenticated using (
    user_id = auth.uid()
    and empresa_id = (select empresa_id from public.perfis where id = auth.uid())
  ) with check (
    user_id = auth.uid()
    and empresa_id = (select empresa_id from public.perfis where id = auth.uid())
  );

create or replace function public.sincronizar_notificacoes_contas()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_empresa uuid;
  v_perfil text;
  v_today date := timezone('America/Sao_Paulo', now())::date;
begin
  select empresa_id, lower(perfil::text)
    into v_empresa, v_perfil
  from public.perfis
  where id = v_user and ativo = true;

  if v_empresa is null then
    raise exception 'Usuário sem empresa ativa.';
  end if;

  if v_perfil not in ('administrador', 'gerente') then
    update public.notificacoes
       set resolvida = true, updated_at = now()
     where user_id = v_user and referencia_tipo = 'conta_receber' and not resolvida;
    return;
  end if;

  update public.notificacoes n
     set resolvida = true, updated_at = now()
   where n.user_id = v_user
     and n.empresa_id = v_empresa
     and n.referencia_tipo = 'conta_receber'
     and not n.resolvida
     and not exists (
       select 1 from public.contas_receber cr
       where cr.id = n.referencia_id
         and cr.empresa_id = v_empresa
         and lower(coalesce(cr.status::text, '')) not in ('pago', 'cancelado', 'quitado')
         and coalesce(cr.valor_pago, 0) < coalesce(cr.valor_original, 0)
         and cr.data_vencimento <= v_today + 5
     );

  insert into public.notificacoes (
    empresa_id, user_id, tipo, titulo, mensagem, referencia_tipo,
    referencia_id, lida, resolvida, cliente_nome, valor, vencimento,
    situacao, created_at, updated_at
  )
  select
    cr.empresa_id,
    v_user,
    'conta_receber',
    case
      when cr.data_vencimento < v_today then 'Conta vencida'
      when cr.data_vencimento = v_today then 'Vence hoje'
      else 'Próximo vencimento'
    end,
    coalesce(c.nome, c.razao_social, 'Cliente não informado'),
    'conta_receber',
    cr.id,
    false,
    false,
    coalesce(c.nome, c.razao_social, 'Cliente não informado'),
    greatest(coalesce(cr.valor_original, 0) - coalesce(cr.valor_pago, 0), 0),
    cr.data_vencimento,
    case
      when cr.data_vencimento < v_today then 'vencida'
      when cr.data_vencimento = v_today then 'hoje'
      else 'proxima'
    end,
    now(),
    now()
  from public.contas_receber cr
  left join public.clientes c on c.id = cr.cliente_id and c.empresa_id = cr.empresa_id
  where cr.empresa_id = v_empresa
    and lower(coalesce(cr.status::text, '')) not in ('pago', 'cancelado', 'quitado')
    and coalesce(cr.valor_pago, 0) < coalesce(cr.valor_original, 0)
    and cr.data_vencimento <= v_today + 5
  on conflict (user_id, referencia_tipo, referencia_id) where user_id is not null and referencia_id is not null
  do update set
    titulo = excluded.titulo,
    mensagem = excluded.mensagem,
    cliente_nome = excluded.cliente_nome,
    valor = excluded.valor,
    vencimento = excluded.vencimento,
    situacao = excluded.situacao,
    resolvida = false,
    lida = case when public.notificacoes.situacao is distinct from excluded.situacao then false else public.notificacoes.lida end,
    read_at = case when public.notificacoes.situacao is distinct from excluded.situacao then null else public.notificacoes.read_at end,
    updated_at = now();
end;
$$;

revoke all on function public.sincronizar_notificacoes_contas() from public;
grant execute on function public.sincronizar_notificacoes_contas() to authenticated;
