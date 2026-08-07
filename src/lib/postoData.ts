import { supabase } from "./supabase";

export type DbRow = Record<string, unknown> & {
  id: string;
  empresa_id?: string;
};
export type PerfilDb = DbRow & {
  nome?: string;
  email?: string;
  perfil: "administrador" | "gerente" | "frentista";
  ativo: boolean;
  empresa_id: string;
  must_change_password?: boolean;
};

export type ManageUserPayload =
  | {
      action: "create";
      nome: string;
      email: string;
      perfil: "administrador" | "gerente" | "frentista";
      ativo: boolean;
      password: string;
    }
  | { action: "reset_password"; user_id: string; password: string }
  | {
      action: "update_profile";
      user_id: string;
      nome?: string;
      perfil?: "administrador" | "gerente" | "frentista";
      ativo?: boolean;
    };

export async function gerenciarUsuario(payload: ManageUserPayload) {
  const { data, error } = await supabase.functions.invoke("manage-user", {
    body: payload,
  });
  if (error) {
    console.error("[Supabase] manage-user", error.name, error.message);
    throw new Error(
      payload.action === "create"
        ? "Não foi possível criar o usuário. Verifique os logs da função."
        : error.message || "Não foi possível gerenciar o usuário.",
    );
  }
  if (!data || data.success !== true) {
    const message = data?.error
      ? String(data.error)
      : payload.action === "create"
        ? "Não foi possível criar o usuário. Verifique os logs da função."
        : "A função não confirmou a operação.";
    throw new Error(message);
  }
  if (payload.action === "create" && !data.user_id)
    throw new Error(
      "A criação não retornou um usuário válido do Supabase Auth.",
    );
  return data as { success: true; user_id?: string };
}

export async function atualizarMeuPerfil(
  nome: string,
  telefone: string,
  avatarUrl: string | null,
) {
  const { error } = await supabase.rpc("atualizar_meu_perfil", {
    p_nome: nome,
    p_telefone: telefone || null,
    p_avatar_url: avatarUrl || null,
  });
  if (error) {
    console.error("[Supabase] atualizar_meu_perfil", error);
    throw new Error(error.message || "Não foi possível atualizar o perfil.");
  }
}

export async function enviarAvatar(
  empresaId: string,
  userId: string,
  file: File,
) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${empresaId}/${userId}/avatar-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: "3600",
  });
  if (error) {
    console.error("[Supabase] upload avatar", error.name, error.message);
    const message = error.message.toLowerCase();
    if (message.includes("bucket") && message.includes("not found"))
      throw new Error(
        "Não foi possível enviar a foto porque o armazenamento de imagens ainda não foi configurado.",
      );
    if (
      message.includes("row-level security") ||
      message.includes("permission") ||
      message.includes("unauthorized")
    )
      throw new Error("Você não tem permissão para enviar esta foto.");
    if (message.includes("mime") || message.includes("content type"))
      throw new Error("Formato inválido. Envie JPG, PNG ou WEBP.");
    if (message.includes("size") || message.includes("too large"))
      throw new Error("A imagem deve ter no máximo 5 MB.");
    throw new Error("Não foi possível enviar a foto. Tente novamente.");
  }
  return path;
}
export async function removerAvatar(path: string) {
  const { error } = await supabase.storage.from("avatars").remove([path]);
  if (error) {
    console.error("[Supabase] remover avatar", error.name, error.message);
    const message = error.message.toLowerCase();
    if (message.includes("bucket") && message.includes("not found"))
      throw new Error(
        "Não foi possível remover a foto porque o armazenamento de imagens ainda não foi configurado.",
      );
    if (
      message.includes("row-level security") ||
      message.includes("permission") ||
      message.includes("unauthorized")
    )
      throw new Error("Você não tem permissão para remover esta foto.");
    throw new Error("Não foi possível remover a foto.");
  }
}
export function urlAvatar(path?: string) {
  return path
    ? supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl
    : "";
}

