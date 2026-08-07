create or replace function public.limpar_dados_teste_granular(
  p_acoes text[],
  p_venda_ids uuid[] default '{}'::uuid[],
  p_todas_vendas boolean default false,
  p_caixa_ids uuid[] default '{}'::uuid[],
  p_todos_caixas boolean default false,
  p_confirmacao text default null,
  p_excluir_clientes boolean default false,
  p_excluir_fornecedores boolean default false,
  p_preview boolean default true,
  p_saldos_tanques jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_empresa uuid;
  v_role text;
  v_enabled boolean;
  v_actions text[];
  v_whole_actions text[];
  v_sales uuid[];
  v_cash uuid[];
  v_result jsonb;
  v_counts jsonb;
  v_key text;
  v_value jsonb;
  v_requested_sales integer;
  v_requested_cash integer;
  v_module text;
  v_detail text;
begin
  select p.empresa_id,lower(p.perfil::text),e.allow_test_data_reset
    into v_empresa,v_role,v_enabled
    from public.perfis p join public.empresas e on e.id=p.empresa_id
   where p.id=v_user and p.ativo=true;
  if v_empresa is null or v_role<>'administrador' then raise exception 'Somente administrador pode limpar dados de teste.' using errcode='42501'; end if;
  if not coalesce(v_enabled,false) then raise exception 'A limpeza de dados de teste está desativada para esta empresa.' using errcode='42501'; end if;

  select coalesce(array_agg(distinct lower(trim(x))),'{}'::text[]) into v_actions
    from unnest(coalesce(p_acoes,'{}'::text[])) x
   where lower(trim(x))=any(array['vendas','caixa','contas','despesas','estoque']);
  select coalesce(array_agg(id),'{}'::uuid[]) into v_sales from public.vendas where empresa_id=v_empresa and id=any(coalesce(p_venda_ids,'{}'::uuid[]));
  select coalesce(array_agg(id),'{}'::uuid[]) into v_cash from public.caixas where empresa_id=v_empresa and id=any(coalesce(p_caixa_ids,'{}'::uuid[]));
  select count(distinct id) into v_requested_sales from unnest(coalesce(p_venda_ids,'{}'::uuid[])) id;
  select count(distinct id) into v_requested_cash from unnest(coalesce(p_caixa_ids,'{}'::uuid[])) id;
  if cardinality(v_sales)<>v_requested_sales then raise exception 'Uma das vendas selecionadas não pertence à empresa atual.' using errcode='42501'; end if;
  if cardinality(v_cash)<>v_requested_cash then raise exception 'Um dos caixas selecionados não pertence à empresa atual.' using errcode='42501'; end if;
  v_whole_actions:=array_remove(array_remove(v_actions,'vendas'),'caixa');
  if p_todas_vendas and 'vendas'=any(v_actions) then v_whole_actions:=array_append(v_whole_actions,'vendas'); end if;
  if p_todos_caixas and 'caixa'=any(v_actions) then v_whole_actions:=array_append(v_whole_actions,'caixa'); end if;

  if cardinality(v_whole_actions)=0 and cardinality(v_sales)=0 and cardinality(v_cash)=0 then
    raise exception 'Selecione pelo menos um registro para excluir.';
  end if;
  if not p_preview and p_confirmacao is distinct from 'ZERAR DADOS' then raise exception 'Digite ZERAR DADOS para confirmar a limpeza.'; end if;

  v_counts:=jsonb_build_object(
    'vendas',case when p_todas_vendas and 'vendas'=any(v_actions) then (select count(*) from public.vendas where empresa_id=v_empresa) else cardinality(v_sales) end,
    'caixas',case when p_todos_caixas and 'caixa'=any(v_actions) then (select count(*) from public.caixas where empresa_id=v_empresa) else cardinality(v_cash) end
  );
  if cardinality(v_whole_actions)>0 then
    v_result:=public.limpar_dados_teste_selecionados(v_whole_actions,p_confirmacao,p_excluir_clientes,p_excluir_fornecedores,true,p_saldos_tanques);
    for v_key,v_value in select key,value from jsonb_each(coalesce(v_result->'removidos','{}'::jsonb)) loop
      if jsonb_typeof(v_value)='number' then
        v_counts:=jsonb_set(v_counts,array[v_key],to_jsonb(coalesce((v_counts->>v_key)::numeric,0)+(v_value::text)::numeric),true);
      end if;
    end loop;
  end if;
  if p_preview then return jsonb_build_object('success',true,'preview',true,'removidos',v_counts); end if;

  if cardinality(v_sales)>0 and not p_todas_vendas then
    delete from public.recebimentos r where r.empresa_id=v_empresa and exists(select 1 from public.contas_receber cr where cr.id=r.conta_receber_id and cr.empresa_id=v_empresa and cr.venda_id=any(v_sales));
    delete from public.notificacoes where empresa_id=v_empresa and referencia_id in(select id from public.contas_receber where empresa_id=v_empresa and venda_id=any(v_sales));
    delete from public.contas_receber where empresa_id=v_empresa and venda_id=any(v_sales);
    if to_regclass('public.itens_venda') is not null then execute 'delete from public.itens_venda where venda_id=any($1)' using v_sales; end if;
    if to_regclass('public.itens_vendas') is not null then execute 'delete from public.itens_vendas where venda_id=any($1)' using v_sales; end if;
    if to_regclass('public.venda_itens') is not null then execute 'delete from public.venda_itens where venda_id=any($1)' using v_sales; end if;
    update public.tanques t set estoque_atual_litros=least(t.capacidade_litros,t.estoque_atual_litros+s.litros),updated_at=now()
      from(select tanque_id,sum(litros) litros from public.vendas where empresa_id=v_empresa and id=any(v_sales) and lower(coalesce(status::text,'ativa'))<>'cancelada' group by tanque_id)s
     where t.id=s.tanque_id and t.empresa_id=v_empresa;
    delete from public.movimentacoes_caixa where empresa_id=v_empresa and referencia_id=any(v_sales);
    delete from public.vendas where empresa_id=v_empresa and id=any(v_sales);
  end if;
  if cardinality(v_cash)>0 and not p_todos_caixas then
    delete from public.movimentacoes_caixa where empresa_id=v_empresa and caixa_id=any(v_cash);
    delete from public.caixas where empresa_id=v_empresa and id=any(v_cash);
  end if;
  if cardinality(v_whole_actions)>0 then
    v_result:=public.limpar_dados_teste_selecionados(v_whole_actions,p_confirmacao,p_excluir_clientes,p_excluir_fornecedores,false,p_saldos_tanques);
  end if;

  select case when exists(select 1 from information_schema.columns where table_schema='public' and table_name='auditoria' and column_name='tabela') then 'tabela' else 'modulo' end,
         case when exists(select 1 from information_schema.columns where table_schema='public' and table_name='auditoria' and column_name='descricao') then 'descricao' else 'detalhes' end into v_module,v_detail;
  execute format('insert into public.auditoria(empresa_id,usuario_id,%I,acao,%I,created_at) values($1,$2,$3,$4,$5,$6)',v_module,v_detail)
    using v_empresa,v_user,'sistema','LIMPEZA_DADOS_TESTE_GRANULAR',jsonb_build_object('vendas',cardinality(v_sales),'caixas',cardinality(v_cash),'categorias',v_whole_actions)::text,now();
  return jsonb_build_object('success',true,'preview',false,'removidos',v_counts);
end;
$$;

revoke all on function public.limpar_dados_teste_granular(text[],uuid[],boolean,uuid[],boolean,text,boolean,boolean,boolean,jsonb) from public;
revoke all on function public.limpar_dados_teste_granular(text[],uuid[],boolean,uuid[],boolean,text,boolean,boolean,boolean,jsonb) from anon;
grant execute on function public.limpar_dados_teste_granular(text[],uuid[],boolean,uuid[],boolean,text,boolean,boolean,boolean,jsonb) to authenticated;
notify pgrst, 'reload schema';
