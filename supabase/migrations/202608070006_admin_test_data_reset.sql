alter table public.empresas
  add column if not exists allow_test_data_reset boolean not null default true;

create or replace function public.limpar_dados_teste(
  p_acao text,
  p_confirmacao text default null,
  p_excluir_clientes boolean default false,
  p_excluir_fornecedores boolean default false,
  p_saldos_tanques jsonb default '{}'::jsonb,
  p_preview boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_empresa uuid;
  v_perfil text;
  v_enabled boolean;
  v_counts jsonb;
  v_item record;
  v_audit_module text;
  v_audit_detail text;
begin
  if v_user is null then raise exception 'Usuário não autenticado.' using errcode = '42501'; end if;
  select p.empresa_id, lower(p.perfil::text), e.allow_test_data_reset
    into v_empresa, v_perfil, v_enabled
    from public.perfis p join public.empresas e on e.id = p.empresa_id
   where p.id = v_user and p.ativo = true;
  if v_empresa is null or v_perfil <> 'administrador' then
    raise exception 'Somente administrador pode limpar dados de teste.' using errcode = '42501';
  end if;
  if not coalesce(v_enabled, false) then
    raise exception 'A limpeza de dados de teste está desativada para esta empresa.' using errcode = '42501';
  end if;
  if p_acao not in ('vendas','caixa','contas','despesas','estoque','todos') then
    raise exception 'Opção de limpeza inválida.';
  end if;

  select jsonb_build_object(
    'vendas', case when p_acao in ('vendas','todos') then (select count(*) from public.vendas where empresa_id = v_empresa) else 0 end,
    'caixas', case when p_acao in ('caixa','todos') then (select count(*) from public.caixas where empresa_id = v_empresa) else 0 end,
    'movimentacoes_caixa', case
      when p_acao in ('caixa','todos') then (select count(*) from public.movimentacoes_caixa where empresa_id = v_empresa)
      when p_acao = 'vendas' then (select count(*) from public.movimentacoes_caixa where empresa_id = v_empresa and tipo = 'venda')
      when p_acao = 'despesas' then (select count(*) from public.movimentacoes_caixa where empresa_id = v_empresa and tipo = 'despesa') else 0 end,
    'contas', case
      when p_acao in ('contas','todos') then (select count(*) from public.contas_receber where empresa_id = v_empresa)
      when p_acao = 'vendas' then (select count(*) from public.contas_receber where empresa_id = v_empresa and venda_id in (select id from public.vendas where empresa_id = v_empresa)) else 0 end,
    'recebimentos', case
      when p_acao in ('contas','todos') then (select count(*) from public.recebimentos where empresa_id = v_empresa)
      when p_acao = 'vendas' then (select count(*) from public.recebimentos r where r.empresa_id = v_empresa and exists (select 1 from public.contas_receber cr where cr.id=r.conta_receber_id and cr.venda_id in (select id from public.vendas where empresa_id=v_empresa))) else 0 end,
    'despesas', case when p_acao in ('despesas','todos') then (select count(*) from public.despesas where empresa_id = v_empresa) else 0 end,
    'movimentacoes_estoque', case
      when p_acao in ('estoque','todos') then (select count(*) from public.movimentacoes_tanque where empresa_id = v_empresa)
      when p_acao = 'vendas' then (select count(*) from public.movimentacoes_tanque where empresa_id = v_empresa and tipo='venda') else 0 end,
    'notificacoes', case
      when p_acao in ('contas','todos') then (select count(*) from public.notificacoes where empresa_id = v_empresa)
      when p_acao='vendas' then (select count(*) from public.notificacoes where empresa_id=v_empresa and referencia_id in (select id from public.contas_receber where empresa_id=v_empresa and venda_id in (select id from public.vendas where empresa_id=v_empresa))) else 0 end,
    'clientes', case when p_acao='todos' and p_excluir_clientes then (select count(*) from public.clientes where empresa_id = v_empresa) else 0 end,
    'fornecedores', case when p_acao='todos' and p_excluir_fornecedores then (select count(*) from public.fornecedores where empresa_id = v_empresa) else 0 end
  ) into v_counts;
  if p_preview then return v_counts; end if;
  if p_confirmacao is distinct from 'ZERAR DADOS' then
    raise exception 'Digite ZERAR DADOS para confirmar a limpeza.';
  end if;

  if p_acao in ('contas','vendas','todos') then
    delete from public.recebimentos r
     where r.empresa_id = v_empresa
       and (p_acao in ('contas','todos') or exists (
         select 1 from public.contas_receber cr where cr.id = r.conta_receber_id and cr.empresa_id = v_empresa
           and cr.venda_id in (select id from public.vendas where empresa_id = v_empresa)));
    delete from public.notificacoes n where n.empresa_id = v_empresa
      and (p_acao in ('contas','todos') or n.referencia_id in (select id from public.contas_receber where empresa_id = v_empresa));
    delete from public.contas_receber cr where cr.empresa_id = v_empresa
      and (p_acao in ('contas','todos') or cr.venda_id in (select id from public.vendas where empresa_id = v_empresa));
  end if;

  if p_acao in ('vendas','todos') then
    if p_acao = 'vendas' then
      update public.tanques t
         set estoque_atual_litros = least(t.capacidade_litros, t.estoque_atual_litros + s.litros), updated_at = now()
        from (
          select tanque_id, sum(litros) litros from public.vendas
           where empresa_id = v_empresa and lower(coalesce(status::text, 'ativa')) <> 'cancelada'
           group by tanque_id
        ) s
       where t.id = s.tanque_id and t.empresa_id = v_empresa;
      delete from public.movimentacoes_tanque where empresa_id = v_empresa and tipo = 'venda';
    end if;
    if to_regclass('public.itens_venda') is not null then
      execute 'delete from public.itens_venda where venda_id in (select id from public.vendas where empresa_id = $1)' using v_empresa;
    end if;
    if to_regclass('public.itens_vendas') is not null then
      execute 'delete from public.itens_vendas where venda_id in (select id from public.vendas where empresa_id = $1)' using v_empresa;
    end if;
    if to_regclass('public.venda_itens') is not null then
      execute 'delete from public.venda_itens where venda_id in (select id from public.vendas where empresa_id = $1)' using v_empresa;
    end if;
    delete from public.movimentacoes_caixa where empresa_id = v_empresa and tipo = 'venda';
    delete from public.vendas where empresa_id = v_empresa;
  end if;

  if p_acao in ('despesas','todos') then
    delete from public.movimentacoes_caixa where empresa_id = v_empresa and tipo = 'despesa';
    delete from public.despesas where empresa_id = v_empresa;
  end if;

  if p_acao in ('caixa','todos') then
    delete from public.movimentacoes_caixa where empresa_id = v_empresa;
    delete from public.caixas where empresa_id = v_empresa;
  end if;

  if p_acao in ('estoque','todos') then
    delete from public.movimentacoes_tanque where empresa_id = v_empresa;
  end if;

  if p_acao = 'todos' then
    for v_item in select key::uuid as tanque_id, value::text::numeric as saldo from jsonb_each_text(coalesce(p_saldos_tanques, '{}'::jsonb)) loop
      if not exists (select 1 from public.tanques where id = v_item.tanque_id and empresa_id = v_empresa and v_item.saldo between 0 and capacidade_litros) then
        raise exception 'Saldo inicial inválido para um dos tanques.';
      end if;
      update public.tanques set estoque_atual_litros = v_item.saldo, updated_at = now()
       where id = v_item.tanque_id and empresa_id = v_empresa;
    end loop;
    if p_excluir_clientes then delete from public.clientes where empresa_id = v_empresa; end if;
    if p_excluir_fornecedores then delete from public.fornecedores where empresa_id = v_empresa; end if;
  end if;

  select case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='auditoria' and column_name='tabela') then 'tabela' else 'modulo' end,
         case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='auditoria' and column_name='descricao') then 'descricao' else 'detalhes' end
    into v_audit_module, v_audit_detail;
  execute format('insert into public.auditoria (empresa_id, usuario_id, %I, acao, %I, created_at) values ($1,$2,$3,$4,$5,$6)', v_audit_module, v_audit_detail)
    using v_empresa, v_user, 'sistema', 'LIMPEZA_DADOS_TESTE',
      jsonb_build_object('opcao', p_acao, 'itens_removidos', v_counts, 'clientes', p_excluir_clientes, 'fornecedores', p_excluir_fornecedores)::text,
      now();
  return v_counts;
end;
$$;

revoke all on function public.limpar_dados_teste(text,text,boolean,boolean,jsonb,boolean) from public;
grant execute on function public.limpar_dados_teste(text,text,boolean,boolean,jsonb,boolean) to authenticated;