const TABLES = [
  "combustiveis",
  "tanques",
  "bombas",
  "funcionarios",
  "fornecedores",
  "clientes",
  "caixas",
  "movimentacoes_caixa",
  "vendas",
  "movimentacoes_tanque",
  "contas_receber",
  "recebimentos",
  "despesas",
  "configuracoes",
  "notificacoes",
  "auditoria",
] as const;
export type TableName = (typeof TABLES)[number];
export type PagamentoBanco =
  "dinheiro" | "pix" | "cartao_debito" | "cartao_credito" | "a_prazo";
const PAGAMENTOS = {
  Dinheiro: "dinheiro",
  PIX: "pix",
  Débito: "cartao_debito",
  Crédito: "cartao_credito",
  Prazo: "a_prazo",
} as const;
export function pagamentoParaBanco(
  valor: keyof typeof PAGAMENTOS,
): PagamentoBanco {
  return PAGAMENTOS[valor];
}
export function pagamentoParaInterface(valor: string) {
  return (
    (
      {
        dinheiro: "Dinheiro",
        pix: "PIX",
        cartao_debito: "Débito",
        cartao_credito: "Crédito",
        a_prazo: "Prazo",
      } as Record<string, string>
    )[valor] ?? valor
  );
}

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

function fail(context: string, error: unknown): never {
  console.error(`[Supabase] ${context}`, error);
  throw new Error(`Não foi possível ${context.toLowerCase()}.`);
}

export async function carregarContextoUsuario(userId: string) {
  const { data: perfil, error } = await supabase
    .from("perfis")
    .select("*")
    .eq("id", userId)
    .single();
  if (error || !perfil) fail("carregar o perfil do usuário", error);
  if (!perfil.ativo || !perfil.empresa_id)
    throw new Error("Usuário inativo ou sem empresa vinculada.");
  const { data: empresa, error: empresaError } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", perfil.empresa_id)
    .single();
  if (empresaError || !empresa) fail("carregar a empresa", empresaError);
  return { perfil: perfil as PerfilDb, empresa: empresa as DbRow };
}

async function carregarTabela(table: TableName, empresaId: string) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("empresa_id", empresaId);
  if (error) fail(`carregar ${table}`, error);
  return (data ?? []) as DbRow[];
}

export async function carregarDadosPosto(empresaId: string) {
  const entries = await Promise.all(
    TABLES.map(
      async (table) => [table, await carregarTabela(table, empresaId)] as const,
    ),
  );
  const { data: perfis, error } = await supabase
    .from("perfis")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("nome");
  if (error) fail("carregar usuários", error);
  return {
    ...Object.fromEntries(entries),
    perfis: (perfis ?? []) as DbRow[],
  } as Record<TableName | "perfis", DbRow[]>;
}

export async function salvarCadastro(
  table:
    | "combustiveis"
    | "tanques"
    | "bombas"
    | "clientes"
    | "fornecedores"
    | "funcionarios",
  empresaId: string,
  values: Record<string, unknown>,
  id?: string,
) {
  const payload = { ...values, empresa_id: empresaId };
  const result = id
    ? await supabase
        .from(table)
        .update(payload)
        .eq("id", id)
        .eq("empresa_id", empresaId)
        .select()
        .single()
    : await supabase.from(table).insert(payload).select().single();
  if (result.error)
    fail(`${id ? "atualizar" : "cadastrar"} registro`, result.error);
  return result.data as DbRow;
}

export async function excluirCadastro(
  table:
    | "combustiveis"
    | "tanques"
    | "bombas"
    | "clientes"
    | "fornecedores"
    | "funcionarios",
  empresaId: string,
  id: string,
) {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq("id", id)
    .eq("empresa_id", empresaId);
  if (error) {
    console.error(`[Supabase] excluir ${table}`, error);
    if (error.code === "23503")
      throw new Error(
        "Este registro possui vínculos e não pode ser excluído. Você pode deixá-lo inativo.",
      );
    throw new Error(error.message || "Não foi possível excluir o registro.");
  }
}

export async function salvarEmpresa(
  empresaId: string,
  values: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from("empresas")
    .update(values)
    .eq("id", empresaId)
    .select()
    .single();
  if (error) {
    console.error("[Supabase] salvar empresa", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      fields: Object.keys(values),
    });
    if (
      error.code === "42501" ||
      /row-level security|permission/i.test(error.message)
    )
      throw new Error(
        "Você não tem permissão para alterar os dados desta empresa.",
      );
    if (error.code === "PGRST204" || /column|schema cache/i.test(error.message))
      throw new Error(
        "Os campos institucionais da empresa ainda não estão configurados no Supabase.",
      );
    throw new Error(
      error.message || "Não foi possível salvar as configurações da empresa.",
    );
  }
  return data as DbRow;
}

