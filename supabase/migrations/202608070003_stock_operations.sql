create or replace function public.registrar_entrada_combustivel(
  p_tanque_id uuid,
  p_litros numeric,
  p_observacoes text default null
) returns numeric
language plpgsql security definer set search_path=public as $$
declare
  v_empresa_id uuid;
  v_anterior numeric;
  v_novo numeric;
  v_capacidade numeric;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.'; end if;
  select empresa_id into v_empresa_id from public.perfis
    where id=auth.uid() and ativo=true;
  if v_empresa_id is null then raise exception 'Usuário não está vinculado a uma empresa ativa.'; end if;
  if p_litros is null or p_litros<=0 then raise exception 'Informe uma quantidade de litros maior que zero.'; end if;

  select estoque_atual_litros,capacidade_litros into v_anterior,v_capacidade
    from public.tanques where id=p_tanque_id and empresa_id=v_empresa_id and ativo=true for update;
  if not found then raise exception 'Tanque não encontrado ou inativo.'; end if;
  v_novo:=coalesce(v_anterior,0)+p_litros;
  if v_novo>v_capacidade then raise exception 'A entrada ultrapassa a capacidade do tanque. Capacidade: % litros.',v_capacidade; end if;

  insert into public.movimentacoes_tanque
    (empresa_id,tanque_id,tipo,litros,estoque_anterior,estoque_posterior,observacoes,usuario_id)
  values(v_empresa_id,p_tanque_id,'entrada',p_litros,coalesce(v_anterior,0),v_novo,nullif(trim(p_observacoes),''),auth.uid());
  if (select estoque_atual_litros from public.tanques where id=p_tanque_id)=coalesce(v_anterior,0) then
    update public.tanques set estoque_atual_litros=v_novo,updated_at=now() where id=p_tanque_id and empresa_id=v_empresa_id;
  elsif (select estoque_atual_litros from public.tanques where id=p_tanque_id)<>v_novo then
    raise exception 'O saldo do tanque foi alterado de forma inesperada durante a entrada.';
  end if;
  return v_novo;
end; $$;

create or replace function public.ajustar_estoque_tanque(
  p_tanque_id uuid,
  p_estoque_atual numeric,
  p_observacoes text default null
) returns numeric
language plpgsql security definer set search_path=public as $$
declare
  v_empresa_id uuid;
  v_anterior numeric;
  v_capacidade numeric;
  v_diferenca numeric;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.'; end if;
  select empresa_id into v_empresa_id from public.perfis
    where id=auth.uid() and ativo=true;
  if v_empresa_id is null then raise exception 'Usuário não está vinculado a uma empresa ativa.'; end if;
  if p_estoque_atual is null or p_estoque_atual<0 then raise exception 'O estoque físico não pode ser negativo.'; end if;

  select estoque_atual_litros,capacidade_litros into v_anterior,v_capacidade
    from public.tanques where id=p_tanque_id and empresa_id=v_empresa_id and ativo=true for update;
  if not found then raise exception 'Tanque não encontrado ou inativo.'; end if;
  if p_estoque_atual>v_capacidade then raise exception 'O estoque informado ultrapassa a capacidade do tanque. Capacidade: % litros.',v_capacidade; end if;
  v_diferenca:=p_estoque_atual-coalesce(v_anterior,0);

  insert into public.movimentacoes_tanque
    (empresa_id,tanque_id,tipo,litros,estoque_anterior,estoque_posterior,observacoes,usuario_id)
  values(v_empresa_id,p_tanque_id,'ajuste',v_diferenca,coalesce(v_anterior,0),p_estoque_atual,nullif(trim(p_observacoes),''),auth.uid());
  if (select estoque_atual_litros from public.tanques where id=p_tanque_id)=coalesce(v_anterior,0) then
    update public.tanques set estoque_atual_litros=p_estoque_atual,updated_at=now() where id=p_tanque_id and empresa_id=v_empresa_id;
  elsif (select estoque_atual_litros from public.tanques where id=p_tanque_id)<>p_estoque_atual then
    raise exception 'O saldo do tanque foi alterado de forma inesperada durante o ajuste.';
  end if;
  return p_estoque_atual;
end; $$;

revoke all on function public.registrar_entrada_combustivel(uuid,numeric,text) from public;
revoke all on function public.ajustar_estoque_tanque(uuid,numeric,text) from public;
grant execute on function public.registrar_entrada_combustivel(uuid,numeric,text) to authenticated;
grant execute on function public.ajustar_estoque_tanque(uuid,numeric,text) to authenticated;
