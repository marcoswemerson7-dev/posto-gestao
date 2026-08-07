create or replace function public.limpar_dados_teste_selecionados(
  p_acoes text[],
  p_confirmacao text,
  p_excluir_clientes boolean default false,
  p_excluir_fornecedores boolean default false,
  p_preview boolean default true,
  p_saldos_tanques jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_allowed constant text[] := array['vendas','caixa','contas','despesas','estoque'];
  v_actions text[];
  v_action text;
  v_result jsonb;
  v_counts jsonb := '{}'::jsonb;
  v_key text;
  v_value jsonb;
begin
  select coalesce(array_agg(distinct lower(trim(action))), '{}'::text[])
    into v_actions
    from unnest(coalesce(p_acoes, '{}'::text[])) action
   where lower(trim(action)) = any(v_allowed);

  if cardinality(v_actions) = 0 then
    raise exception 'Selecione pelo menos uma categoria para limpar.';
  end if;
  if not p_preview and p_confirmacao is distinct from 'ZERAR DADOS' then
    raise exception 'Digite ZERAR DADOS para confirmar a limpeza.';
  end if;

  -- Todas as categorias usam a ação total existente, preservando uma única auditoria.
  if v_allowed <@ v_actions then
    return public.limpar_dados_teste(
      'todos', p_confirmacao, p_excluir_clientes, p_excluir_fornecedores,
      p_preview, p_saldos_tanques
    );
  end if;

  -- A função externa forma uma única transação: qualquer falha reverte todas as ações.
  foreach v_action in array array['vendas','contas','despesas','caixa','estoque'] loop
    if v_action = any(v_actions) then
      v_result := public.limpar_dados_teste(
        v_action, p_confirmacao, false, false, p_preview, '{}'::jsonb
      );
      for v_key, v_value in select key, value from jsonb_each(coalesce(v_result->'removidos', v_result)) loop
        if jsonb_typeof(v_value) = 'number' then
          v_counts := jsonb_set(
            v_counts,
            array[v_key],
            to_jsonb(coalesce((v_counts->>v_key)::numeric, 0) + (v_value::text)::numeric),
            true
          );
        end if;
      end loop;
    end if;
  end loop;

  return jsonb_build_object(
    'success', true,
    'preview', p_preview,
    'acoes', to_jsonb(v_actions),
    'removidos', v_counts
  );
end;
$$;

revoke all on function public.limpar_dados_teste_selecionados(text[],text,boolean,boolean,boolean,jsonb) from public;
revoke all on function public.limpar_dados_teste_selecionados(text[],text,boolean,boolean,boolean,jsonb) from anon;
grant execute on function public.limpar_dados_teste_selecionados(text[],text,boolean,boolean,boolean,jsonb) to authenticated;

notify pgrst, 'reload schema';