export async function salvarPerfil(
  empresaId: string,
  id: string,
  values: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from("perfis")
    .update(values)
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .select()
    .single();
  if (error) fail("salvar perfil", error);
  return data as DbRow;
}

export async function registrarMovimentacaoCaixa(
  empresaId: string,
  values: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from("movimentacoes_caixa")
    .insert({ ...values, empresa_id: empresaId })
    .select()
    .single();
  if (error) fail("registrar movimentação do caixa", error);
  return data as DbRow;
}

export async function executarRpc<T = unknown>(
  name:
    | "abrir_caixa"
    | "fechar_caixa"
    | "registrar_venda"
    | "registrar_recebimento"
    | "registrar_despesa",
  params: Record<string, unknown>,
) {
  const { data, error } = await supabase.rpc(name, params);
  if (error) {
    console.error(`[Supabase] ${name}`, error);
    throw new Error(
      error.message || `Não foi possível executar ${name.replace(/_/g, " ")}.`,
    );
  }
  return data as T;
}

export const abrirCaixa = (saldo: number, observacoes?: string) =>
  executarRpc<string>("abrir_caixa", {
    p_saldo_inicial: saldo,
    p_observacoes: observacoes || null,
  });
export const fecharCaixa = (id: string, saldo: number, observacoes?: string) =>
  executarRpc("fechar_caixa", {
    p_caixa_id: id,
    p_saldo_final: saldo,
    p_observacoes: observacoes || null,
  });
export const registrarVenda = (p: Record<string, unknown>) => {
  const required = ["p_combustivel_id", "p_tanque_id"];
  const optional = ["p_bomba_id", "p_funcionario_id", "p_cliente_id"];
  const invalid = [
    ...required.filter((key) => !isUuid(p[key])),
    ...optional.filter(
      (key) => p[key] !== null && p[key] !== undefined && !isUuid(p[key]),
    ),
  ];
  if (invalid.length) {
    console.error("[Venda] referências UUID inválidas", invalid);
    throw new Error(
      "Não foi possível concluir a venda porque um dos registros selecionados é inválido. Atualize a página e tente novamente.",
    );
  }
  return executarRpc("registrar_venda", p);
};
export const registrarRecebimento = (
  id: string,
  valor: number,
  forma: PagamentoBanco,
  observacoes?: string,
) =>
  executarRpc<string>("registrar_recebimento", {
    p_conta_receber_id: id,
    p_valor: valor,
    p_forma_pagamento: forma,
    p_observacoes: observacoes || null,
  });
export const registrarDespesa = (p: Record<string, unknown>) =>
  executarRpc<string>("registrar_despesa", p);

export type TestDataResetAction =
  "vendas" | "caixa" | "contas" | "despesas" | "estoque" | "todos";
export type TestDataResetCounts = Record<string, number>;
export async function limparDadosTeste(params: {
  action: TestDataResetAction;
  confirmation?: string;
  deleteClients?: boolean;
  deleteSuppliers?: boolean;
  tankBalances?: Record<string, number>;
  preview?: boolean;
}) {
  const { data, error } = await supabase.rpc("limpar_dados_teste", {
    p_acao: params.action,
    p_confirmacao: params.confirmation || null,
    p_excluir_clientes: Boolean(params.deleteClients),
    p_excluir_fornecedores: Boolean(params.deleteSuppliers),
    p_saldos_tanques: params.tankBalances || {},
    p_preview: params.preview !== false,
  });
  if (error) {
    console.error("[Supabase] limpar_dados_teste", error);
    throw new Error(
      error.message || "Não foi possível limpar os dados de teste.",
    );
  }
  const response = (data || {}) as Record<string, unknown>;
  const counts =
    response.removidos && typeof response.removidos === "object"
      ? (response.removidos as Record<string, unknown>)
      : response;
  return Object.fromEntries(
    Object.entries(counts)
      .filter(([, value]) => typeof value === "number")
      .map(([key, value]) => [key, Number(value)]),
  ) as TestDataResetCounts;
}

