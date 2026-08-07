import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  WalletCards,
  Fuel,
  Users,
  BadgeDollarSign,
  ReceiptText,
  Warehouse,
  Truck,
  UserRoundCog,
  BarChart3,
  ShieldCheck,
  Settings,
  LogOut,
  CircleDollarSign,
  Plus,
  Search,
  X,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  CreditCard,
  Smartphone,
  Gauge,
  Pencil,
  Trash2,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  LockKeyhole,
  Mail,
  Eye,
  EyeOff,
  Menu,
  UserCog,
  FileText,
  Droplets,
  CalendarDays,
  PackageCheck,
  Download,
  SlidersHorizontal,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Printer,
  CirclePlus,
} from "lucide-react";

import LoginPage from "./pages/LoginPage";
import UserAccountMenu from "./components/account/UserAccountMenu";
import NotificationBell from "./components/notifications/NotificationBell";
import TestDataCleanup from "./components/admin/TestDataCleanup";
import PdfReportButton from "./components/reports/PdfReportButton";
import { cashPdf } from "./lib/pdf/reports";
import { supabase } from "./lib/supabase";
import {
  abrirCaixa,
  ajustarEstoqueTanque,
  cancelarVenda,
  carregarContextoUsuario,
  carregarDadosPosto,
  fecharCaixa,
  excluirCadastro,
  gerenciarUsuario,
  isUuid,
  pagamentoParaBanco,
  pagamentoParaInterface,
  registrarDespesa,
  registrarEntradaCombustivel,
  registrarMovimentacaoCaixa,
  registrarRecebimento,
  registrarVenda,
  salvarCadastro,
  salvarEmpresa,
} from "./lib/postoData";

type Page =
  | "Dashboard"
  | "Caixa"
  | "Vendas"
  | "Combustíveis"
  | "Estoque"
  | "Clientes"
  | "Contas a Receber"
  | "Despesas"
  | "Fornecedores"
  | "Funcionários"
  | "Relatórios"
  | "Usuários"
  | "Auditoria"
  | "Configurações";
type PaymentMethod = "Dinheiro" | "PIX" | "Débito" | "Crédito" | "Prazo";
type Role = "Administrador" | "Gerente" | "Frentista";

type Client = {
  id: string;
  name: string;
  doc: string;
  phone: string;
  limit: number;
  status: "Ativo" | "Bloqueado" | "Inativo";
  notes: string;
};
type FuelItem = {
  id: string;
  name: string;
  sellPrice: number;
  costPrice: number;
  min: number;
  active: boolean;
};
type Tank = {
  id: string;
  name: string;
  fuelId: string;
  capacity: number;
  liters: number;
};
type Pump = { id: string; name: string; tankId: string; active: boolean };
type Sale = {
  id: string;
  date: string;
  clientId?: string;
  employeeId?: string;
  fuelId: string;
  tankId: string;
  pumpId?: string;
  liters: number;
  price: number;
  total: number;
  payment: PaymentMethod;
  status: "Ativa" | "Cancelada";
};
type Receivable = {
  id: string;
  saleId: string;
  clientId: string;
  original: number;
  paid: number;
  due: string;
  status: "Em aberto" | "Parcial" | "Pago" | "Cancelado";
};
type CashSession = {
  id: string;
  openedAt: string;
  closedAt?: string;
  opening: number;
  closingDeclared?: number;
  status: "Aberto" | "Fechado";
  operator: string;
};
type CashMove = {
  id: string;
  cashId: string;
  date: string;
  type:
    | "Venda"
    | "Recebimento"
    | "Entrada"
    | "Saída"
    | "Sangria"
    | "Suprimento"
    | "Despesa";
  value: number;
  method?: PaymentMethod;
  description: string;
  refId?: string;
};
type Expense = {
  id: string;
  date: string;
  category: string;
  description: string;
  value: number;
  method: PaymentMethod;
  supplierId?: string;
};
type Supplier = {
  id: string;
  name: string;
  doc: string;
  phone: string;
  contact: string;
};
type Employee = {
  id: string;
  name: string;
  doc: string;
  phone: string;
  role: string;
  active: boolean;
};
type AppUser = {
  id: string;
  empresaId: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  mustChange?: boolean;
  phone?: string;
  jobTitle?: string;
  avatarPath?: string;
  createdAt?: string;
};
type Audit = {
  id: string;
  date: string;
  user: string;
  module: string;
  action: string;
  detail: string;
};
type StockMove = {
  id: string;
  date: string;
  tankId: string;
  type: "Entrada" | "Venda" | "Ajuste" | "Cancelamento";
  liters: number;
  description: string;
};
type State = {
  stationName: string;
  legalName: string;
  cnpj: string;
  address: string;
  neighborhood: string;
  municipality: string;
  stateCode: string;
  zipCode: string;
  city: string;
  allowTestDataReset: boolean;
  clients: Client[];
  fuels: FuelItem[];
  tanks: Tank[];
  pumps: Pump[];
  sales: Sale[];
  receivables: Receivable[];
  cashSessions: CashSession[];
  cashMoves: CashMove[];
  expenses: Expense[];
  suppliers: Supplier[];
  employees: Employee[];
  users: AppUser[];
  audits: Audit[];
  stockMoves: StockMove[];
};

const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const nowIso = () => new Date().toISOString();
const money = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const liters = (v: number) =>
  `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 3 })} L`;
const dateBR = (v: string) =>
  new Date(v).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
const dayISO = (days = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const emptyState: State = {
  stationName: "",
  legalName: "",
  cnpj: "",
  address: "",
  neighborhood: "",
  municipality: "",
  stateCode: "",
  zipCode: "",
  city: "",
  allowTestDataReset: false,
  clients: [],
  fuels: [],
  tanks: [],
  pumps: [],
  sales: [],
  receivables: [],
  cashSessions: [],
  cashMoves: [],
  expenses: [],
  suppliers: [],
  employees: [],
  users: [],
  audits: [],
  stockMoves: [],
};

const nav: [Page, any][] = [
  ["Dashboard", LayoutDashboard],
  ["Caixa", WalletCards],
  ["Vendas", CircleDollarSign],
  ["Combustíveis", Fuel],
  ["Estoque", Warehouse],
  ["Clientes", Users],
  ["Contas a Receber", BadgeDollarSign],
  ["Despesas", ReceiptText],
  ["Fornecedores", Truck],
  ["Funcionários", UserRoundCog],
  ["Relatórios", BarChart3],
  ["Usuários", UserCog],
  ["Auditoria", ShieldCheck],
  ["Configurações", Settings],
];

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: any;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="round-button sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <FileText size={32} />
      <b>Nenhum registro</b>
      <span>{text}</span>
    </div>
  );
}
function Header({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: any;
}) {
  return (
    <div className="page-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
function Card({ title, value, sub, icon: Icon, tone = "green" }: any) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon size={21} />
      </div>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{sub}</small>
      </div>
    </div>
  );
}
function Toolbar({
  search,
  setSearch,
  button,
  onClick,
}: {
  search: string;
  setSearch: (v: string) => void;
  button?: string;
  onClick?: () => void;
}) {
  return (
    <div className="toolbar">
      <div className="search">
        <Search size={18} />
        <input
          placeholder="Pesquisar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {button && (
        <button className="primary-button compact" onClick={onClick}>
          <Plus size={17} />
          {button}
        </button>
      )}
    </div>
  );
}
function Status({
  children,
  tone = "green",
}: {
  children: any;
  tone?: string;
}) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

