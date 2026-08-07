alter table public.empresas
  add column if not exists nome_fantasia text,
  add column if not exists razao_social text,
  add column if not exists cnpj text,
  add column if not exists endereco text,
  add column if not exists bairro text,
  add column if not exists cidade text,
  add column if not exists estado text,
  add column if not exists cep text;

alter table public.empresas enable row level security;

drop policy if exists "empresas_update_admin_own" on public.empresas;
create policy "empresas_update_admin_own"
on public.empresas
for update
to authenticated
using (
  exists (
    select 1
    from public.perfis p
    where p.id = auth.uid()
      and p.ativo = true
      and p.empresa_id = empresas.id
      and lower(p.perfil::text) = 'administrador'
  )
)
with check (
  exists (
    select 1
    from public.perfis p
    where p.id = auth.uid()
      and p.ativo = true
      and p.empresa_id = empresas.id
      and lower(p.perfil::text) = 'administrador'
  )
);

notify pgrst, 'reload schema';