export async function limparDadosTesteSelecionados(params: {
  actions: TestDataResetAction[];
  confirmation?: string;
  deleteClients?: boolean;
  deleteSuppliers?: boolean;
  tankBalances?: Record<string, number>;
  preview?: boolean;
}) {
  const actions = Array.from(
    new Set(params.actions.filter((action) => action !== "todos")),
  );
  const { data, error } = await supabase.rpc(
    "limpar_dados_teste_selecionados",
    {
      p_acoes: actions,
      p_confirmacao: params.confirmation || null,
      p_excluir_clientes: Boolean(params.deleteClients),
      p_excluir_fornecedores: Boolean(params.deleteSuppliers),
      p_preview: params.preview !== false,
      p_saldos_tanques: params.tankBalances || {},
    },
  );
  if (error) {
    console.error("[Supabase] limpar_dados_teste_selecionados", error);
    throw new Error(
      error.message || "Não foi possível limpar os dados selecionados.",
    );
  }
  const response = (data || {}) as Record<string, unknown>;
  const counts = (response.removidos || {}) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(counts)
      .filter(([, value]) => typeof value === "number")
      .map(([key, value]) => [key, Number(value)]),
  ) as TestDataResetCounts;
}

export async function limparDadosTesteGranular(params: {
  actions: TestDataResetAction[];
  saleIds?: string[];
  allSales?: boolean;
  cashIds?: string[];
  allCash?: boolean;
  confirmation?: string;
  deleteClients?: boolean;
  deleteSuppliers?: boolean;
  tankBalances?: Record<string, number>;
  preview?: boolean;
}) {
  const { data, error } = await supabase.rpc("limpar_dados_teste_granular", {
    p_acoes: params.actions,
    p_venda_ids: params.saleIds || [],
    p_todas_vendas: Boolean(params.allSales),
    p_caixa_ids: params.cashIds || [],
    p_todos_caixas: Boolean(params.allCash),
    p_confirmacao: params.confirmation || null,
    p_excluir_clientes: Boolean(params.deleteClients),
    p_excluir_fornecedores: Boolean(params.deleteSuppliers),
    p_preview: params.preview !== false,
    p_saldos_tanques: params.tankBalances || {},
  });
  if (error) {
    console.error("[Supabase] limpar_dados_teste_granular", error);
    throw new Error(
      error.message || "Não foi possível limpar os registros selecionados.",
    );
  }
  const response = (data || {}) as Record<string, unknown>;
  return (response.removidos || {}) as TestDataResetCounts;
}

export async function cancelarVenda(vendaId: string, motivo?: string) {
  const { error } = await supabase.rpc("cancelar_venda", {
    p_venda_id: vendaId,
    p_motivo: motivo?.trim() || null,
  });
  if (error) {
    console.error("[Supabase] cancelar_venda", error);
    throw new Error(error.message || "Não foi possível cancelar a venda.");
  }
}

export async function registrarEntradaCombustivel(
  tanqueId: string,
  litros: number,
  observacoes?: string,
) {
  const { data, error } = await supabase.rpc("registrar_entrada_combustivel", {
    p_tanque_id: tanqueId,
    p_litros: litros,
    p_observacoes: observacoes?.trim() || null,
  });
  if (error) {
    console.error("[Supabase] registrar_entrada_combustivel", error);
    throw new Error(
      error.message || "Não foi possível registrar a entrada de combustível.",
    );
  }
  return Number(data);
}
export async function ajustarEstoqueTanque(
  tanqueId: string,
  estoqueAtual: number,
  observacoes?: string,
) {
  const { data, error } = await supabase.rpc("ajustar_estoque_tanque", {
    p_tanque_id: tanqueId,
    p_estoque_atual: estoqueAtual,
    p_observacoes: observacoes?.trim() || null,
  });
  if (error) {
    console.error("[Supabase] ajustar_estoque_tanque", error);
    throw new Error(error.message || "Não foi possível ajustar o estoque.");
  }
  return Number(data);
}
