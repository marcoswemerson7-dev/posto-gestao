import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, CheckCheck, X } from "lucide-react";
import {
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  SystemNotification,
} from "../../lib/notifications";

type Filter = "todas" | "nao_lidas" | "vencida" | "hoje" | "proxima";
type Props = {
  role: string;
  refreshKey: string;
  onOpenReceivable: (id: string) => void;
};
const money = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (v: string) =>
  v ? new Date(`${v}T12:00:00`).toLocaleDateString("pt-BR") : "-";
function detail(item: SystemNotification) {
  if (item.situation === "vencida") return `Venceu em ${date(item.due)}`;
  if (item.situation === "hoje") return "Vence hoje";
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const days = Math.max(
    1,
    Math.round(
      (new Date(`${item.due}T12:00:00`).getTime() - now.getTime()) / 86400000,
    ),
  );
  return `Vence em ${days} ${days === 1 ? "dia" : "dias"}`;
}

export default function NotificationBell({
  role,
  refreshKey,
  onOpenReceivable,
}: Props) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [items, setItems] = useState<SystemNotification[]>([]);
  const [open, setOpen] = useState(false),
    [allOpen, setAllOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("todas"),
    [loading, setLoading] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const allowed = ["Administrador", "Gerente"].includes(role);
  async function refresh() {
    if (!allowed) return setItems([]);
    setLoading(true);
    try {
      setItems(await loadNotifications());
    } catch (error) {
      console.error("Notificações", error);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const find = () =>
      setTarget(document.getElementById("notification-bell-root"));
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    void refresh();
  }, [allowed, refreshKey]);
  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setAllOpen(false);
      }
    };
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", key);
    };
  }, []);
  const unread = items.filter((x) => !x.read).length;
  const filtered = useMemo(
    () =>
      items.filter(
        (x) =>
          filter === "todas" ||
          (filter === "nao_lidas" ? !x.read : x.situation === filter),
      ),
    [items, filter],
  );
  async function read(item: SystemNotification) {
    if (!item.read) {
      await markNotificationRead(item.id);
      setItems((list) =>
        list.map((x) => (x.id === item.id ? { ...x, read: true } : x)),
      );
    }
    setOpen(false);
    setAllOpen(false);
    onOpenReceivable(item.referenceId);
  }
  async function readAll() {
    await markAllNotificationsRead();
    setItems((list) => list.map((x) => ({ ...x, read: true })));
  }
  const list = (rows: SystemNotification[]) => (
    <div className="notification-list">
      {loading && (
        <div className="notification-empty">Atualizando notificações...</div>
      )}
      {!loading && !rows.length && (
        <div className="notification-empty">
          <Bell size={24} />
          Nenhuma notificação ativa.
        </div>
      )}
      {rows.map((item) => (
        <button
          key={item.id}
          className={`notification-item ${item.situation} ${item.read ? "" : "unread"}`}
          onClick={() => void read(item)}
        >
          <span className="notification-tone" />
          <span className="notification-copy">
            <strong>{item.title}</strong>
            <b>{item.clientName}</b>
            <span>{money(item.value)}</span>
            <small>{detail(item)}</small>
          </span>
          {!item.read && <i />}
        </button>
      ))}
    </div>
  );
  if (!target) return null;
  return createPortal(
    <div className="notification-bell-wrap" ref={root}>
      <button
        className="dashboard-bell"
        aria-label="Notificações"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          if (!open) void refresh();
        }}
      >
        <Bell size={21} />
        {unread > 0 && <span>{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div className="notification-dropdown">
          <div className="notification-head">
            <div>
              <strong>Notificações</strong>
              <small>
                {unread} não {unread === 1 ? "lida" : "lidas"}
              </small>
            </div>
            <button disabled={!unread} onClick={() => void readAll()}>
              <CheckCheck size={15} /> Marcar todas como lidas
            </button>
          </div>
          {list(items.slice(0, 15))}
          <button
            className="notification-view-all"
            onClick={() => {
              setOpen(false);
              setAllOpen(true);
            }}
          >
            Ver todas as notificações
          </button>
        </div>
      )}
      {allOpen &&
        createPortal(
          <div className="modal-backdrop" onMouseDown={() => setAllOpen(false)}>
            <div
              className="modal notification-modal"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="modal-head">
                <div>
                  <h2>Todas as notificações</h2>
                  <p>Avisos financeiros ativos da empresa.</p>
                </div>
                <button
                  className="round-button sm"
                  onClick={() => setAllOpen(false)}
                >
                  <X size={17} />
                </button>
              </div>
              <div className="notification-filters">
                {(
                  [
                    ["todas", "Todas"],
                    ["nao_lidas", "Não lidas"],
                    ["vencida", "Vencidas"],
                    ["hoje", "Hoje"],
                    ["proxima", "Próximas"],
                  ] as [Filter, string][]
                ).map(([v, l]) => (
                  <button
                    className={filter === v ? "active" : ""}
                    key={v}
                    onClick={() => setFilter(v)}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {list(filtered)}
            </div>
          </div>,
          document.body,
        )}
    </div>,
    target,
  );
}