function AppShell({
  state,
  setState,
  user,
  onLogout,
  refresh,
}: {
  state: State;
  setState: React.Dispatch<React.SetStateAction<State>>;
  user: AppUser;
  onLogout: () => void;
  refresh: () => Promise<void>;
}) {
  const [page, setPage] = useState<Page>("Dashboard");
  const [mobile, setMobile] = useState(false);
  const [focusedReceivable, setFocusedReceivable] = useState("");
  const allowedNav =
    user.role === "Frentista"
      ? nav.filter(([label]) =>
          ["Dashboard", "Caixa", "Vendas"].includes(label),
        )
      : nav;
  const audit = (module: string, action: string, detail: string) =>
    setState((s) => ({
      ...s,
      audits: [
        { id: uid(), date: nowIso(), user: user.name, module, action, detail },
        ...s.audits,
      ],
    }));
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "show" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">
            <Fuel size={24} />
          </div>
          <div>
            <strong>{state.stationName}</strong>
            <small>Gestão do Posto</small>
          </div>
        </div>
        <nav>
          {allowedNav.map(([label, Icon]) => (
            <button
              key={label}
              className={`nav-item ${page === label ? "active" : ""}`}
              onClick={() => {
                setPage(label);
                setMobile(false);
              }}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <button className="nav-item logout" onClick={onLogout}>
          <LogOut size={19} />
          <span>Sair</span>
        </button>
      </aside>
      <main className="content">
        <div className="mobile-top">
          <button className="round-button" onClick={() => setMobile(!mobile)}>
            <Menu size={20} />
          </button>
          <strong>{state.stationName}</strong>
        </div>
        <UserAccountMenu
          user={user}
          companyName={state.stationName}
          onLogout={onLogout}
          onUpdated={refresh}
        />
        <NotificationBell
          role={user.role}
          refreshKey={state.receivables
            .map((item) => `${item.id}:${item.status}:${item.paid}:${item.due}`)
            .join("|")}
          onOpenReceivable={(id) => {
            setFocusedReceivable(id);
            setPage("Contas a Receber");
          }}
        />
        {page === "Dashboard" && <Dashboard state={state} setPage={setPage} />}{" "}
        {page === "Caixa" && (
          <CashModern state={state} user={user} refresh={refresh} />
        )}{" "}
        {page === "Vendas" && (
          <Sales state={state} refresh={refresh} user={user} />
        )}{" "}
        {page === "Combustíveis" && (
          <Fuels state={state} user={user} refresh={refresh} />
        )}{" "}
        {page === "Estoque" && (
          <Stock state={state} user={user} refresh={refresh} />
        )}{" "}
        {page === "Clientes" && (
          <Clients state={state} user={user} refresh={refresh} />
        )}{" "}
        {page === "Contas a Receber" && (
          <Receivables
            state={state}
            refresh={refresh}
            user={user}
            focusedId={focusedReceivable}
            onFocusHandled={() => setFocusedReceivable("")}
          />
        )}{" "}
        {page === "Despesas" && (
          <Expenses state={state} refresh={refresh} user={user} />
        )}{" "}
        {page === "Fornecedores" && (
          <Suppliers state={state} user={user} refresh={refresh} />
        )}{" "}
        {page === "Funcionários" && (
          <Employees state={state} user={user} refresh={refresh} />
        )}{" "}
        {page === "Relatórios" && <Reports state={state} user={user} />}{" "}
        {page === "Usuários" && (
          <UsersPage state={state} refresh={refresh} currentUser={user} />
        )}{" "}
        {page === "Auditoria" && <AuditPage state={state} />}{" "}
        {page === "Configurações" && (
          <SettingsPage
            state={state}
            setState={setState}
            audit={audit}
            user={user}
            refresh={refresh}
          />
        )}
      </main>
    </div>
  );
}

function Dashboard({
  state,
  setPage,
}: {
  state: State;
  setPage: (p: Page) => void;
}) {
  const activeCash = state.cashSessions.find((c) => c.status === "Aberto");
  const today = dayISO();
  const todaySales = state.sales.filter(
    (s) => s.status === "Ativa" && s.date.slice(0, 10) === today,
  );
  const total = todaySales.reduce((a, b) => a + b.total, 0);
  const sold = todaySales.reduce((a, b) => a + b.liters, 0);
  const due = state.receivables
    .filter((r) => r.status !== "Pago" && r.status !== "Cancelado")
    .reduce((a, b) => a + (b.original - b.paid), 0);
  const cashValue = activeCash
    ? activeCash.opening +
      state.cashMoves
        .filter((m) => m.cashId === activeCash.id)
        .reduce(
          (a, m) =>
            a +
            (["Saída", "Sangria", "Despesa"].includes(m.type)
              ? -m.value
              : m.value),
          0,
        )
    : 0;
  return (
    <>
      <Header
        eyebrow="VISÃO GERAL"
        title="Dashboard"
        subtitle="Resumo operacional em tempo real."
      />
      <section className="stats-grid">
        <Card
          title="Caixa atual"
          value={activeCash ? money(cashValue) : "Fechado"}
          sub={
            activeCash
              ? `Aberto ${dateBR(activeCash.openedAt)}`
              : "Abra um caixa"
          }
          icon={WalletCards}
        />
        <Card
          title="Vendas de hoje"
          value={money(total)}
          sub={`${todaySales.length} vendas`}
          icon={ReceiptText}
          tone="blue"
        />
        <Card
          title="A receber"
          value={money(due)}
          sub={`${state.receivables.filter((r) => r.status !== "Pago" && r.status !== "Cancelado").length} contas`}
          icon={BadgeDollarSign}
          tone="orange"
        />
        <Card
          title="Litros vendidos"
          value={liters(sold)}
          sub="Hoje"
          icon={Gauge}
          tone="blue"
        />
      </section>
      <div className="section-title">
        <div>
          <span className="eyebrow">ESTOQUE</span>
          <h2>Combustíveis</h2>
        </div>
        <button className="secondary-button" onClick={() => setPage("Estoque")}>
          Ver estoque completo
        </button>
      </div>
      <div className="fuel-grid">
        {state.tanks.map((t) => {
          const f = state.fuels.find((x) => x.id === t.fuelId)!;
          const pct = Math.round((t.liters / t.capacity) * 100);
          return (
            <div className="fuel-card" key={t.id}>
              <div className="fuel-top">
                <div className="stat-icon green">
                  <Fuel size={21} />
                </div>
                <Status tone={t.liters <= f.min ? "orange" : "green"}>
                  {t.liters <= f.min ? "Baixo" : "Normal"}
                </Status>
              </div>
              <b>{f.name}</b>
              <strong>{liters(t.liters)}</strong>
              <div className="progress">
                <div style={{ width: `${pct}%` }} />
              </div>
              <div className="fuel-meta">
                <span>{pct}% do tanque</span>
                <span>{money(f.sellPrice)}/L</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function CashModern({ state, user, refresh }: any) {
  const active = state.cashSessions.find(
    (c: CashSession) => c.status === "Aberto",
  );
  const moves: CashMove[] = active
    ? state.cashMoves.filter((m: CashMove) => m.cashId === active.id)
    : [];
  const isDebit = (m: CashMove) =>
    ["Saída", "Sangria", "Despesa"].includes(m.type);
  const entries = moves
    .filter((m) => !isDebit(m))
    .reduce((a, m) => a + m.value, 0);
  const exits = moves.filter(isDebit).reduce((a, m) => a + m.value, 0);
  const sangrias = moves
    .filter((m) => m.type === "Sangria")
    .reduce((a, m) => a + m.value, 0);
  const suprimentos = moves
    .filter((m) => m.type === "Suprimento")
    .reduce((a, m) => a + m.value, 0);
  const balance = active ? active.opening + entries - exits : 0;
  const [modal, setModal] = useState<any>(null);
  const [tab, setTab] = useState("Movimentações");
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [actions, setActions] = useState<string | null>(null);
  const [fab, setFab] = useState(false);
  const [saving, setSaving] = useState(false);
  const tabMap: Record<string, string[] | undefined> = {
    Entradas: ["Entrada", "Venda", "Recebimento"],
    Saídas: ["Saída", "Despesa"],
    Sangrias: ["Sangria"],
    Suprimentos: ["Suprimento"],
  };
  const filtered = useMemo(
    () =>
      moves.filter(
        (m) =>
          (!tabMap[tab] || tabMap[tab]!.includes(m.type)) &&
          (!date || m.date.slice(0, 10) === date) &&
          (!query ||
            `${m.type} ${m.description} ${m.method || ""}`
              .toLowerCase()
              .includes(query.toLowerCase())),
      ),
    [moves, tab, date, query],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * perPage, current * perPage);
  function add(type: string) {
    if (!active) return;
    setFab(false);
    setModal({
      kind: "move",
      type,
      value: "",
      description: "",
      method: "Dinheiro",
      error: "",
    });
  }
  async function saveMove() {
    const value = Number(modal.value);
    if (!value || value <= 0) {
      setModal({ ...modal, error: "Informe um valor maior que zero." });
      return;
    }
    setSaving(true);
    try {
      await registrarMovimentacaoCaixa(user.empresaId, {
        caixa_id: active.id,
        tipo: (
          {
            Entrada: "entrada",
            Saída: "saida",
            Sangria: "sangria",
            Suprimento: "suprimento",
          } as Record<string, string>
        )[modal.type],
        categoria: modal.type,
        descricao: modal.description.trim() || modal.type,
        valor: value,
        forma_pagamento: pagamentoParaBanco(modal.method),
        usuario_id: user.id,
      });
      await refresh();
      setModal(null);
    } catch (error) {
      setModal({
        ...modal,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível registrar a movimentação.",
      });
    } finally {
      setSaving(false);
    }
  }
  async function openCash() {
    const opening = Number(modal.value);
    if (Number.isNaN(opening) || opening < 0) {
      setModal({ ...modal, error: "Informe um saldo inicial válido." });
      return;
    }
    setSaving(true);
    try {
      await abrirCaixa(opening, modal.observations);
      await refresh();
      setModal(null);
    } catch (error) {
      setModal({
        ...modal,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível abrir o caixa.",
      });
    } finally {
      setSaving(false);
    }
  }
  async function closeCash() {
    const declared = Number(modal.declared);
    if (Number.isNaN(declared) || declared < 0) {
      setModal({ ...modal, error: "Informe o saldo contado." });
      return;
    }
    setSaving(true);
    try {
      await fecharCaixa(active.id, declared, modal.observations);
      try {
        const { empresa } = await carregarContextoUsuario(user.id);
        const dados = await carregarDadosPosto(user.empresaId);
        const freshState = mapearDados(dados, empresa);
        const closedCash = freshState.cashSessions.find(
          (cash) => cash.id === active.id && cash.status === "Fechado",
        );
        if (!closedCash)
          throw new Error("Dados do caixa fechado ainda não disponíveis.");
        await cashPdf(freshState, closedCash, user.name);
      } catch (pdfError) {
        console.error("Geração automática do fechamento", pdfError);
        alert(
          "O caixa foi fechado com sucesso, mas o PDF não pôde ser baixado automaticamente. Você pode gerá-lo novamente pelo histórico de caixas.",
        );
      }
      await refresh();
      setModal(null);
    } catch (error) {
      setModal({
        ...modal,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível fechar o caixa.",
      });
    } finally {
      setSaving(false);
    }
  }
  function exportCsv() {
    const csv = [
      "Data;Tipo;Descrição;Categoria;Valor;Forma de pagamento",
      ...filtered.map((m) =>
        [
          dateBR(m.date),
          m.type,
          m.description,
          m.type,
          m.value.toFixed(2),
          m.method || "",
        ].join(";"),
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
    );
    a.download = `caixa-${dayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  const tabs = [
    ["Movimentações", RefreshCw],
    ["Entradas", ArrowDownToLine],
    ["Saídas", ArrowUpFromLine],
    ["Sangrias", Banknote],
    ["Suprimentos", CirclePlus],
  ] as const;
  return (
    <div className="cash-page">
      <Header
        eyebrow="FINANCEIRO"
        title="Controle de Caixa"
        subtitle="Acompanhe entradas, saídas e o saldo do caixa em tempo real."
        action={
          <div className="cash-head-actions">
            <PdfReportButton
              kind="cash"
              state={state}
              user={user}
              label="Gerar Relatório PDF"
              className="cash-export"
            />
            <button className="cash-export" onClick={exportCsv}>
              <Download size={17} />
              Exportar
            </button>
            {active ? (
              <button
                className="cash-close"
                onClick={() =>
                  setModal({
                    kind: "close",
                    declared: balance.toFixed(2),
                    error: "",
                  })
                }
              >
                <LockKeyhole size={17} />
                Fechar Caixa
              </button>
            ) : (
              <button
                className="cash-close"
                onClick={() =>
                  setModal({ kind: "open", value: "0", error: "" })
                }
              >
                <Plus size={17} />
                Abrir Caixa
              </button>
            )}
          </div>
        }
      />
      <section className="cash-stats">
        <div className="cash-stat green">
          <div className="cash-stat-icon">
            <Banknote />
          </div>
          <div>
            <span>Saldo inicial</span>
            <strong>{money(active?.opening || 0)}</strong>
            <small>
              {active
                ? `Aberto às ${new Date(active.openedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                : "Caixa fechado"}
            </small>
          </div>
          <i>⌁</i>
        </div>
        <div className="cash-stat blue">
          <div className="cash-stat-icon">
            <ArrowDownToLine />
          </div>
          <div>
            <span>Entradas</span>
            <strong>{money(entries)}</strong>
            <small>Movimentações positivas</small>
          </div>
          <i>⌁</i>
        </div>
        <div className="cash-stat orange">
          <div className="cash-stat-icon">
            <ArrowUpFromLine />
          </div>
          <div>
            <span>Saídas</span>
            <strong>{money(exits)}</strong>
            <small>Movimentações negativas</small>
          </div>
          <i>⌁</i>
        </div>
        <div className="cash-stat purple">
          <div className="cash-stat-icon">
            <WalletCards />
          </div>
          <div>
            <span>Saldo esperado</span>
            <strong>{money(balance)}</strong>
            <small>Valor calculado</small>
          </div>
          <i>⌁</i>
        </div>
      </section>
      <nav className="cash-tabs" aria-label="Filtros de movimentações">
        {tabs.map(([label, Icon]) => (
          <button
            key={label}
            className={tab === label ? "active" : ""}
            onClick={() => {
              setTab(label);
              setPage(1);
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>
      <section className="cash-panel">
        <div className="cash-panel-head">
          <div>
            <h2>Movimentações do caixa</h2>
            <p>Consulte e acompanhe as operações deste turno.</p>
          </div>
        </div>
        <div className="cash-panel-tools">
          <div className="cash-primary-actions">
            <button
              className="entry"
              disabled={!active}
              title={!active ? "Abra o caixa para registrar uma entrada" : ""}
              onClick={() => add("Entrada")}
            >
              <ArrowDownToLine size={17} />
              Nova Entrada
            </button>
            <button
              className="exit"
              disabled={!active}
              title={!active ? "Abra o caixa para registrar uma saída" : ""}
              onClick={() => add("Saída")}
            >
              <ArrowUpFromLine size={17} />
              Nova Saída
            </button>
            <button
              className="withdrawal"
              disabled={!active}
              title={!active ? "Abra o caixa para registrar uma sangria" : ""}
              onClick={() => add("Sangria")}
            >
              <Banknote size={17} />
              Nova Sangria
            </button>
            <button
              className="supply"
              disabled={!active}
              title={!active ? "Abra o caixa para registrar um suprimento" : ""}
              onClick={() => add("Suprimento")}
            >
              <CirclePlus size={17} />
              Novo Suprimento
            </button>
          </div>
          <div className="cash-filters">
            <div className="cash-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar movimentação..."
              />
            </div>
            <label className="cash-date">
              <CalendarDays size={16} />
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <button className="cash-filter-button">
              <SlidersHorizontal size={16} />
              Filtros
            </button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <Empty
            text={
              active
                ? "Nenhuma movimentação encontrada."
                : "Abra o caixa para registrar movimentações."
            }
          />
        ) : (
          <div className="table-wrap cash-table">
            <table>
              <thead>
                <tr>
                  <th>Data / Hora</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Valor</th>
                  <th>Forma de pagamento</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td>{dateBR(m.date)}</td>
                    <td>
                      <Status
                        tone={
                          isDebit(m)
                            ? "red"
                            : m.type === "Suprimento"
                              ? "blue"
                              : "green"
                        }
                      >
                        {m.type}
                      </Status>
                    </td>
                    <td>{m.description}</td>
                    <td>{m.type}</td>
                    <td className={isDebit(m) ? "negative" : "positive"}>
                      {isDebit(m) ? "-" : "+"}
                      {money(m.value)}
                    </td>
                    <td>{m.method || "—"}</td>
                    <td className="cash-action-cell">
                      <button
                        className="cash-row-action"
                        aria-label="Ações"
                        onClick={() =>
                          setActions(actions === m.id ? null : m.id)
                        }
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {actions === m.id && (
                        <div className="cash-action-menu">
                          <button
                            onClick={() => {
                              setModal({ kind: "detail", move: m });
                              setActions(null);
                            }}
                          >
                            <Eye size={15} />
                            Ver detalhes
                          </button>
                          <button onClick={() => window.print()}>
                            <Printer size={15} />
                            Imprimir
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="cash-pagination">
          <span>
            Mostrando {filtered.length ? (current - 1) * perPage + 1 : 0} a{" "}
            {Math.min(current * perPage, filtered.length)} de {filtered.length}{" "}
            movimentações
          </span>
          <div>
            <button
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <b>{current}</b>
            <span>de {pages}</span>
            <button
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <label>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value="10">10 por página</option>
              <option value="25">25 por página</option>
              <option value="50">50 por página</option>
            </select>
            <ChevronDown size={14} />
          </label>
        </div>
        {active && (
          <div className="cash-fab-wrap">
            {fab && (
              <div className="cash-fab-menu">
                {["Entrada", "Saída", "Sangria", "Suprimento"].map((type) => (
                  <button key={type} onClick={() => add(type)}>
                    {type === "Suprimento" ? "Novo" : "Nova"} {type}
                  </button>
                ))}
              </div>
            )}
            <button
              className="cash-fab"
              onClick={() => setFab(!fab)}
              aria-label="Nova movimentação"
            >
              <Plus size={27} />
            </button>
          </div>
        )}
      </section>
      {modal?.kind === "move" && (
        <Modal title={`Nova ${modal.type}`} onClose={() => setModal(null)}>
          <p className="modal-subtitle">
            Registre a movimentação no caixa aberto.
          </p>
          <div className="form-grid cash-modal-form">
            <label>
              Valor
              <input
                autoFocus
                type="number"
                step="0.01"
                value={modal.value}
                onChange={(e) =>
                  setModal({ ...modal, value: e.target.value, error: "" })
                }
                placeholder="R$ 0,00"
              />
            </label>
            <label>
              Forma de pagamento
              <select
                value={modal.method}
                onChange={(e) => setModal({ ...modal, method: e.target.value })}
              >
                {["Dinheiro", "PIX", "Débito", "Crédito"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="span2">
              Descrição
              <input
                value={modal.description}
                onChange={(e) =>
                  setModal({ ...modal, description: e.target.value })
                }
                placeholder="Descreva a movimentação"
              />
            </label>
            {modal.error && (
              <div className="error-box span2">{modal.error}</div>
            )}
            <div className="modal-actions span2">
              <button
                className="secondary-button"
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button
                className="primary-button"
                disabled={saving}
                onClick={saveMove}
              >
                {saving ? "Salvando..." : "Salvar movimentação"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {modal?.kind === "open" && (
        <Modal title="Abrir caixa" onClose={() => setModal(null)}>
          <p className="modal-subtitle">
            Informe o valor disponível no início do turno.
          </p>
          <div className="form-grid one cash-modal-form">
            <label>
              Saldo inicial
              <input
                autoFocus
                type="number"
                min="0"
                step="0.01"
                value={modal.value}
                onChange={(e) =>
                  setModal({ ...modal, value: e.target.value, error: "" })
                }
              />
            </label>
            {modal.error && <div className="error-box">{modal.error}</div>}
            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button className="primary-button" onClick={openCash}>
                Abrir caixa
              </button>
            </div>
          </div>
        </Modal>
      )}
      {modal?.kind === "close" && (
        <Modal title="Fechar caixa" onClose={() => setModal(null)}>
          <p className="modal-subtitle">
            Confira os valores antes de confirmar o fechamento.
          </p>
          <div className="cash-close-summary">
            <span>
              Saldo inicial <b>{money(active.opening)}</b>
            </span>
            <span>
              Entradas <b className="positive">{money(entries)}</b>
            </span>
            <span>
              Saídas <b className="negative">{money(exits)}</b>
            </span>
            <span>
              Sangrias <b>{money(sangrias)}</b>
            </span>
            <span>
              Suprimentos <b>{money(suprimentos)}</b>
            </span>
            <span className="total">
              Saldo esperado <b>{money(balance)}</b>
            </span>
          </div>
          <div className="form-grid one cash-modal-form">
            <label>
              Saldo contado
              <input
                autoFocus
                type="number"
                min="0"
                step="0.01"
                value={modal.declared}
                onChange={(e) =>
                  setModal({ ...modal, declared: e.target.value, error: "" })
                }
              />
            </label>
            <div className="cash-difference">
              Diferença{" "}
              <b
                className={
                  Number(modal.declared) - balance < 0 ? "negative" : "positive"
                }
              >
                {money((Number(modal.declared) || 0) - balance)}
              </b>
            </div>
            {modal.error && <div className="error-box">{modal.error}</div>}
            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button className="danger-button" onClick={closeCash}>
                Confirmar fechamento
              </button>
            </div>
          </div>
        </Modal>
      )}
      {modal?.kind === "detail" && (
        <Modal title="Detalhes da movimentação" onClose={() => setModal(null)}>
          <div className="cash-close-summary">
            <span>
              Data <b>{dateBR(modal.move.date)}</b>
            </span>
            <span>
              Tipo <b>{modal.move.type}</b>
            </span>
            <span>
              Descrição <b>{modal.move.description}</b>
            </span>
            <span>
              Forma de pagamento <b>{modal.move.method || "Não informada"}</b>
            </span>
            <span className="total">
              Valor <b>{money(modal.move.value)}</b>
            </span>
          </div>
          <div className="modal-actions">
            <button className="secondary-button" onClick={() => window.print()}>
              <Printer size={16} />
              Imprimir
            </button>
            <button className="primary-button" onClick={() => setModal(null)}>
              Concluir
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Cash({ state, setState, audit }: any) {
  const active = state.cashSessions.find(
    (c: CashSession) => c.status === "Aberto",
  );
  const moves = active
    ? state.cashMoves.filter((m: CashMove) => m.cashId === active.id)
    : [];
  const balance = active
    ? active.opening +
      moves.reduce(
        (a: number, m: CashMove) =>
          a +
          (["Saída", "Sangria", "Despesa"].includes(m.type)
            ? -m.value
            : m.value),
        0,
      )
    : 0;
  const [modal, setModal] = useState<any>(null);
  function add(type: string) {
    if (!active) return alert("Abra um caixa.");
    setModal({ type, value: "", description: "" });
  }
  function saveMove() {
    const v = Number(modal.value);
    if (!v) return;
    const m: CashMove = {
      id: uid(),
      cashId: active.id,
      date: nowIso(),
      type: modal.type,
      value: v,
      description: modal.description || modal.type,
    };
    setState((s: State) => ({ ...s, cashMoves: [m, ...s.cashMoves] }));
    audit(
      "Caixa",
      modal.type,
      `${modal.description || modal.type}: ${money(v)}`,
    );
    setModal(null);
  }
  function close() {
    if (!active) return;
    const declared = Number(
      prompt(`Saldo esperado: ${money(balance)}\nInforme o valor contado:`),
    );
    if (Number.isNaN(declared)) return;
    setState((s: State) => ({
      ...s,
      cashSessions: s.cashSessions.map((c: CashSession) =>
        c.id === active.id
          ? {
              ...c,
              status: "Fechado",
              closedAt: nowIso(),
              closingDeclared: declared,
            }
          : c,
      ),
    }));
    audit(
      "Caixa",
      "Fechamento",
      `Declarado ${money(declared)} | Esperado ${money(balance)}`,
    );
  }
  function open() {
    const opening = Number(prompt("Saldo inicial do caixa:", "0"));
    if (Number.isNaN(opening)) return;
    const c: CashSession = {
      id: uid(),
      openedAt: nowIso(),
      opening,
      status: "Aberto",
      operator: "Administrador",
    };
    setState((s: State) => ({ ...s, cashSessions: [c, ...s.cashSessions] }));
    audit("Caixa", "Abertura", `Saldo inicial ${money(opening)}`);
  }
  return (
    <>
      <Header
        eyebrow="FINANCEIRO"
        title="Controle de Caixa"
        subtitle="Abertura, entradas, saídas, sangrias, suprimentos e fechamento."
        action={
          active ? (
            <button className="danger-button" onClick={close}>
              Fechar Caixa
            </button>
          ) : (
            <button className="primary-button compact" onClick={open}>
              <Plus size={17} />
              Abrir Caixa
            </button>
          )
        }
      />
      <section className="stats-grid">
        <Card
          title="Saldo inicial"
          value={active ? money(active.opening) : "R$ 0,00"}
          sub={active ? dateBR(active.openedAt) : "Caixa fechado"}
          icon={Banknote}
        />
        <Card
          title="Entradas"
          value={money(
            moves
              .filter(
                (m: CashMove) =>
                  !["Saída", "Sangria", "Despesa"].includes(m.type),
              )
              .reduce((a: number, b: CashMove) => a + b.value, 0),
          )}
          sub="Movimentações positivas"
          icon={ArrowDownToLine}
          tone="blue"
        />
        <Card
          title="Saídas"
          value={money(
            moves
              .filter((m: CashMove) =>
                ["Saída", "Sangria", "Despesa"].includes(m.type),
              )
              .reduce((a: number, b: CashMove) => a + b.value, 0),
          )}
          sub="Movimentações negativas"
          icon={ArrowUpFromLine}
          tone="orange"
        />
        <Card
          title="Saldo esperado"
          value={money(balance)}
          sub="Valor calculado"
          icon={WalletCards}
        />
      </section>
      {active && (
        <div className="quick-grid">
          <button onClick={() => add("Entrada")}>
            <div className="quick-icon">
              <ArrowDownToLine />
            </div>
            <div>
              <b>Entrada</b>
              <span>Receita avulsa</span>
            </div>
          </button>
          <button onClick={() => add("Saída")}>
            <div className="quick-icon">
              <ArrowUpFromLine />
            </div>
            <div>
              <b>Saída</b>
              <span>Retirada avulsa</span>
            </div>
          </button>
          <button onClick={() => add("Sangria")}>
            <div className="quick-icon">
              <Banknote />
            </div>
            <div>
              <b>Sangria</b>
              <span>Retirar numerário</span>
            </div>
          </button>
          <button onClick={() => add("Suprimento")}>
            <div className="quick-icon">
              <Plus />
            </div>
            <div>
              <b>Suprimento</b>
              <span>Adicionar numerário</span>
            </div>
          </button>
        </div>
      )}
      <div className="panel">
        <h2>Movimentações do caixa</h2>
        {moves.length === 0 ? (
          <Empty text="Nenhuma movimentação neste caixa." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {moves.map((m: CashMove) => (
                  <tr key={m.id}>
                    <td>{dateBR(m.date)}</td>
                    <td>
                      <Status
                        tone={
                          ["Saída", "Sangria", "Despesa"].includes(m.type)
                            ? "orange"
                            : "green"
                        }
                      >
                        {m.type}
                      </Status>
                    </td>
                    <td>{m.description}</td>
                    <td
                      className={
                        ["Saída", "Sangria", "Despesa"].includes(m.type)
                          ? "negative"
                          : "positive"
                      }
                    >
                      {money(m.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal && (
        <Modal title={`Nova ${modal.type}`} onClose={() => setModal(null)}>
          <div className="form-grid">
            <label>
              Valor
              <input
                type="number"
                step="0.01"
                value={modal.value}
                onChange={(e) => setModal({ ...modal, value: e.target.value })}
              />
            </label>
            <label>
              Descrição
              <input
                value={modal.description}
                onChange={(e) =>
                  setModal({ ...modal, description: e.target.value })
                }
              />
            </label>
            <button className="primary-button span2" onClick={saveMove}>
              Salvar
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Sales({ state, refresh, user }: any) {
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [f, setF] = useState<any>({
    fuelId: state.fuels[0]?.id || "",
    tankId: state.tanks[0]?.id || "",
    pumpId: "",
    mode: "litros",
    value: "",
    received: "",
    due: dayISO(30),
    liters: "",
    payment: "Dinheiro",
    clientId: "",
    employeeId: "",
  });
  const sales = state.sales.filter((s: Sale) => {
    const c = state.clients.find((x: Client) => x.id === s.clientId);
    const fuel = state.fuels.find((x: FuelItem) => x.id === s.fuelId);
    return `${c?.name || ""} ${fuel?.name || ""} ${s.payment}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });
  function chooseFuel(id: string) {
    const tank = state.tanks.find((t: Tank) => t.fuelId === id);
    setF({ ...f, fuelId: id, tankId: tank?.id || "", pumpId: "" });
  }
  function chooseTank(id: string) {
    setF({ ...f, tankId: id, pumpId: "" });
  }
  async function saveReal() {
    const fuel: FuelItem = state.fuels.find((x: FuelItem) => x.id === f.fuelId);
    const tank: Tank = state.tanks.find((x: Tank) => x.id === f.tankId);
    const selectedPump: Pump | undefined = f.pumpId
      ? state.pumps.find((x: Pump) => x.id === f.pumpId)
      : undefined;
    const selectedClient: Client | undefined = f.clientId
      ? state.clients.find((x: Client) => x.id === f.clientId)
      : undefined;
    const selectedEmployee: Employee | undefined = f.employeeId
      ? state.employees.find((x: Employee) => x.id === f.employeeId)
      : undefined;
    const amount = Number(f.mode === "litros" ? f.liters : f.value);
    if (!fuel || !tank || !amount)
      return alert("Preencha combustível, tanque e o valor da venda.");
    const invalidReference =
      !isUuid(fuel.id) ||
      !isUuid(tank.id) ||
      tank.fuelId !== fuel.id ||
      (Boolean(f.pumpId) &&
        (!selectedPump ||
          !isUuid(selectedPump.id) ||
          selectedPump.tankId !== tank.id)) ||
      (Boolean(f.clientId) &&
        (!selectedClient || !isUuid(selectedClient.id))) ||
      (Boolean(f.employeeId) &&
        (!selectedEmployee || !isUuid(selectedEmployee.id)));
    if (invalidReference)
      return alert(
        "Não foi possível concluir a venda porque um dos registros selecionados é inválido. Atualize a página e tente novamente.",
      );
    if (f.payment === "Prazo" && !f.clientId)
      return alert("Venda a prazo exige um cliente.");
    try {
      await registrarVenda({
        p_combustivel_id: f.fuelId,
        p_tanque_id: f.tankId,
        p_bomba_id: f.pumpId || null,
        p_funcionario_id: f.employeeId || null,
        p_cliente_id: f.clientId || null,
        p_litros: f.mode === "litros" ? amount : null,
        p_valor: f.mode === "valor" ? amount : null,
        p_forma_pagamento: pagamentoParaBanco(f.payment),
        p_valor_recebido:
          f.payment === "Dinheiro" ? Number(f.received) || null : null,
        p_vencimento: f.payment === "Prazo" ? f.due : null,
        p_observacoes: null,
      });
      await refresh();
      setShow(false);
      setF({ ...f, liters: "", value: "", received: "", clientId: "" });
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a venda.",
      );
    }
  }
  async function cancel(sale: Sale) {
    if (cancelingId || sale.status === "Cancelada") return;
    if (
      !confirm(
        "Cancelar esta venda? O estoque será devolvido e os efeitos financeiros serão estornados.",
      )
    )
      return;
    const motivo =
      prompt("Informe o motivo do cancelamento (opcional):", "") ?? undefined;
    setCancelingId(sale.id);
    try {
      await cancelarVenda(sale.id, motivo);
      await refresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível cancelar a venda.",
      );
    } finally {
      setCancelingId(null);
    }
  }
  return (
    <>
      <Header
        eyebrow="OPERAÇÃO"
        title="Vendas / Abastecimentos"
        subtitle="Registre vendas e baixa automática do estoque."
      />
      <Toolbar
        search={search}
        setSearch={setSearch}
        button="Nova Venda"
        onClick={() => setShow(true)}
      />
      <div className="panel no-pad">
        {sales.length === 0 ? (
          <Empty text="Cadastre sua primeira venda." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Combustível</th>
                  <th>Litros</th>
                  <th>Valor</th>
                  <th>Pagamento</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s: Sale) => {
                  const fuel = state.fuels.find(
                    (f: FuelItem) => f.id === s.fuelId,
                  );
                  const client = state.clients.find(
                    (c: Client) => c.id === s.clientId,
                  );
                  return (
                    <tr key={s.id}>
                      <td>{dateBR(s.date)}</td>
                      <td>{fuel?.name}</td>
                      <td>{liters(s.liters)}</td>
                      <td>{money(s.total)}</td>
                      <td>{s.payment}</td>
                      <td>{client?.name || "-"}</td>
                      <td>
                        <Status tone={s.status === "Ativa" ? "green" : "gray"}>
                          {s.status}
                        </Status>
                      </td>
                      <td>
                        {s.status === "Ativa" && user.role !== "Frentista" && (
                          <button
                            className="table-icon danger"
                            disabled={cancelingId === s.id}
                            onClick={() => cancel(s)}
                            title={
                              cancelingId === s.id
                                ? "Cancelando venda..."
                                : "Cancelar venda"
                            }
                          >
                            <X size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {show && (
        <Modal title="Nova Venda" onClose={() => setShow(false)}>
          <div className="form-grid">
            <label>
              Combustível
              <select
                value={f.fuelId}
                onChange={(e) => chooseFuel(e.target.value)}
              >
                {state.fuels
                  .filter((x: FuelItem) => x.active && isUuid(x.id))
                  .map((x: FuelItem) => (
                    <option key={x.id} value={x.id}>
                      {x.name} - {money(x.sellPrice)}/L
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Tanque
              <select
                value={f.tankId}
                onChange={(e) => chooseTank(e.target.value)}
              >
                {state.tanks
                  .filter((t: Tank) => t.fuelId === f.fuelId && isUuid(t.id))
                  .map((t: Tank) => (
                    <option key={t.id} value={t.id}>
                      {t.name} - {liters(t.liters)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Bomba
              <select
                value={f.pumpId}
                onChange={(e) => setF({ ...f, pumpId: e.target.value })}
              >
                <option value="">Não informada</option>
                {state.pumps
                  .filter(
                    (p: Pump) =>
                      p.active && p.tankId === f.tankId && isUuid(p.id),
                  )
                  .map((p: Pump) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Modo
              <select
                value={f.mode}
                onChange={(e) => setF({ ...f, mode: e.target.value })}
              >
                <option value="litros">Por Litros</option>
                <option value="valor">Por Valor</option>
              </select>
            </label>
            <label
              style={{ display: f.mode === "litros" ? undefined : "none" }}
            >
              Litros
              <input
                type="number"
                step="0.001"
                value={f.liters}
                onChange={(e) => setF({ ...f, liters: e.target.value })}
              />
            </label>
            {f.mode === "valor" && (
              <label>
                Valor
                <input
                  type="number"
                  step="0.01"
                  value={f.value}
                  onChange={(e) => setF({ ...f, value: e.target.value })}
                />
              </label>
            )}
            <label>
              Pagamento
              <select
                value={f.payment}
                onChange={(e) => setF({ ...f, payment: e.target.value })}
              >
                {["Dinheiro", "PIX", "Débito", "Crédito", "Prazo"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            {f.payment === "Prazo" && (
              <label className="span2">
                Cliente
                <select
                  value={f.clientId}
                  onChange={(e) => setF({ ...f, clientId: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {state.clients
                    .filter((c: Client) => isUuid(c.id))
                    .map((c: Client) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {f.payment === "Prazo" && (
              <label>
                Vencimento
                <input
                  type="date"
                  value={f.due}
                  onChange={(e) => setF({ ...f, due: e.target.value })}
                />
              </label>
            )}
            {f.payment === "Dinheiro" && (
              <label>
                Valor recebido
                <input
                  type="number"
                  step="0.01"
                  value={f.received}
                  onChange={(e) => setF({ ...f, received: e.target.value })}
                />
              </label>
            )}
            <label className="span2">
              Funcionário
              <select
                value={f.employeeId}
                onChange={(e) => setF({ ...f, employeeId: e.target.value })}
              >
                <option value="">Não informado</option>
                {state.employees
                  .filter((e: Employee) => e.active && isUuid(e.id))
                  .map((e: Employee) => (
                    <option value={e.id} key={e.id}>
                      {e.name}
                    </option>
                  ))}
              </select>
            </label>
            <button className="primary-button span2" onClick={saveReal}>
              Concluir venda
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function LegacyFuels({ state, setState, audit }: any) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({
    name: "",
    sellPrice: "",
    costPrice: "",
    min: "",
  });
  function save() {
    if (!form.name) return;
    const x: FuelItem = {
      id: uid(),
      name: form.name,
      sellPrice: Number(form.sellPrice),
      costPrice: Number(form.costPrice),
      min: Number(form.min),
      active: true,
    };
    setState((s: State) => ({ ...s, fuels: [...s.fuels, x] }));
    audit("Combustíveis", "Cadastro", x.name);
    setShow(false);
  }
  return (
    <>
      <Header
        eyebrow="PRODUTOS"
        title="Combustíveis"
        subtitle="Preços, custos e estoque mínimo."
        action={
          <button
            className="primary-button compact"
            onClick={() => setShow(true)}
          >
            <Plus size={17} />
            Novo Combustível
          </button>
        }
      />
      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Combustível</th>
                <th>Custo/L</th>
                <th>Venda/L</th>
                <th>Margem/L</th>
                <th>Estoque mínimo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {state.fuels.map((f: FuelItem) => (
                <tr key={f.id}>
                  <td>
                    <b>{f.name}</b>
                  </td>
                  <td>{money(f.costPrice)}</td>
                  <td>{money(f.sellPrice)}</td>
                  <td>{money(f.sellPrice - f.costPrice)}</td>
                  <td>{liters(f.min)}</td>
                  <td>
                    <Status>{f.active ? "Ativo" : "Inativo"}</Status>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {show && (
        <Modal title="Novo Combustível" onClose={() => setShow(false)}>
          <div className="form-grid">
            <label>
              Nome
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Preço de Custo/L
              <input
                type="number"
                step="0.01"
                value={form.costPrice}
                onChange={(e) =>
                  setForm({ ...form, costPrice: e.target.value })
                }
              />
            </label>
            <label>
              Preço de Venda/L
              <input
                type="number"
                step="0.01"
                value={form.sellPrice}
                onChange={(e) =>
                  setForm({ ...form, sellPrice: e.target.value })
                }
              />
            </label>
            <label>
              Estoque Mínimo (L)
              <input
                type="number"
                step="0.001"
                value={form.min}
                onChange={(e) => setForm({ ...form, min: e.target.value })}
              />
            </label>
            <button className="primary-button span2" onClick={save}>
              Salvar combustível
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Fuels({ state, user, refresh }: any) {
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const openNew = () =>
    setForm({
      id: "",
      name: "",
      sellPrice: "",
      costPrice: "",
      min: "",
      active: true,
    });
  const openEdit = (f: FuelItem) =>
    setForm({
      id: f.id,
      name: f.name,
      sellPrice: String(f.sellPrice),
      costPrice: String(f.costPrice),
      min: String(f.min),
      active: f.active,
    });
  async function save() {
    if (!form.name.trim()) return alert("Informe o nome do combustível.");
    const cost = Number(form.costPrice),
      price = Number(form.sellPrice),
      minimum = Number(form.min);
    if (
      [cost, price, minimum].some(Number.isNaN) ||
      cost < 0 ||
      price < 0 ||
      minimum < 0
    )
      return alert("Informe valores válidos, iguais ou maiores que zero.");
    setSaving(true);
    try {
      await salvarCadastro(
        "combustiveis",
        user.empresaId,
        {
          nome: form.name.trim(),
          custo_por_litro: cost,
          preco_venda: price,
          estoque_minimo_litros: minimum,
          ativo: form.active,
        },
        form.id || undefined,
      );
      await refresh();
      setForm(null);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o combustível.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function remove(f: FuelItem) {
    if (
      !confirm(
        `Excluir o combustível "${f.name}"? Esta ação não poderá ser desfeita.`,
      )
    )
      return;
    setSaving(true);
    try {
      await excluirCadastro("combustiveis", user.empresaId, f.id);
      await refresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o combustível.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <Header
        eyebrow="PRODUTOS"
        title="Combustíveis"
        subtitle="Preços, custos e estoque mínimo."
        action={
          <button className="primary-button compact" onClick={openNew}>
            <Plus size={17} />
            Novo Combustível
          </button>
        }
      />
      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Combustível</th>
                <th>Custo/L</th>
                <th>Venda/L</th>
                <th>Margem/L</th>
                <th>Estoque mínimo</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {state.fuels.map((f: FuelItem) => (
                <tr key={f.id}>
                  <td>
                    <b>{f.name}</b>
                  </td>
                  <td>{money(f.costPrice)}</td>
                  <td>{money(f.sellPrice)}</td>
                  <td>{money(f.sellPrice - f.costPrice)}</td>
                  <td>{liters(f.min)}</td>
                  <td>
                    <Status tone={f.active ? "green" : "gray"}>
                      {f.active ? "Ativo" : "Inativo"}
                    </Status>
                  </td>
                  <td>
                    <div className="button-row">
                      <button
                        className="table-icon"
                        disabled={saving}
                        onClick={() => openEdit(f)}
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="table-icon danger"
                        disabled={saving}
                        onClick={() => remove(f)}
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {form && (
        <Modal
          title={form.id ? "Editar Combustível" : "Novo Combustível"}
          onClose={() => !saving && setForm(null)}
        >
          <div className="form-grid">
            <label>
              Nome
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Preço de Custo/L
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.costPrice}
                onChange={(e) =>
                  setForm({ ...form, costPrice: e.target.value })
                }
              />
            </label>
            <label>
              Preço de Venda/L
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.sellPrice}
                onChange={(e) =>
                  setForm({ ...form, sellPrice: e.target.value })
                }
              />
            </label>
            <label>
              Estoque Mínimo (L)
              <input
                type="number"
                min="0"
                step="0.001"
                value={form.min}
                onChange={(e) => setForm({ ...form, min: e.target.value })}
              />
            </label>
            <label>
              Status
              <select
                value={form.active ? "Ativo" : "Inativo"}
                onChange={(e) =>
                  setForm({ ...form, active: e.target.value === "Ativo" })
                }
              >
                <option>Ativo</option>
                <option>Inativo</option>
              </select>
            </label>
            <button
              className="primary-button span2"
              disabled={saving}
              onClick={save}
            >
              {saving ? "Salvando..." : "Salvar combustível"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Stock({ state, user, refresh }: any) {
  const [modal, setModal] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  function openEntry() {
    setModal({
      kind: "entry",
      tankId: state.tanks[0]?.id || "",
      liters: "",
      cost: "",
      invoice: "",
      supplierId: "",
      observations: "",
    });
  }
  function openAdjust() {
    setModal({
      kind: "adjust",
      tankId: state.tanks[0]?.id || "",
      liters: "",
      observations: "",
    });
  }
  async function save() {
    const n = Number(modal.liters);
    if (Number.isNaN(n) || (modal.kind === "entry" ? n <= 0 : n < 0))
      return alert(
        modal.kind === "entry"
          ? "Informe uma quantidade maior que zero."
          : "Informe um estoque físico válido.",
      );
    const tank: Tank = state.tanks.find((t: Tank) => t.id === modal.tankId);
    if (!tank) return alert("Selecione um tanque válido.");
    const supplier = state.suppliers.find(
      (x: Supplier) => x.id === modal.supplierId,
    )?.name;
    const details = [
      modal.kind === "entry" && modal.invoice
        ? `NF/Documento: ${modal.invoice}`
        : "",
      modal.kind === "entry" && supplier ? `Fornecedor: ${supplier}` : "",
      modal.kind === "entry" && modal.cost ? `Custo/L: ${modal.cost}` : "",
      modal.observations || "",
    ]
      .filter(Boolean)
      .join(" | ");
    setSaving(true);
    try {
      if (modal.kind === "entry")
        await registrarEntradaCombustivel(tank.id, n, details);
      else
        await ajustarEstoqueTanque(
          tank.id,
          n,
          details || "Ajuste de estoque físico",
        );
      await refresh();
      setModal(null);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a movimentação.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <Header
        eyebrow="ESTOQUE"
        title="Tanques e Movimentações"
        subtitle="Entrada, saída automática, ajustes e histórico."
        action={
          <div className="head-actions">
            <PdfReportButton
              kind="stock"
              state={state}
              user={user}
              label="Gerar Relatório PDF"
            />
            <button className="secondary-button" onClick={openAdjust}>
              <RefreshCw size={16} />
              Ajustar
            </button>
            <button className="primary-button compact" onClick={openEntry}>
              <ArrowDownToLine size={16} />
              Entrada de Combustível
            </button>
          </div>
        }
      />
      <div className="fuel-grid">
        {state.tanks.map((t: Tank) => {
          const f = state.fuels.find((x: FuelItem) => x.id === t.fuelId);
          const pct = Math.round((t.liters / t.capacity) * 100);
          return (
            <div className="fuel-card" key={t.id}>
              <div className="fuel-top">
                <div className="stat-icon green">
                  <Droplets size={21} />
                </div>
                <Status tone={t.liters <= (f?.min || 0) ? "orange" : "green"}>
                  {pct}%
                </Status>
              </div>
              <b>
                {t.name} • {f?.name}
              </b>
              <strong>{liters(t.liters)}</strong>
              <div className="progress">
                <div style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <div className="fuel-meta">
                <span>Cap. {liters(t.capacity)}</span>
                <span>Mín. {liters(f?.min || 0)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="panel section-block">
        <h2>Histórico de estoque</h2>
        {state.stockMoves.length === 0 ? (
          <Empty text="Nenhuma movimentação de estoque." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tanque</th>
                  <th>Tipo</th>
                  <th>Litros</th>
                  <th>Descrição</th>
                </tr>
              </thead>
              <tbody>
                {state.stockMoves.map((m: StockMove) => (
                  <tr key={m.id}>
                    <td>{dateBR(m.date)}</td>
                    <td>
                      {state.tanks.find((t: Tank) => t.id === m.tankId)?.name}
                    </td>
                    <td>
                      <Status tone={m.liters < 0 ? "orange" : "green"}>
                        {m.type}
                      </Status>
                    </td>
                    <td className={m.liters < 0 ? "negative" : "positive"}>
                      {m.liters > 0 ? "+" : ""}
                      {liters(m.liters)}
                    </td>
                    <td>{m.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal && (
        <Modal
          title={
            modal.kind === "entry"
              ? "Entrada de Combustível"
              : "Ajustar Estoque"
          }
          onClose={() => !saving && setModal(null)}
        >
          <div className="form-grid">
            <label>
              Tanque
              <select
                value={modal.tankId}
                onChange={(e) => setModal({ ...modal, tankId: e.target.value })}
              >
                {state.tanks.map((t: Tank) => (
                  <option key={t.id} value={t.id}>
                    {t.name} -{" "}
                    {state.fuels.find((f: FuelItem) => f.id === t.fuelId)?.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {modal.kind === "entry"
                ? "Litros recebidos"
                : "Estoque físico atual"}
              <input
                type="number"
                step="0.001"
                value={modal.liters}
                onChange={(e) => setModal({ ...modal, liters: e.target.value })}
              />
            </label>
            {modal.kind === "entry" && (
              <>
                <label>
                  NF / Documento
                  <input
                    value={modal.invoice}
                    onChange={(e) =>
                      setModal({ ...modal, invoice: e.target.value })
                    }
                  />
                </label>
                <label>
                  Fornecedor
                  <select
                    value={modal.supplierId}
                    onChange={(e) =>
                      setModal({ ...modal, supplierId: e.target.value })
                    }
                  >
                    <option value="">Não informado</option>
                    {state.suppliers.map((s: Supplier) => (
                      <option value={s.id} key={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Custo por litro
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={modal.cost}
                    onChange={(e) =>
                      setModal({ ...modal, cost: e.target.value })
                    }
                  />
                </label>
              </>
            )}
            <label className="span2">
              Observações
              <input
                value={modal.observations}
                onChange={(e) =>
                  setModal({ ...modal, observations: e.target.value })
                }
              />
            </label>
            <button
              className="primary-button span2"
              disabled={saving}
              onClick={save}
            >
              {saving ? "Salvando..." : "Salvar movimentação"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Clients({ state, user, refresh }: any) {
  const [search, setSearch] = useState("");
  const [show, setShow] = useState<any>(null);
  const rows = state.clients.filter((c: Client) =>
    `${c.name} ${c.doc} ${c.phone}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  async function save() {
    if (!show.name) return;
    try {
      const existingId = isUuid(show.id) ? show.id : undefined;
      await salvarCadastro(
        "clientes",
        user.empresaId,
        {
          nome: show.name.trim(),
          cpf_cnpj: show.doc?.trim() || null,
          telefone: show.phone?.trim() || null,
          limite_credito: Number(show.limit || 0),
          ativo: show.status !== "Inativo",
          status:
            show.status === "Bloqueado"
              ? "bloqueado"
              : show.status === "Inativo"
                ? "inativo"
                : "ativo",
          observacoes: show.notes?.trim() || null,
        },
        existingId,
      );
      await refresh();
      setShow(null);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o cliente.",
      );
    }
  }
  return (
    <>
      <Header
        eyebrow="CADASTROS"
        title="Clientes"
        subtitle="Controle clientes, limites e situação de crédito."
      />
      <Toolbar
        search={search}
        setSearch={setSearch}
        button="Novo Cliente"
        onClick={() =>
          setShow({
            id: "",
            name: "",
            doc: "",
            phone: "",
            limit: 0,
            status: "Ativo",
            notes: "",
          })
        }
      />
      <div className="panel no-pad">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>CPF/CNPJ</th>
                <th>Telefone</th>
                <th>Limite</th>
                <th>Saldo devedor</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c: Client) => {
                const debt = state.receivables
                  .filter(
                    (r: Receivable) =>
                      r.clientId === c.id &&
                      r.status !== "Pago" &&
                      r.status !== "Cancelado",
                  )
                  .reduce(
                    (a: number, r: Receivable) => a + (r.original - r.paid),
                    0,
                  );
                return (
                  <tr key={c.id}>
                    <td>
                      <b>{c.name}</b>
                    </td>
                    <td>{c.doc}</td>
                    <td>{c.phone}</td>
                    <td>{money(c.limit)}</td>
                    <td className={debt > 0 ? "negative" : ""}>
                      {money(debt)}
                    </td>
                    <td>
                      <Status tone={c.status === "Ativo" ? "green" : "orange"}>
                        {c.status}
                      </Status>
                    </td>
                    <td>
                      <button
                        className="table-icon"
                        onClick={() => setShow({ ...c })}
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {show && (
        <Modal
          title={show.id ? "Editar Cliente" : "Novo Cliente"}
          onClose={() => setShow(null)}
        >
          <div className="form-grid">
            <label>
              Nome / Razão Social
              <input
                value={show.name}
                onChange={(e) => setShow({ ...show, name: e.target.value })}
              />
            </label>
            <label>
              CPF / CNPJ
              <input
                value={show.doc}
                onChange={(e) => setShow({ ...show, doc: e.target.value })}
              />
            </label>
            <label>
              Telefone
              <input
                value={show.phone}
                onChange={(e) => setShow({ ...show, phone: e.target.value })}
              />
            </label>
            <label>
              Limite de Crédito
              <input
                type="number"
                value={show.limit}
                onChange={(e) =>
                  setShow({ ...show, limit: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Status
              <select
                value={show.status}
                onChange={(e) => setShow({ ...show, status: e.target.value })}
              >
                <option>Ativo</option>
                <option>Bloqueado</option>
                <option>Inativo</option>
              </select>
            </label>
            <label>
              Observações
              <input
                value={show.notes}
                onChange={(e) => setShow({ ...show, notes: e.target.value })}
              />
            </label>
            <button className="primary-button span2" onClick={save}>
              Salvar cliente
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Receivables({ state, refresh, user, focusedId, onFocusHandled }: any) {
  const [search, setSearch] = useState("");
  const [pay, setPay] = useState<any>(null);
  useEffect(() => {
    if (!focusedId) return;
    const row = document.getElementById(`receivable-${focusedId}`);
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = window.setTimeout(onFocusHandled, 3500);
    return () => window.clearTimeout(timer);
  }, [focusedId, onFocusHandled, state.receivables]);
  const rows = state.receivables.filter((r: Receivable) =>
    state.clients
      .find((c: Client) => c.id === r.clientId)
      ?.name.toLowerCase()
      .includes(search.toLowerCase()),
  );
  const total = rows
    .filter((r: Receivable) => r.status !== "Pago" && r.status !== "Cancelado")
    .reduce((a: number, r: Receivable) => a + r.original - r.paid, 0);
  const overdue = rows
    .filter(
      (r: Receivable) =>
        r.status !== "Pago" && r.status !== "Cancelado" && r.due < dayISO(),
    )
    .reduce((a: number, r: Receivable) => a + r.original - r.paid, 0);
  async function receive() {
    const amount = Number(pay.amount);
    const r: Receivable = state.receivables.find(
      (x: Receivable) => x.id === pay.id,
    );
    if (!r || !amount || amount > r.original - r.paid)
      return alert("Valor inválido.");
    try {
      await registrarRecebimento(r.id, amount, pagamentoParaBanco(pay.method));
      await refresh();
      setPay(null);
      return;
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar o recebimento.",
      );
      return;
    }
  }
  return (
    <>
      <Header
        eyebrow="FINANCEIRO"
        title="Contas a Receber"
        subtitle="Fiado, pagamentos totais e parciais."
        action={
          <PdfReportButton
            kind="accounts"
            state={state}
            user={user}
            label="Gerar Relatório PDF"
          />
        }
      />
      <section className="stats-grid three">
        <Card
          title="Total a receber"
          value={money(total)}
          sub="Saldo em aberto"
          icon={BadgeDollarSign}
        />
        <Card
          title="Vencido"
          value={money(overdue)}
          sub="Necessita atenção"
          icon={AlertTriangle}
          tone="orange"
        />
        <Card
          title="Recebido"
          value={money(
            rows.reduce((a: number, r: Receivable) => a + r.paid, 0),
          )}
          sub="Pagamentos registrados"
          icon={CheckCircle2}
          tone="blue"
        />
      </section>
      <Toolbar search={search} setSearch={setSearch} />
      <div className="panel no-pad">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Vencimento</th>
                <th>Original</th>
                <th>Pago</th>
                <th>Saldo</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: Receivable) => {
                const client = state.clients.find(
                  (c: Client) => c.id === r.clientId,
                );
                const bal = r.original - r.paid;
                return (
                  <tr
                    key={r.id}
                    id={`receivable-${r.id}`}
                    className={focusedId === r.id ? "receivable-highlight" : ""}
                  >
                    <td>
                      <b>{client?.name}</b>
                    </td>
                    <td>
                      {new Date(r.due + "T12:00:00").toLocaleDateString(
                        "pt-BR",
                      )}
                    </td>
                    <td>{money(r.original)}</td>
                    <td>{money(r.paid)}</td>
                    <td className={bal > 0 ? "negative" : ""}>{money(bal)}</td>
                    <td>
                      <Status
                        tone={
                          r.status === "Pago"
                            ? "green"
                            : r.due < dayISO()
                              ? "orange"
                              : "blue"
                        }
                      >
                        {r.status}
                      </Status>
                    </td>
                    <td>
                      {!["Pago", "Cancelado"].includes(r.status) && (
                        <button
                          className="small-action"
                          onClick={() =>
                            setPay({
                              id: r.id,
                              amount: bal,
                              method: "Dinheiro",
                            })
                          }
                        >
                          Receber
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {pay && (
        <Modal title="Registrar Pagamento" onClose={() => setPay(null)}>
          <div className="form-grid">
            <label>
              Valor
              <input
                type="number"
                step="0.01"
                value={pay.amount}
                onChange={(e) => setPay({ ...pay, amount: e.target.value })}
              />
            </label>
            <label>
              Forma
              <select
                value={pay.method}
                onChange={(e) => setPay({ ...pay, method: e.target.value })}
              >
                {["Dinheiro", "PIX", "Débito", "Crédito"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <button className="primary-button span2" onClick={receive}>
              Confirmar recebimento
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Expenses({ state, refresh, user }: any) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({
    category: "Outros",
    description: "",
    value: "",
    method: "Dinheiro",
    supplierId: "",
  });
  async function save() {
    const v = Number(form.value);
    if (!v || !form.description) return;
    try {
      await registrarDespesa({
        p_descricao: form.description,
        p_valor: v,
        p_categoria: form.category || null,
        p_forma_pagamento: pagamentoParaBanco(form.method),
        p_fornecedor_id: form.supplierId || null,
        p_observacoes: form.observations || null,
      });
      await refresh();
      setShow(false);
      return;
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a despesa.",
      );
      return;
    }
  }
  return (
    <>
      <Header
        eyebrow="FINANCEIRO"
        title="Despesas"
        subtitle="Registre gastos e vincule ao caixa."
        action={
          <div className="head-actions">
            <PdfReportButton
              kind="expenses"
              state={state}
              user={user}
              label="Gerar Relatório PDF"
            />
            <button
              className="primary-button compact"
              onClick={() => setShow(true)}
            >
              <Plus size={17} />
              Nova Despesa
            </button>
          </div>
        }
      />
      <div className="panel no-pad">
        {state.expenses.length === 0 ? (
          <Empty text="Nenhuma despesa registrada." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Categoria</th>
                  <th>Descrição</th>
                  <th>Fornecedor</th>
                  <th>Forma</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {state.expenses.map((e: Expense) => (
                  <tr key={e.id}>
                    <td>{dateBR(e.date)}</td>
                    <td>{e.category}</td>
                    <td>{e.description}</td>
                    <td>
                      {state.suppliers.find(
                        (s: Supplier) => s.id === e.supplierId,
                      )?.name || "-"}
                    </td>
                    <td>{e.method}</td>
                    <td className="negative">{money(e.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {show && (
        <Modal title="Nova Despesa" onClose={() => setShow(false)}>
          <div className="form-grid">
            <label>
              Categoria
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {[
                  "Energia",
                  "Água",
                  "Manutenção",
                  "Impostos",
                  "Pessoal",
                  "Compras",
                  "Outros",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Fornecedor
              <select
                value={form.supplierId}
                onChange={(e) =>
                  setForm({ ...form, supplierId: e.target.value })
                }
              >
                <option value="">Não informado</option>
                {state.suppliers.map((s: Supplier) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="span2">
              Descrição
              <input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
            <label>
              Valor
              <input
                type="number"
                step="0.01"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </label>
            <label>
              Pagamento
              <select
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              >
                {["Dinheiro", "PIX", "Débito", "Crédito"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <button className="primary-button span2" onClick={save}>
              Salvar despesa
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function SimpleCrud({ title, eyebrow, subtitle, rows, columns, onNew }: any) {
  return (
    <>
      <Header
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        action={
          <button className="primary-button compact" onClick={onNew}>
            <Plus size={17} />
            Novo Registro
          </button>
        }
      />
      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((c: any) => (
                  <th key={c[0]}>{c[0]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id}>
                  {columns.map((c: any) => (
                    <td key={c[0]}>
                      {typeof c[1] === "function" ? c[1](r) : r[c[1]]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
function Suppliers({ state, user, refresh }: any) {
  const [show, setShow] = useState(false);
  const [f, setF] = useState<any>({
    name: "",
    doc: "",
    phone: "",
    contact: "",
  });
  async function save() {
    if (!f.name) return;
    try {
      await salvarCadastro("fornecedores", user.empresaId, {
        razao_social: f.name.trim(),
        cpf_cnpj: f.doc?.trim() || null,
        telefone: f.phone?.trim() || null,
        contato: f.contact?.trim() || null,
      });
      await refresh();
      setShow(false);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o fornecedor.",
      );
    }
  }
  return (
    <>
      {
        <SimpleCrud
          title="Fornecedores"
          eyebrow="CADASTROS"
          subtitle="Distribuidoras e demais fornecedores."
          rows={state.suppliers}
          columns={[
            ["Razão Social", "name"],
            ["CNPJ", "doc"],
            ["Telefone", "phone"],
            ["Contato", "contact"],
          ]}
          onNew={() => setShow(true)}
        />
      }{" "}
      {show && (
        <Modal title="Novo Fornecedor" onClose={() => setShow(false)}>
          <div className="form-grid">
            <label>
              Razão Social
              <input
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
              />
            </label>
            <label>
              CNPJ
              <input
                value={f.doc}
                onChange={(e) => setF({ ...f, doc: e.target.value })}
              />
            </label>
            <label>
              Telefone
              <input
                value={f.phone}
                onChange={(e) => setF({ ...f, phone: e.target.value })}
              />
            </label>
            <label>
              Contato
              <input
                value={f.contact}
                onChange={(e) => setF({ ...f, contact: e.target.value })}
              />
            </label>
            <button className="primary-button span2" onClick={save}>
              Salvar fornecedor
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function Employees({ state, user, refresh }: any) {
  const [show, setShow] = useState(false);
  const [f, setF] = useState<any>({
    name: "",
    doc: "",
    phone: "",
    role: "Frentista",
    active: true,
  });
  async function save() {
    if (!f.name) return;
    try {
      await salvarCadastro("funcionarios", user.empresaId, {
        nome: f.name.trim(),
        cpf: f.doc?.trim() || null,
        telefone: f.phone?.trim() || null,
        cargo: f.role,
        ativo: Boolean(f.active),
      });
      await refresh();
      setShow(false);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o funcionário.",
      );
    }
  }
  return (
    <>
      <SimpleCrud
        title="Funcionários"
        eyebrow="EQUIPE"
        subtitle="Frentistas, caixas, gerentes e administrativo."
        rows={state.employees}
        columns={[
          ["Nome", "name"],
          ["CPF", "doc"],
          ["Telefone", "phone"],
          ["Função", "role"],
          [
            "Status",
            (x: Employee) => <Status>{x.active ? "Ativo" : "Inativo"}</Status>,
          ],
        ]}
        onNew={() => setShow(true)}
      />
      {show && (
        <Modal title="Novo Funcionário" onClose={() => setShow(false)}>
          <div className="form-grid">
            <label>
              Nome
              <input
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
              />
            </label>
            <label>
              CPF
              <input
                value={f.doc}
                onChange={(e) => setF({ ...f, doc: e.target.value })}
              />
            </label>
            <label>
              Telefone
              <input
                value={f.phone}
                onChange={(e) => setF({ ...f, phone: e.target.value })}
              />
            </label>
            <label>
              Função
              <select
                value={f.role}
                onChange={(e) => setF({ ...f, role: e.target.value })}
              >
                {[
                  "Frentista",
                  "Caixa",
                  "Gerente",
                  "Administrativo",
                  "Outros",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <button className="primary-button span2" onClick={save}>
              Salvar funcionário
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function LegacyUsersPage({ state, setState, audit }: any) {
  const [show, setShow] = useState(false);
  const [f, setF] = useState<any>({
    name: "",
    email: "",
    role: "Frentista",
    active: true,
  });
  function save() {
    if (!f.name || !f.email) return;
    const x = { id: uid(), ...f };
    setState((s: State) => ({ ...s, users: [x, ...s.users] }));
    audit("Usuários", "Cadastro", f.email);
    setShow(false);
  }
  return (
    <>
      <SimpleCrud
        title="Usuários"
        eyebrow="SEGURANÇA"
        subtitle="Perfis de acesso ao sistema."
        rows={state.users}
        columns={[
          ["Nome", "name"],
          ["E-mail", "email"],
          ["Perfil", "role"],
          [
            "Status",
            (x: AppUser) => <Status>{x.active ? "Ativo" : "Inativo"}</Status>,
          ],
        ]}
        onNew={() => setShow(true)}
      />
      {show && (
        <Modal title="Novo Usuário" onClose={() => setShow(false)}>
          <div className="form-grid">
            <label>
              Nome
              <input
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
              />
            </label>
            <label>
              E-mail
              <input
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
              />
            </label>
            <label>
              Perfil
              <select
                value={f.role}
                onChange={(e) => setF({ ...f, role: e.target.value })}
              >
                <option>Administrador</option>
                <option>Gerente</option>
                <option>Frentista</option>
              </select>
            </label>
            <button className="primary-button span2" onClick={save}>
              Salvar usuário
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function UsersPage({ state, refresh, currentUser }: any) {
  const blank = {
    name: "",
    email: "",
    role: "Frentista",
    active: true,
    password: "",
    confirmPassword: "",
    automatic: false,
    showPassword: false,
  };
  const [form, setForm] = useState<any>(null);
  const [resetForm, setResetForm] = useState<any>(null);
  const [success, setSuccess] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const roleDb = (role: Role) =>
    (
      ({
        Administrador: "administrador",
        Gerente: "gerente",
        Frentista: "frentista",
      }) as const
    )[role];
  function generate() {
    const sets = [
      "ABCDEFGHJKLMNPQRSTUVWXYZ",
      "abcdefghijkmnopqrstuvwxyz",
      "23456789",
      "!@#$%&*",
    ];
    const all = sets.join("");
    const pick = (chars: string) =>
      chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length];
    let value = sets.map(pick).join("");
    while (value.length < 12) value += pick(all);
    return value
      .split("")
      .sort(() => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 - 0.5)
      .join("");
  }
  function automatic(checked: boolean) {
    const password = checked ? generate() : "";
    setForm({
      ...form,
      automatic: checked,
      password,
      confirmPassword: password,
    });
  }
  function validate() {
    if (!form.name.trim()) return "Informe o nome completo.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "Informe um e-mail válido.";
    if (
      state.users.some(
        (u: AppUser) =>
          u.email.toLowerCase() === form.email.trim().toLowerCase(),
      )
    )
      return "Já existe um usuário com este e-mail.";
    if (!form.role) return "Selecione o perfil.";
    if (form.password.length < 8)
      return "A senha deve ter pelo menos 8 caracteres.";
    if (form.password !== form.confirmPassword)
      return "As senhas não coincidem.";
    return "";
  }
  async function create() {
    const error = validate();
    if (error) return alert(error);
    setSaving(true);
    try {
      const result = await gerenciarUsuario({
        action: "create",
        nome: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        perfil: roleDb(form.role),
        ativo: form.active,
        password: form.password,
      });
      if (result.success !== true || !result.user_id)
        throw new Error(
          "Não foi possível confirmar a criação no Supabase Auth.",
        );
      await refresh();
      setSuccess({
        title: "Usuário criado com sucesso",
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      setForm(null);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o usuário.",
      );
    } finally {
      setSaving(false);
    }
  }
  function openReset(user: AppUser) {
    setResetForm({
      user,
      password: "",
      confirmPassword: "",
      automatic: false,
      showPassword: false,
    });
  }
  function resetAutomatic(checked: boolean) {
    const password = checked ? generate() : "";
    setResetForm({
      ...resetForm,
      automatic: checked,
      password,
      confirmPassword: password,
    });
  }
  async function reset() {
    if (resetForm.password.length < 8)
      return alert("A senha deve ter pelo menos 8 caracteres.");
    if (resetForm.password !== resetForm.confirmPassword)
      return alert("As senhas não coincidem.");
    setSaving(true);
    try {
      await gerenciarUsuario({
        action: "reset_password",
        user_id: resetForm.user.id,
        password: resetForm.password,
      });
      setSuccess({
        title: "Senha redefinida com sucesso",
        name: resetForm.user.name,
        email: resetForm.user.email,
        password: resetForm.password,
      });
      setResetForm(null);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível redefinir a senha.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function edit(user: AppUser) {
    const nome = prompt("Nome completo:", user.name);
    if (!nome) return;
    const perfil = prompt(
      "Perfil (Administrador, Gerente ou Frentista):",
      user.role,
    ) as Role | null;
    if (!perfil || !["Administrador", "Gerente", "Frentista"].includes(perfil))
      return alert("Perfil inválido.");
    setSaving(true);
    try {
      await gerenciarUsuario({
        action: "update_profile",
        user_id: user.id,
        nome: nome.trim(),
        perfil: roleDb(perfil),
      });
      await refresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível editar o usuário.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function toggle(user: AppUser) {
    setSaving(true);
    try {
      await gerenciarUsuario({
        action: "update_profile",
        user_id: user.id,
        ativo: !user.active,
      });
      await refresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o usuário.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function copyAccess() {
    if (!success) return;
    await navigator.clipboard.writeText(
      `Acesso ao ${state.stationName}\n\nE-mail: ${success.email}\nSenha temporária: ${success.password}`,
    );
    alert("Dados de acesso copiados.");
  }
  return (
    <>
      <Header
        eyebrow="SEGURANÇA"
        title="Usuários"
        subtitle="Perfis de acesso ao sistema."
        action={
          currentUser.role === "Administrador" ? (
            <button
              className="primary-button compact"
              onClick={() => setForm({ ...blank })}
            >
              <Plus size={17} />
              Novo Registro
            </button>
          ) : undefined
        }
      />
      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {state.users.map((u: AppUser) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    <Status tone={u.active ? "green" : "gray"}>
                      {u.active ? "Ativo" : "Inativo"}
                    </Status>
                  </td>
                  <td>
                    {currentUser.role === "Administrador" && (
                      <div className="table-actions">
                        <button
                          className="small-action"
                          disabled={saving}
                          onClick={() => edit(u)}
                        >
                          Editar
                        </button>
                        <button
                          className="small-action"
                          disabled={saving}
                          onClick={() => openReset(u)}
                        >
                          Redefinir senha
                        </button>
                        <button
                          className="table-icon"
                          disabled={saving || u.id === currentUser.id}
                          onClick={() => toggle(u)}
                          title={u.active ? "Desativar" : "Ativar"}
                        >
                          {u.active ? (
                            <X size={16} />
                          ) : (
                            <CheckCircle2 size={16} />
                          )}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {form && (
        <Modal title="Novo Usuário" onClose={() => !saving && setForm(null)}>
          <div className="form-grid">
            <label>
              Nome completo
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              E-mail
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              Perfil
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option>Administrador</option>
                <option>Gerente</option>
                <option>Frentista</option>
              </select>
            </label>
            <label>
              Status
              <select
                value={form.active ? "Ativo" : "Inativo"}
                onChange={(e) =>
                  setForm({ ...form, active: e.target.value === "Ativo" })
                }
              >
                <option>Ativo</option>
                <option>Inativo</option>
              </select>
            </label>
            <label className="span2">
              <input
                type="checkbox"
                checked={form.automatic}
                onChange={(e) => automatic(e.target.checked)}
              />{" "}
              Gerar senha automática
            </label>
            <label>
              Senha inicial
              <div className="password-field">
                <input
                  type={form.showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      password: e.target.value,
                      automatic: false,
                    })
                  }
                />
                <button
                  type="button"
                  className="table-icon"
                  onClick={() =>
                    setForm({ ...form, showPassword: !form.showPassword })
                  }
                >
                  {form.showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <label>
              Confirmar senha
              <input
                type={form.showPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({
                    ...form,
                    confirmPassword: e.target.value,
                    automatic: false,
                  })
                }
              />
            </label>
            <button
              className="primary-button span2"
              disabled={saving}
              onClick={create}
            >
              {saving ? "Criando..." : "Criar usuário"}
            </button>
          </div>
        </Modal>
      )}
      {resetForm && (
        <Modal
          title="Redefinir senha"
          onClose={() => !saving && setResetForm(null)}
        >
          <div className="form-grid">
            <label className="span2">
              Usuário
              <input
                readOnly
                value={`${resetForm.user.name} — ${resetForm.user.email}`}
              />
            </label>
            <label className="span2">
              <input
                type="checkbox"
                checked={resetForm.automatic}
                onChange={(e) => resetAutomatic(e.target.checked)}
              />{" "}
              Gerar nova senha temporária
            </label>
            <label>
              Nova senha
              <div className="password-field">
                <input
                  type={resetForm.showPassword ? "text" : "password"}
                  value={resetForm.password}
                  onChange={(e) =>
                    setResetForm({
                      ...resetForm,
                      password: e.target.value,
                      automatic: false,
                    })
                  }
                />
                <button
                  type="button"
                  className="table-icon"
                  onClick={() =>
                    setResetForm({
                      ...resetForm,
                      showPassword: !resetForm.showPassword,
                    })
                  }
                >
                  {resetForm.showPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </label>
            <label>
              Confirmar senha
              <input
                type={resetForm.showPassword ? "text" : "password"}
                value={resetForm.confirmPassword}
                onChange={(e) =>
                  setResetForm({
                    ...resetForm,
                    confirmPassword: e.target.value,
                    automatic: false,
                  })
                }
              />
            </label>
            <button
              className="primary-button span2"
              disabled={saving}
              onClick={reset}
            >
              {saving ? "Redefinindo..." : "Redefinir senha"}
            </button>
          </div>
        </Modal>
      )}
      {success && (
        <Modal title={success.title} onClose={() => setSuccess(null)}>
          <div className="form-grid">
            <label>
              Nome
              <input readOnly value={success.name} />
            </label>
            <label>
              E-mail
              <input readOnly value={success.email} />
            </label>
            <label className="span2">
              Senha temporária
              <input readOnly value={success.password} />
            </label>
            <button className="primary-button span2" onClick={copyAccess}>
              Copiar dados de acesso
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function AuditPage({ state }: { state: State }) {
  return (
    <>
      <Header
        eyebrow="SEGURANÇA"
        title="Auditoria"
        subtitle="Histórico das operações críticas do sistema."
      />
      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Usuário</th>
                <th>Módulo</th>
                <th>Ação</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {state.audits.map((a) => (
                <tr key={a.id}>
                  <td>{dateBR(a.date)}</td>
                  <td>{a.user}</td>
                  <td>{a.module}</td>
                  <td>{a.action}</td>
                  <td>{a.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
function Reports({ state, user }: { state: State; user: AppUser }) {
  const totalSales = state.sales
    .filter((s) => s.status === "Ativa")
    .reduce((a, s) => a + s.total, 0);
  const litersSold = state.sales
    .filter((s) => s.status === "Ativa")
    .reduce((a, s) => a + s.liters, 0);
  const expenses = state.expenses.reduce((a, e) => a + e.value, 0);
  const cost = state.sales
    .filter((s) => s.status === "Ativa")
    .reduce(
      (a, s) =>
        a +
        s.liters * (state.fuels.find((f) => f.id === s.fuelId)?.costPrice || 0),
      0,
    );
  return (
    <>
      <Header
        eyebrow="ANÁLISES"
        title="Relatórios"
        subtitle="Resumo financeiro e operacional da base atual."
        action={
          <div className="head-actions">
            <PdfReportButton
              kind="sales"
              state={state}
              user={user}
              label="Relatório de Vendas"
            />
            <PdfReportButton
              kind="managerial"
              state={state}
              user={user}
              label="Relatório Gerencial"
            />
          </div>
        }
      />
      <section className="stats-grid">
        <Card
          title="Faturamento"
          value={money(totalSales)}
          sub="Vendas ativas"
          icon={BarChart3}
        />
        <Card
          title="Litros vendidos"
          value={liters(litersSold)}
          sub="Total acumulado"
          icon={Droplets}
          tone="blue"
        />
        <Card
          title="Despesas"
          value={money(expenses)}
          sub="Total registrado"
          icon={ReceiptText}
          tone="orange"
        />
        <Card
          title="Margem estimada"
          value={money(totalSales - cost - expenses)}
          sub="Venda - custo - despesas"
          icon={BadgeDollarSign}
        />
      </section>
      <div className="report-grid section-block">
        {state.fuels.map((f) => {
          const ss = state.sales.filter(
            (s) => s.status === "Ativa" && s.fuelId === f.id,
          );
          return (
            <div className="panel" key={f.id}>
              <span className="eyebrow">{f.name}</span>
              <h2>{money(ss.reduce((a, s) => a + s.total, 0))}</h2>
              <p>{liters(ss.reduce((a, s) => a + s.liters, 0))} vendidos</p>
            </div>
          );
        })}
      </div>
    </>
  );
}
function SettingsPage({ state, user, refresh }: any) {
  const [f, setF] = useState({
    stationName: state.stationName,
    legalName: state.legalName,
    cnpj: state.cnpj,
    address: state.address,
    neighborhood: state.neighborhood,
    municipality: state.municipality,
    stateCode: state.stateCode,
    zipCode: state.zipCode,
  });
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!f.stationName.trim()) return alert("Informe o nome fantasia.");
    setSaving(true);
    try {
      await salvarEmpresa(user.empresaId, {
        nome_fantasia: f.stationName.trim(),
        razao_social: f.legalName.trim() || null,
        cnpj: f.cnpj.trim() || null,
        endereco: f.address.trim() || null,
        bairro: f.neighborhood.trim() || null,
        cidade: f.municipality.trim() || null,
        estado: f.stateCode.trim().toUpperCase() || null,
        cep: f.zipCode.trim() || null,
      });
      await refresh();
      alert("Configurações da empresa salvas com sucesso.");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar os dados da empresa.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <Header
        eyebrow="SISTEMA"
        title="Configurações"
        subtitle="Dados gerais da unidade."
      />
      <div className="panel settings-card">
        <div className="form-grid">
          <label>
            Nome fantasia
            <input
              value={f.stationName}
              onChange={(e) => setF({ ...f, stationName: e.target.value })}
            />
          </label>
          <label>
            Razão social
            <input
              value={f.legalName}
              onChange={(e) => setF({ ...f, legalName: e.target.value })}
            />
          </label>
          <label>
            CNPJ
            <input
              value={f.cnpj}
              onChange={(e) => setF({ ...f, cnpj: e.target.value })}
            />
          </label>
          <label>
            Endereço
            <input
              value={f.address}
              onChange={(e) => setF({ ...f, address: e.target.value })}
            />
          </label>
          <label>
            Bairro
            <input
              value={f.neighborhood}
              onChange={(e) => setF({ ...f, neighborhood: e.target.value })}
            />
          </label>
          <label>
            Cidade
            <input
              value={f.municipality}
              onChange={(e) => setF({ ...f, municipality: e.target.value })}
            />
          </label>
          <label>
            UF
            <input
              maxLength={2}
              value={f.stateCode}
              onChange={(e) => setF({ ...f, stateCode: e.target.value })}
            />
          </label>
          <label>
            CEP
            <input
              value={f.zipCode}
              onChange={(e) => setF({ ...f, zipCode: e.target.value })}
            />
          </label>
          <div />
          <button className="primary-button" disabled={saving} onClick={save}>
            {saving ? "Salvando..." : "Salvar configurações"}
          </button>
        </div>
      </div>
      {user.role === "Administrador" && state.allowTestDataReset && (
        <TestDataCleanup state={state} refresh={refresh} />
      )}
    </>
  );
}

const n = (v: unknown) => Number(v || 0);
const s = (v: unknown) => String(v || "");
function mapearDados(
  db: Record<string, Record<string, unknown>[]>,
  empresa: Record<string, unknown>,
): State {
  return {
    stationName: s(empresa.nome_fantasia || empresa.razao_social),
    legalName: s(empresa.razao_social),
    cnpj: s(empresa.cnpj),
    address: [empresa.endereco || empresa.logradouro, empresa.numero]
      .filter(Boolean)
      .join(", "),
    neighborhood: s(empresa.bairro),
    municipality: s(empresa.cidade),
    stateCode: s(empresa.estado),
    zipCode: s(empresa.cep),
    city: [empresa.cidade, empresa.estado].filter(Boolean).join(" - "),
    allowTestDataReset: empresa.allow_test_data_reset !== false,
    fuels: (db.combustiveis || []).map((x) => ({
      id: s(x.id),
      name: s(x.nome),
      sellPrice: n(x.preco_venda),
      costPrice: n(x.custo_por_litro),
      min: n(x.estoque_minimo_litros),
      active: Boolean(x.ativo),
      mustChange: Boolean(x.must_change_password),
      phone: s(x.telefone),
      jobTitle: s(x.cargo),
      avatarPath: s(x.avatar_url),
      createdAt: s(x.created_at),
    })),
    tanks: (db.tanques || []).map((x) => ({
      id: s(x.id),
      name: s(x.nome),
      fuelId: s(x.combustivel_id),
      capacity: n(x.capacidade_litros),
      liters: n(x.estoque_atual_litros),
    })),
    pumps: (db.bombas || []).map((x) => ({
      id: s(x.id),
      name: s(x.nome),
      tankId: s(x.tanque_id),
      active: Boolean(x.ativo),
    })),
    clients: (db.clientes || []).map((x) => ({
      id: s(x.id),
      name: s(x.nome || x.razao_social),
      doc: s(x.cpf_cnpj || x.documento),
      phone: s(x.telefone),
      limit: n(x.limite_credito),
      status: (x.ativo === false
        ? "Inativo"
        : s(x.status) === "bloqueado"
          ? "Bloqueado"
          : "Ativo") as Client["status"],
      notes: s(x.observacoes),
    })),
    sales: (db.vendas || []).map((x) => ({
      id: s(x.id),
      date: s(x.data_venda || x.created_at),
      clientId: x.cliente_id ? s(x.cliente_id) : undefined,
      employeeId: x.funcionario_id ? s(x.funcionario_id) : undefined,
      fuelId: s(x.combustivel_id),
      tankId: s(x.tanque_id),
      pumpId: x.bomba_id ? s(x.bomba_id) : undefined,
      liters: n(x.litros),
      price: n(x.preco_por_litro),
      total: n(x.valor_total),
      payment: pagamentoParaInterface(s(x.forma_pagamento)) as PaymentMethod,
      status: s(x.status) === "cancelada" ? "Cancelada" : "Ativa",
    })),
    receivables: (db.contas_receber || []).map((x) => ({
      id: s(x.id),
      saleId: s(x.venda_id),
      clientId: s(x.cliente_id),
      original: n(x.valor_original),
      paid: n(x.valor_pago),
      due: s(x.data_vencimento),
      status:
        s(x.status) === "pago"
          ? "Pago"
          : s(x.status) === "parcial"
            ? "Parcial"
            : s(x.status) === "cancelado"
              ? "Cancelado"
              : "Em aberto",
    })),
    cashSessions: (db.caixas || []).map((x) => ({
      id: s(x.id),
      openedAt: s(x.aberto_em || x.data_abertura || x.created_at),
      closedAt: x.fechado_em ? s(x.fechado_em) : undefined,
      opening: n(x.saldo_inicial),
      closingDeclared: x.saldo_contado == null ? undefined : n(x.saldo_contado),
      status: s(x.status) === "aberto" ? "Aberto" : "Fechado",
      operator: s(x.operador_nome || x.usuario_nome),
    })),
    cashMoves: (db.movimentacoes_caixa || []).map((x) => ({
      id: s(x.id),
      cashId: s(x.caixa_id),
      date: s(x.data_movimentacao || x.created_at),
      type:
        (
          {
            venda: "Venda",
            recebimento: "Recebimento",
            entrada: "Entrada",
            saida: "Saída",
            sangria: "Sangria",
            suprimento: "Suprimento",
            despesa: "Despesa",
          } as Record<string, CashMove["type"]>
        )[s(x.tipo).toLowerCase()] || (s(x.tipo) as CashMove["type"]),
      value: n(x.valor),
      method: x.forma_pagamento
        ? (pagamentoParaInterface(s(x.forma_pagamento)) as PaymentMethod)
        : undefined,
      description: s(x.descricao),
      refId: x.referencia_id ? s(x.referencia_id) : undefined,
    })),
    expenses: (db.despesas || []).map((x) => ({
      id: s(x.id),
      date: s(x.data_despesa || x.created_at),
      category: s(x.categoria),
      description: s(x.descricao),
      value: n(x.valor),
      method: pagamentoParaInterface(s(x.forma_pagamento)) as PaymentMethod,
      supplierId: x.fornecedor_id ? s(x.fornecedor_id) : undefined,
    })),
    suppliers: (db.fornecedores || []).map((x) => ({
      id: s(x.id),
      name: s(x.razao_social || x.nome_fantasia),
      doc: s(x.cpf_cnpj),
      phone: s(x.telefone),
      contact: s(x.contato),
    })),
    employees: (db.funcionarios || []).map((x) => ({
      id: s(x.id),
      name: s(x.nome),
      doc: s(x.cpf),
      phone: s(x.telefone),
      role: s(x.funcao),
      active: Boolean(x.ativo),
    })),
    users: (db.perfis || []).map((x) => ({
      id: s(x.id),
      empresaId: s(x.empresa_id),
      name: s(x.nome),
      email: s(x.email),
      role: ({
        administrador: "Administrador",
        gerente: "Gerente",
        frentista: "Frentista",
      }[s(x.perfil)] || "Frentista") as Role,
      active: Boolean(x.ativo),
    })),
    audits: (db.auditoria || []).map((x) => ({
      id: s(x.id),
      date: s(x.created_at || x.data),
      user: s(x.usuario_nome || x.usuario_id),
      module: s(x.modulo || x.tabela),
      action: s(x.acao),
      detail: s(x.descricao || x.detalhes),
    })),
    stockMoves: (db.movimentacoes_tanque || []).map((x) => ({
      id: s(x.id),
      date: s(x.created_at || x.data_movimentacao),
      tankId: s(x.tanque_id),
      type:
        (
          {
            entrada: "Entrada",
            venda: "Venda",
            ajuste: "Ajuste",
            cancelamento: "Cancelamento",
          } as Record<string, StockMove["type"]>
        )[s(x.tipo).toLowerCase()] || (s(x.tipo) as StockMove["type"]),
      liters: n(x.litros),
      description: s(x.observacoes),
    })),
  };
}

export default function App() {
  const [state, setState] = useState<State>(emptyState);
  const [dataError, setDataError] = useState("");
  const [user, setUser] = useState<AppUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [passwordChange, setPasswordChange] = useState({
    password: "",
    confirm: "",
    show: false,
    saving: false,
  });

  async function carregarUsuario() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setUser(null);
        return;
      }

      const { perfil, empresa } = await carregarContextoUsuario(
        session.user.id,
      );

      if (!perfil.ativo) {
        await supabase.auth.signOut();
        setUser(null);
        return;
      }

      const roleMap: Record<string, Role> = {
        administrador: "Administrador",
        gerente: "Gerente",
        frentista: "Frentista",
      };

      const role = roleMap[perfil.perfil];

      if (!role) {
        await supabase.auth.signOut();
        setUser(null);
        return;
      }

      setUser({
        id: perfil.id,
        empresaId: perfil.empresa_id,
        name: perfil.nome || session.user.email || "Usuário",
        email: perfil.email || session.user.email || "",
        role,
        active: perfil.ativo,
        mustChange: Boolean(perfil.must_change_password),
        phone: s(perfil.telefone),
        jobTitle: s(perfil.cargo),
        avatarPath: s(perfil.avatar_url),
        createdAt: s(perfil.created_at),
      });
      const dados = await carregarDadosPosto(perfil.empresa_id);
      setState(mapearDados(dados, empresa));
      setDataError("");
    } catch (error) {
      console.error("Erro ao verificar sessão:", error);
      setDataError(
        error instanceof Error
          ? error.message
          : "NÃ£o foi possÃ­vel carregar os dados do posto.",
      );
    } finally {
      setCheckingSession(false);
    }
  }

  useEffect(() => {
    carregarUsuario();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setCheckingSession(false);
      }

      if (event === "SIGNED_IN") {
        carregarUsuario();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function login() {
    setCheckingSession(true);
    await carregarUsuario();
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  async function refreshData() {
    if (!user) return;
    const { perfil, empresa } = await carregarContextoUsuario(user.id);
    const dados = await carregarDadosPosto(user.empresaId);
    setState(mapearDados(dados, empresa));
    setUser((current) =>
      current
        ? {
            ...current,
            name: s(perfil.nome) || current.name,
            email: s(perfil.email) || current.email,
            phone: s(perfil.telefone),
            jobTitle: s(perfil.cargo),
            avatarPath: s(perfil.avatar_url),
            createdAt: s(perfil.created_at),
          }
        : current,
    );
  }

  async function completeFirstAccess() {
    if (passwordChange.password.length < 8)
      return alert("A nova senha deve ter pelo menos 8 caracteres.");
    if (passwordChange.password !== passwordChange.confirm)
      return alert("As senhas não coincidem.");
    setPasswordChange((x) => ({ ...x, saving: true }));
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordChange.password,
      });
      if (error) throw error;
      const { error: flagError } = await supabase.rpc("concluir_troca_senha");
      if (flagError) throw flagError;
      setUser((u) => (u ? { ...u, mustChange: false } : u));
      setPasswordChange({
        password: "",
        confirm: "",
        show: false,
        saving: false,
      });
    } catch (error) {
      console.error("Troca obrigatória de senha", error);
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar a senha.",
      );
      setPasswordChange((x) => ({ ...x, saving: false }));
    }
  }

  if (checkingSession) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        Carregando...
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={login} />;
  }

  if (dataError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <div className="panel">
          <h2>Não foi possível carregar o sistema</h2>
          <p>{dataError}</p>
          <button className="primary-button" onClick={carregarUsuario}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (user.mustChange) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <div className="modal" style={{ position: "static" }}>
          <div className="modal-head">
            <h2>Por segurança, altere sua senha para continuar.</h2>
          </div>
          <div className="form-grid">
            <label>
              Nova senha
              <div className="password-field">
                <input
                  type={passwordChange.show ? "text" : "password"}
                  value={passwordChange.password}
                  onChange={(e) =>
                    setPasswordChange({
                      ...passwordChange,
                      password: e.target.value,
                    })
                  }
                />
                <button
                  type="button"
                  className="table-icon"
                  onClick={() =>
                    setPasswordChange({
                      ...passwordChange,
                      show: !passwordChange.show,
                    })
                  }
                >
                  {passwordChange.show ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </label>
            <label>
              Confirmar nova senha
              <input
                type={passwordChange.show ? "text" : "password"}
                value={passwordChange.confirm}
                onChange={(e) =>
                  setPasswordChange({
                    ...passwordChange,
                    confirm: e.target.value,
                  })
                }
              />
            </label>
            <button
              className="primary-button span2"
              disabled={passwordChange.saving}
              onClick={completeFirstAccess}
            >
              {passwordChange.saving
                ? "Alterando..."
                : "Alterar senha e continuar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      state={state}
      setState={setState}
      user={user}
      onLogout={logout}
      refresh={refreshData}
    />
  );
}
