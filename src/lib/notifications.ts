import { supabase } from "./supabase";

export type SystemNotification = {
  id: string;
  title: string;
  clientName: string;
  value: number;
  due: string;
  situation: "vencida" | "hoje" | "proxima";
  referenceId: string;
  read: boolean;
  createdAt: string;
};

const mapNotification = (row: Record<string, unknown>): SystemNotification => ({
  id: String(row.id),
  title: String(row.titulo || "Notificação"),
  clientName: String(
    row.cliente_nome || row.mensagem || "Cliente não informado",
  ),
  value: Number(row.valor || 0),
  due: String(row.vencimento || ""),
  situation: String(
    row.situacao || "proxima",
  ) as SystemNotification["situation"],
  referenceId: String(row.referencia_id || ""),
  read: Boolean(row.lida),
  createdAt: String(row.created_at || ""),
});

export async function loadNotifications() {
  const sync = await supabase.rpc("sincronizar_notificacoes_contas");
  if (sync.error) {
    console.error("[Supabase] sincronizar notificações", sync.error);
    throw new Error("Não foi possível atualizar as notificações.");
  }
  const { data, error } = await supabase
    .from("notificacoes")
    .select(
      "id,titulo,mensagem,cliente_nome,valor,vencimento,situacao,referencia_id,lida,created_at",
    )
    .eq("resolvida", false)
    .order("vencimento", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("[Supabase] carregar notificações", error);
    throw new Error("Não foi possível carregar as notificações.");
  }
  return (data || []).map(mapNotification);
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from("notificacoes")
    .update({ lida: true, read_at: new Date().toISOString() })
    .eq("id", id);
  if (error)
    throw new Error("Não foi possível marcar a notificação como lida.");
}

export async function markAllNotificationsRead() {
  const { error } = await supabase
    .from("notificacoes")
    .update({ lida: true, read_at: new Date().toISOString() })
    .eq("resolvida", false)
    .eq("lida", false);
  if (error)
    throw new Error("Não foi possível marcar as notificações como lidas.");
}
