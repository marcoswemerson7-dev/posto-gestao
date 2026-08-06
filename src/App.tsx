import { useEffect, useMemo, useState } from 'react';
import { generateCashReport } from './cashReport';
import {
  LayoutDashboard, WalletCards, Fuel, Users, BadgeDollarSign, ReceiptText, Warehouse, Truck,
  UserRoundCog, BarChart3, ShieldCheck, Settings, LogOut, CircleDollarSign, Plus, Search,
  X, CheckCircle2, AlertTriangle, Banknote, CreditCard, Smartphone, Gauge, Pencil, Trash2,
  ArrowDownToLine, ArrowUpFromLine, RefreshCw, LockKeyhole, Mail, Eye, EyeOff, Menu,
  UserCog, FileText, Droplets, CalendarDays, PackageCheck, Download, SlidersHorizontal,
  MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown, Printer, CirclePlus
} from 'lucide-react';

type Page = 'Dashboard'|'Caixa'|'Vendas'|'Combustíveis'|'Estoque'|'Clientes'|'Contas a Receber'|'Despesas'|'Fornecedores'|'Funcionários'|'Relatórios'|'Usuários'|'Auditoria'|'Configurações';
type PaymentMethod = 'Dinheiro'|'PIX'|'Débito'|'Crédito'|'Prazo';
type Role = 'Administrador'|'Gerente'|'Operador';

type Client = { id:string; name:string; doc:string; phone:string; limit:number; status:'Ativo'|'Bloqueado'|'Inativo'; notes:string };
type FuelItem = { id:string; name:string; sellPrice:number; costPrice:number; min:number; active:boolean };
type Tank = { id:string; name:string; fuelId:string; capacity:number; liters:number };
type Sale = { id:string; date:string; clientId?:string; employeeId?:string; fuelId:string; tankId:string; liters:number; price:number; total:number; payment:PaymentMethod; status:'Ativa'|'Cancelada' };
type Receivable = { id:string; saleId:string; clientId:string; original:number; paid:number; due:string; status:'Em aberto'|'Parcial'|'Pago'|'Cancelado' };
type CashSession = { id:string; openedAt:string; closedAt?:string; opening:number; closingDeclared?:number; status:'Aberto'|'Fechado'; operator:string };
type CashMove = { id:string; cashId:string; date:string; type:'Venda'|'Recebimento'|'Entrada'|'Saída'|'Sangria'|'Suprimento'|'Despesa'; value:number; method?:PaymentMethod; description:string; refId?:string };
type Expense = { id:string; date:string; category:string; description:string; value:number; method:PaymentMethod; supplierId?:string };
type Supplier = { id:string; name:string; doc:string; phone:string; contact:string };
type Employee = { id:string; name:string; doc:string; phone:string; role:string; active:boolean };
type AppUser = { id:string; name:string; email:string; role:Role; active:boolean };
type Audit = { id:string; date:string; user:string; module:string; action:string; detail:string };
type StockMove = { id:string; date:string; tankId:string; type:'Entrada'|'Venda'|'Ajuste'|'Cancelamento'; liters:number; description:string };
type State = {
  stationName:string; cnpj:string; city:string;
  clients:Client[]; fuels:FuelItem[]; tanks:Tank[]; sales:Sale[]; receivables:Receivable[];
  cashSessions:CashSession[]; cashMoves:CashMove[]; expenses:Expense[]; suppliers:Supplier[];
  employees:Employee[]; users:AppUser[]; audits:Audit[]; stockMoves:StockMove[];
};

const uid = () => Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
const nowIso = () => new Date().toISOString();
const money = (v:number) => v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const liters = (v:number) => `${v.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:3})} L`;
const dateBR = (v:string) => new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
const dayISO = (days=0) => { const d=new Date(); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); };

const initialState:State = {
  stationName:'Posto dos Cerrados', cnpj:'00.000.000/0001-00', city:'Ribeiro Gonçalves - PI',
  clients:[
    {id:'c1',name:'Transportes Almeida',doc:'12.345.678/0001-90',phone:'(89) 99999-1111',limit:10000,status:'Ativo',notes:''},
    {id:'c2',name:'João Ferreira',doc:'123.456.789-00',phone:'(89) 98888-2222',limit:3000,status:'Ativo',notes:''},
    {id:'c3',name:'Fazenda Boa Vista',doc:'45.222.111/0001-10',phone:'(89) 97777-3333',limit:15000,status:'Ativo',notes:''},
  ],
  fuels:[
    {id:'f1',name:'Gasolina Comum',sellPrice:6.19,costPrice:5.38,min:2500,active:true},
    {id:'f2',name:'Gasolina Aditivada',sellPrice:6.49,costPrice:5.67,min:1800,active:true},
    {id:'f3',name:'Etanol',sellPrice:4.39,costPrice:3.64,min:1500,active:true},
    {id:'f4',name:'Diesel S10',sellPrice:6.09,costPrice:5.42,min:2200,active:true},
    {id:'f5',name:'Diesel S500',sellPrice:5.99,costPrice:5.30,min:1800,active:true},
  ],
  tanks:[
    {id:'t1',name:'Tanque 01',fuelId:'f1',capacity:15000,liters:11840},
    {id:'t2',name:'Tanque 02',fuelId:'f2',capacity:10000,liters:6240},
    {id:'t3',name:'Tanque 03',fuelId:'f3',capacity:8000,liters:3920},
    {id:'t4',name:'Tanque 04',fuelId:'f4',capacity:12000,liters:8750},
    {id:'t5',name:'Tanque 05',fuelId:'f5',capacity:10000,liters:7100},
  ],
  sales:[], receivables:[],
  cashSessions:[{id:'cx1',openedAt:nowIso(),opening:500,status:'Aberto',operator:'Administrador'}], cashMoves:[], expenses:[],
  suppliers:[{id:'s1',name:'Distribuidora Regional de Combustíveis',doc:'10.987.654/0001-22',phone:'(86) 3333-0000',contact:'Comercial'}],
  employees:[{id:'e1',name:'Carlos Silva',doc:'111.222.333-44',phone:'(89) 99999-1234',role:'Frentista',active:true},{id:'e2',name:'Ana Souza',doc:'222.333.444-55',phone:'(89) 99999-5678',role:'Caixa',active:true}],
  users:[{id:'u1',name:'Administrador',email:'admin@postogestao.com',role:'Administrador',active:true},{id:'u2',name:'Gerente',email:'gerente@postogestao.com',role:'Gerente',active:true}],
  audits:[{id:'a1',date:nowIso(),user:'Sistema',module:'Sistema',action:'Inicialização',detail:'Base demonstrativa criada'}], stockMoves:[]
};

function usePersistentState(){
  const [state,setState] = useState<State>(()=>{ try { const s=localStorage.getItem('posto-gestao-state-v2'); return s?JSON.parse(s):initialState } catch { return initialState } });
  useEffect(()=>localStorage.setItem('posto-gestao-state-v2',JSON.stringify(state)),[state]);
  return [state,setState] as const;
}

function Login({onLogin}:{onLogin:(u:AppUser)=>void}){
  const [email,setEmail]=useState('admin@postogestao.com');
  const [password,setPassword]=useState('123456');
  const [show,setShow]=useState(false);
  const [error,setError]=useState('');

  function submit(e:React.FormEvent){
    e.preventDefault();
    if((email==='admin@postogestao.com'||email==='gerente@postogestao.com')&&password==='123456'){
      onLogin({
        id:'u1',
        name:email.startsWith('gerente')?'Gerente':'Administrador',
        email,
        role:email.startsWith('gerente')?'Gerente':'Administrador',
        active:true
      });
    } else {
      setError('E-mail ou senha inválidos.');
    }
  }

  return (
    <div className="login-shell">
      <section className="login-brand-panel">
        <div className="login-brand-content">
          <img className="login-logo-large" src="/logo-posto.png" alt="Posto dos Cerrados" />
          <h1>Posto dos Cerrados</h1>
          <div className="login-title-line" />
          <p>Gestão inteligente de caixa, vendas, estoque em litros, clientes e contas a receber.</p>
        </div>
      </section>

      <section className="login-card-wrap">
        <form className="login-card" onSubmit={submit}>
          <div className="login-access-badge">
            <LockKeyhole size={16}/>
            <span>Acesso ao sistema</span>
          </div>

          <div className="login-title">
            <h2>Entrar</h2>
            <p>Informe seus dados para acessar o painel.</p>
          </div>

          <label>
            E-mail
            <div className="input-wrap">
              <Mail size={18}/>
              <input
                value={email}
                onChange={e=>setEmail(e.target.value)}
                type="email"
                placeholder="Digite seu e-mail"
              />
            </div>
          </label>

          <label>
            Senha
            <div className="input-wrap">
              <LockKeyhole size={18}/>
              <input
                value={password}
                onChange={e=>setPassword(e.target.value)}
                type={show?'text':'password'}
                placeholder="Digite sua senha"
              />
              <button
                className="icon-button"
                type="button"
                onClick={()=>setShow(!show)}
                aria-label="Mostrar senha"
              >
                {show?<EyeOff size={18}/>:<Eye size={18}/>} 
              </button>
            </div>
          </label>

          <div className="login-row">
            <label className="checkbox-label">
              <input type="checkbox" defaultChecked />
              Lembrar meu acesso
            </label>
            <button className="text-button" type="button">Esqueci minha senha</button>
          </div>

          {error&&<div className="error-box">{error}</div>}

          <button className="primary-button" type="submit">
            <LogOut size={18}/>
            Entrar no sistema
          </button>

          <div className="demo-note">
            <strong>Acesso inicial / demonstração</strong>
            <span>admin@postogestao.com &nbsp;•&nbsp; 123456</span>
          </div>
        </form>
      </section>
    </div>
  );
}

const nav:[Page,any][]=[['Dashboard',LayoutDashboard],['Caixa',WalletCards],['Vendas',CircleDollarSign],['Combustíveis',Fuel],['Estoque',Warehouse],['Clientes',Users],['Contas a Receber',BadgeDollarSign],['Despesas',ReceiptText],['Fornecedores',Truck],['Funcionários',UserRoundCog],['Relatórios',BarChart3],['Usuários',UserCog],['Auditoria',ShieldCheck],['Configurações',Settings]];

function Modal({title,onClose,children}:{title:string,onClose:()=>void,children:any}){ return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button className="round-button sm" onClick={onClose}><X size={18}/></button></div>{children}</div></div> }
function Empty({text}:{text:string}){return <div className="empty"><FileText size={32}/><b>Nenhum registro</b><span>{text}</span></div>}
function Header({eyebrow,title,subtitle,action}:{eyebrow:string,title:string,subtitle?:string,action?:any}){return <div className="page-head"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>}
function Card({title,value,sub,icon:Icon,tone='green'}:any){return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={21}/></div><div><span>{title}</span><strong>{value}</strong><small>{sub}</small></div></div>}
function Toolbar({search,setSearch,button,onClick}:{search:string,setSearch:(v:string)=>void,button?:string,onClick?:()=>void}){return <div className="toolbar"><div className="search"><Search size={18}/><input placeholder="Pesquisar..." value={search} onChange={e=>setSearch(e.target.value)}/></div>{button&&<button className="primary-button compact" onClick={onClick}><Plus size={17}/>{button}</button>}</div>}
function Status({children,tone='green'}:{children:any,tone?:string}){return <span className={`pill ${tone}`}>{children}</span>}

function AppShell({state,setState,user,onLogout}:{state:State;setState:React.Dispatch<React.SetStateAction<State>>;user:AppUser;onLogout:()=>void}){
 const [page,setPage]=useState<Page>('Dashboard'); const [mobile,setMobile]=useState(false);
 const audit=(module:string,action:string,detail:string)=>setState(s=>({...s,audits:[{id:uid(),date:nowIso(),user:user.name,module,action,detail},...s.audits]}));
 return <div className="app-shell"><aside className={`sidebar ${mobile?'show':''}`}><div className="sidebar-brand"><div className="brand-mark"><Fuel size={24}/></div><div><strong>{state.stationName}</strong><small>Gestão do Posto</small></div></div><nav>{nav.map(([label,Icon])=><button key={label} className={`nav-item ${page===label?'active':''}`} onClick={()=>{setPage(label);setMobile(false)}}><Icon size={19}/><span>{label}</span></button>)}</nav><button className="nav-item logout" onClick={onLogout}><LogOut size={19}/><span>Sair</span></button></aside><main className="content"><div className="mobile-top"><button className="round-button" onClick={()=>setMobile(!mobile)}><Menu size={20}/></button><strong>{state.stationName}</strong></div>{page==='Dashboard'&&<Dashboard state={state} setPage={setPage}/>} {page==='Caixa'&&<CashModern state={state} setState={setState} audit={audit}/>} {page==='Vendas'&&<Sales state={state} setState={setState} audit={audit}/>} {page==='Combustíveis'&&<Fuels state={state} setState={setState} audit={audit}/>} {page==='Estoque'&&<Stock state={state} setState={setState} audit={audit}/>} {page==='Clientes'&&<Clients state={state} setState={setState} audit={audit}/>} {page==='Contas a Receber'&&<Receivables state={state} setState={setState} audit={audit}/>} {page==='Despesas'&&<Expenses state={state} setState={setState} audit={audit}/>} {page==='Fornecedores'&&<Suppliers state={state} setState={setState} audit={audit}/>} {page==='Funcionários'&&<Employees state={state} setState={setState} audit={audit}/>} {page==='Relatórios'&&<Reports state={state}/>} {page==='Usuários'&&<UsersPage state={state} setState={setState} audit={audit}/>} {page==='Auditoria'&&<AuditPage state={state}/>} {page==='Configurações'&&<SettingsPage state={state} setState={setState} audit={audit}/>}</main></div>
}

function Dashboard({state,setPage}:{state:State;setPage:(p:Page)=>void}){
 const activeCash=state.cashSessions.find(c=>c.status==='Aberto'); const today=dayISO(); const todaySales=state.sales.filter(s=>s.status==='Ativa'&&s.date.slice(0,10)===today); const total=todaySales.reduce((a,b)=>a+b.total,0); const sold=todaySales.reduce((a,b)=>a+b.liters,0); const due=state.receivables.filter(r=>r.status!=='Pago'&&r.status!=='Cancelado').reduce((a,b)=>a+(b.original-b.paid),0); const cashValue=activeCash?activeCash.opening+state.cashMoves.filter(m=>m.cashId===activeCash.id).reduce((a,m)=>a+(['Saída','Sangria','Despesa'].includes(m.type)?-m.value:m.value),0):0;
 return <><Header eyebrow="VISÃO GERAL" title="Dashboard" subtitle="Resumo operacional em tempo real."/><section className="stats-grid"><Card title="Caixa atual" value={activeCash?money(cashValue):'Fechado'} sub={activeCash?`Aberto ${dateBR(activeCash.openedAt)}`:'Abra um caixa'} icon={WalletCards}/><Card title="Vendas de hoje" value={money(total)} sub={`${todaySales.length} vendas`} icon={ReceiptText} tone="blue"/><Card title="A receber" value={money(due)} sub={`${state.receivables.filter(r=>r.status!=='Pago'&&r.status!=='Cancelado').length} contas`} icon={BadgeDollarSign} tone="orange"/><Card title="Litros vendidos" value={liters(sold)} sub="Hoje" icon={Gauge} tone="blue"/></section><div className="section-title"><div><span className="eyebrow">ESTOQUE</span><h2>Combustíveis</h2></div><button className="secondary-button" onClick={()=>setPage('Estoque')}>Ver estoque completo</button></div><div className="fuel-grid">{state.tanks.map(t=>{const f=state.fuels.find(x=>x.id===t.fuelId)!;const pct=Math.round((t.liters/t.capacity)*100);return <div className="fuel-card" key={t.id}><div className="fuel-top"><div className="stat-icon green"><Fuel size={21}/></div><Status tone={t.liters<=f.min?'orange':'green'}>{t.liters<=f.min?'Baixo':'Normal'}</Status></div><b>{f.name}</b><strong>{liters(t.liters)}</strong><div className="progress"><div style={{width:`${pct}%`}}/></div><div className="fuel-meta"><span>{pct}% do tanque</span><span>{money(f.sellPrice)}/L</span></div></div>})}</div></>}

function CashModern({ state, setState, audit }: any) {
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
  const salesAmount = moves
    .filter((m) => m.type === "Venda")
    .reduce((a, m) => a + m.value, 0);
  const otherEntries = moves
    .filter((m) => ["Entrada", "Recebimento"].includes(m.type))
    .reduce((a, m) => a + m.value, 0);
  const closedSessions: CashSession[] = state.cashSessions.filter(
    (c: CashSession) => c.status === "Fechado",
  );
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
  function saveMove() {
    const value = Number(modal.value);
    if (!value || value <= 0) {
      setModal({ ...modal, error: "Informe um valor maior que zero." });
      return;
    }
    setSaving(true);
    const m: CashMove = {
      id: uid(),
      cashId: active.id,
      date: nowIso(),
      type: modal.type,
      value,
      method: modal.method,
      description: modal.description.trim() || modal.type,
    };
    setState((s: State) => ({ ...s, cashMoves: [m, ...s.cashMoves] }));
    audit("Caixa", modal.type, `${m.description}: ${money(value)}`);
    setSaving(false);
    setModal(null);
  }
  function openCash() {
    const opening = Number(modal.value);
    if (Number.isNaN(opening) || opening < 0) {
      setModal({ ...modal, error: "Informe um saldo inicial válido." });
      return;
    }
    const c: CashSession = {
      id: uid(),
      openedAt: nowIso(),
      opening,
      status: "Aberto",
      operator: "Administrador",
    };
    setState((s: State) => ({ ...s, cashSessions: [c, ...s.cashSessions] }));
    audit("Caixa", "Abertura", `Saldo inicial ${money(opening)}`);
    setModal(null);
  }
  async function closeCash() {
    const declared = Number(modal.declared);
    if (Number.isNaN(declared) || declared < 0) {
      setModal({ ...modal, error: "Informe o saldo contado." });
      return;
    }
    const closedAt = nowIso();
    const closedSession: CashSession = {
      ...active,
      status: "Fechado",
      closedAt,
      closingDeclared: declared,
    };
    setState((s: State) => ({
      ...s,
      cashSessions: s.cashSessions.map((c: CashSession) =>
        c.id === active.id ? closedSession : c,
      ),
    }));
    audit(
      "Caixa",
      "Fechamento",
      `Declarado ${money(declared)} | Esperado ${money(balance)}`,
    );
    setModal(null);
    await generateCashReport(state, closedSession, true);
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
      {closedSessions.length > 0 && (
        <section className="panel section-block cash-history">
          <div className="panel-head">
            <div><span className="eyebrow">HISTÓRICO</span><h2>Caixas fechados</h2></div>
          </div>
          <div className="table-wrap"><table><thead><tr><th>Data</th><th>Abertura</th><th>Fechamento</th><th>Operador</th><th>Saldo inicial</th><th>Vendas</th><th>Saldo final</th><th>Ações</th></tr></thead><tbody>
            {closedSessions.map((session) => {const sessionMoves:CashMove[]=state.cashMoves.filter((m:CashMove)=>m.cashId===session.id);const sessionSales=sessionMoves.filter(m=>m.type==='Venda').reduce((a,m)=>a+m.value,0);const final=session.opening+sessionMoves.reduce((a,m)=>a+(isDebit(m)?-m.value:m.value),0);return <tr key={session.id}><td>{dateBR(session.closedAt!)}</td><td>{new Date(session.openedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</td><td>{new Date(session.closedAt!).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</td><td>{session.operator}</td><td>{money(session.opening)}</td><td className="positive">{money(sessionSales)}</td><td>{money(final)}</td><td><div className="button-row"><button className="small-action" onClick={()=>generateCashReport(state,session,true)}>Ver</button><button className="small-action" onClick={()=>generateCashReport(state,session)}>Gerar PDF</button></div></td></tr>})}
          </tbody></table></div>
        </section>
      )}
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
              Entradas <b className="positive">{money(otherEntries)}</b>
            </span>
            <span>
              Vendas <b className="positive">{money(salesAmount)}</b>
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
                Confirmar e fechar caixa
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

function Sales({ state, setState, audit }: any) {
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);
  const [f, setF] = useState<any>({
    fuelId: state.fuels[0]?.id || "",
    tankId: state.tanks[0]?.id || "",
    liters: "",
    value: "",
    lastEdited: "liters",
    received: "",
    payment: "Dinheiro",
    clientId: "",
    employeeId: "",
    error: "",
  });
  const sales = state.sales.filter((s: Sale) => {
    const c = state.clients.find((x: Client) => x.id === s.clientId);
    const fuel = state.fuels.find((x: FuelItem) => x.id === s.fuelId);
    return `${c?.name || ""} ${fuel?.name || ""} ${s.payment}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });
  const selectedFuel: FuelItem | undefined = state.fuels.find(
    (x: FuelItem) => x.id === f.fuelId,
  );
  const totalValue = Number(f.value) || 0;
  const receivedValue = Number(f.received) || 0;
  const change = receivedValue - totalValue;
  function editLiters(value: string) {
    const fuel: FuelItem | undefined = state.fuels.find(
      (x: FuelItem) => x.id === f.fuelId,
    );
    setF({
      ...f,
      liters: value,
      value: value && fuel ? (Number(value) * fuel.sellPrice).toFixed(2) : "",
      lastEdited: "liters",
      error: "",
    });
  }
  function editValue(value: string) {
    const fuel: FuelItem | undefined = state.fuels.find(
      (x: FuelItem) => x.id === f.fuelId,
    );
    setF({
      ...f,
      value,
      liters: value && fuel ? (Number(value) / fuel.sellPrice).toFixed(4) : "",
      lastEdited: "value",
      error: "",
    });
  }
  function chooseFuel(id: string) {
    const fuel: FuelItem | undefined = state.fuels.find(
      (x: FuelItem) => x.id === id,
    );
    const tank = state.tanks.find((t: Tank) => t.fuelId === id);
    const next = { ...f, fuelId: id, tankId: tank?.id || "", error: "" };
    if (fuel && f.lastEdited === "value" && f.value)
      next.liters = (Number(f.value) / fuel.sellPrice).toFixed(4);
    else if (fuel && f.liters)
      next.value = (Number(f.liters) * fuel.sellPrice).toFixed(2);
    setF(next);
  }
  function save() {
    const fuel: FuelItem = state.fuels.find((x: FuelItem) => x.id === f.fuelId);
    const tank: Tank = state.tanks.find((x: Tank) => x.id === f.tankId);
    const l = Number(f.liters);
    const total = Number(f.value);
    if (!fuel || !tank || !l || l <= 0 || !total || total <= 0) {
      setF({ ...f, error: "Selecione combustível e tanque e informe litros ou valor válidos." });
      return;
    }
    if (tank.liters < l) {
      setF({ ...f, error: "Estoque insuficiente no tanque selecionado." });
      return;
    }
    if (f.payment === "Dinheiro" && f.received && receivedValue < total) {
      setF({ ...f, error: "O valor recebido não pode ser menor que o total da venda." });
      return;
    }
    if (f.payment === "Prazo") {
      if (!f.clientId) return alert("Selecione o cliente para venda a prazo.");
      const client: Client = state.clients.find(
        (x: Client) => x.id === f.clientId,
      );
      if (!client || client.status !== "Ativo")
        return alert("Cliente não está ativo para crédito.");
      const debt = state.receivables
        .filter(
          (r: Receivable) =>
            r.clientId === client.id &&
            r.status !== "Pago" &&
            r.status !== "Cancelado",
        )
        .reduce((a: number, r: Receivable) => a + (r.original - r.paid), 0);
      if (debt + total > client.limit)
        return alert(
          `Limite insuficiente. Disponível: ${money(client.limit - debt)}`,
        );
    }
    const sale: Sale = {
      id: uid(),
      date: nowIso(),
      clientId: f.clientId || undefined,
      employeeId: f.employeeId || undefined,
      fuelId: f.fuelId,
      tankId: f.tankId,
      liters: l,
      price: fuel.sellPrice,
      total,
      payment: f.payment,
      status: "Ativa",
    };
    setState((s: State) => {
      const receivable =
        f.payment === "Prazo"
          ? {
              id: uid(),
              saleId: sale.id,
              clientId: f.clientId,
              original: total,
              paid: 0,
              due: dayISO(30),
              status: "Em aberto" as const,
            }
          : null;
      const cash = s.cashSessions.find(
        (c: CashSession) => c.status === "Aberto",
      );
      const move = cash
        ? {
            id: uid(),
            cashId: cash.id,
            date: nowIso(),
            type: "Venda" as const,
            value: total,
            method: f.payment,
            description: `Venda ${fuel.name} - ${liters(l)}`,
            refId: sale.id,
          }
        : null;
      return {
        ...s,
        sales: [sale, ...s.sales],
        tanks: s.tanks.map((t: Tank) =>
          t.id === tank.id ? { ...t, liters: t.liters - l } : t,
        ),
        stockMoves: [
          {
            id: uid(),
            date: nowIso(),
            tankId: tank.id,
            type: "Venda" as const,
            liters: -l,
            description: `Venda ${sale.id}`,
          },
          ...s.stockMoves,
        ],
        receivables: receivable
          ? [receivable, ...s.receivables]
          : s.receivables,
        cashMoves: move ? [move, ...s.cashMoves] : s.cashMoves,
      };
    });
    audit(
      "Vendas",
      "Nova venda",
      `${fuel.name} | ${liters(l)} | ${money(total)} | ${f.payment}`,
    );
    setShow(false);
    setF({ ...f, liters: "", value: "", received: "", clientId: "", error: "" });
  }
  function cancel(sale: Sale) {
    if (sale.status === "Cancelada") return;
    if (!confirm("Cancelar esta venda e devolver litros ao estoque?")) return;
    setState((s: State) => ({
      ...s,
      sales: s.sales.map((x: Sale) =>
        x.id === sale.id ? { ...x, status: "Cancelada" } : x,
      ),
      tanks: s.tanks.map((t: Tank) =>
        t.id === sale.tankId ? { ...t, liters: t.liters + sale.liters } : t,
      ),
      receivables: s.receivables.map((r: Receivable) =>
        r.saleId === sale.id ? { ...r, status: "Cancelado" } : r,
      ),
      cashMoves: s.cashMoves.filter((m: CashMove) => m.refId !== sale.id),
      stockMoves: [
        {
          id: uid(),
          date: nowIso(),
          tankId: sale.tankId,
          type: "Cancelamento" as const,
          liters: sale.liters,
          description: `Cancelamento venda ${sale.id}`,
        },
        ...s.stockMoves,
      ],
    }));
    audit("Vendas", "Cancelamento", `Venda ${sale.id} cancelada`);
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
                        {s.status === "Ativa" && (
                          <button
                            className="table-icon danger"
                            onClick={() => cancel(s)}
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
                  .filter((x: FuelItem) => x.active)
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
                onChange={(e) => setF({ ...f, tankId: e.target.value })}
              >
                {state.tanks
                  .filter((t: Tank) => t.fuelId === f.fuelId)
                  .map((t: Tank) => (
                    <option key={t.id} value={t.id}>
                      {t.name} - {liters(t.liters)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Litros
              <input
                type="number"
                min="0"
                step="0.0001"
                value={f.liters}
                onChange={(e) => editLiters(e.target.value)}
                placeholder="0,0000"
              />
            </label>
            <label>
              Valor (R$)
              <input
                type="number"
                min="0"
                step="0.01"
                value={f.value}
                onChange={(e) => editValue(e.target.value)}
                placeholder="0,00"
              />
            </label>
            <label>
              Pagamento
              <select
                value={f.payment}
                onChange={(e) =>
                  setF({ ...f, payment: e.target.value, received: "", error: "" })
                }
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
                  {state.clients.map((c: Client) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Funcionário
              <select
                value={f.employeeId}
                onChange={(e) => setF({ ...f, employeeId: e.target.value })}
              >
                <option value="">Não informado</option>
                {state.employees
                  .filter((e: Employee) => e.active)
                  .map((e: Employee) => (
                    <option value={e.id} key={e.id}>
                      {e.name}
                    </option>
                  ))}
              </select>
            </label>
            {f.payment === "Dinheiro" && (
              <>
                <label>
                  Valor recebido
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={f.received}
                    onChange={(e) =>
                      setF({ ...f, received: e.target.value, error: "" })
                    }
                    placeholder="0,00"
                  />
                </label>
                <label>
                  Troco
                  <div className={`sale-change ${change < 0 && f.received ? "invalid" : ""}`}>
                    {money(Math.max(0, change))}
                  </div>
                </label>
              </>
            )}
            <div className="sale-summary span2">
              <span>Preço/Litro <b>{money(selectedFuel?.sellPrice || 0)}</b></span>
              <span>Litros <b>{Number(f.liters || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} L</b></span>
              <span>Total <b>{money(totalValue)}</b></span>
              {f.payment === "Dinheiro" && <span>Troco <b>{money(Math.max(0, change))}</b></span>}
            </div>
            {f.error && <div className="error-box span2">{f.error}</div>}
            <button className="primary-button span2" onClick={save}>
              Concluir venda
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Fuels({ state, setState, audit }: any) {
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

function Stock({state,setState,audit}:any){const [modal,setModal]=useState<any>(null);function openEntry(){setModal({kind:'entry',tankId:state.tanks[0]?.id||'',liters:'',cost:'',invoice:'',supplierId:''})}function openAdjust(){setModal({kind:'adjust',tankId:state.tanks[0]?.id||'',liters:''})}function save(){const n=Number(modal.liters);if(!n)return;const tank:Tank=state.tanks.find((t:Tank)=>t.id===modal.tankId);if(!tank)return;if(modal.kind==='entry'&&tank.liters+n>tank.capacity&&!confirm('A entrada ultrapassa a capacidade cadastrada. Continuar?'))return;setState((s:State)=>({...s,tanks:s.tanks.map((t:Tank)=>t.id===tank.id?{...t,liters:modal.kind==='entry'?t.liters+n:n}:t),stockMoves:[{id:uid(),date:nowIso(),tankId:tank.id,type:modal.kind==='entry'?'Entrada':'Ajuste',liters:modal.kind==='entry'?n:n-tank.liters,description:modal.kind==='entry'?`Entrada NF ${modal.invoice||'-'}`:'Ajuste manual'},...s.stockMoves]}));audit('Estoque',modal.kind==='entry'?'Entrada':'Ajuste',`${tank.name}: ${liters(n)}`);setModal(null)}return <><Header eyebrow="ESTOQUE" title="Tanques e Movimentações" subtitle="Entrada, saída automática, ajustes e histórico." action={<div className="head-actions"><button className="secondary-button" onClick={openAdjust}><RefreshCw size={16}/>Ajustar</button><button className="primary-button compact" onClick={openEntry}><ArrowDownToLine size={16}/>Entrada de Combustível</button></div>}/><div className="fuel-grid">{state.tanks.map((t:Tank)=>{const f=state.fuels.find((x:FuelItem)=>x.id===t.fuelId);const pct=Math.round(t.liters/t.capacity*100);return <div className="fuel-card" key={t.id}><div className="fuel-top"><div className="stat-icon green"><Droplets size={21}/></div><Status tone={t.liters<=(f?.min||0)?'orange':'green'}>{pct}%</Status></div><b>{t.name} • {f?.name}</b><strong>{liters(t.liters)}</strong><div className="progress"><div style={{width:`${Math.min(pct,100)}%`}}/></div><div className="fuel-meta"><span>Cap. {liters(t.capacity)}</span><span>Mín. {liters(f?.min||0)}</span></div></div>})}</div><div className="panel section-block"><h2>Histórico de estoque</h2>{state.stockMoves.length===0?<Empty text="Nenhuma movimentação de estoque."/>:<div className="table-wrap"><table><thead><tr><th>Data</th><th>Tanque</th><th>Tipo</th><th>Litros</th><th>Descrição</th></tr></thead><tbody>{state.stockMoves.map((m:StockMove)=><tr key={m.id}><td>{dateBR(m.date)}</td><td>{state.tanks.find((t:Tank)=>t.id===m.tankId)?.name}</td><td><Status tone={m.liters<0?'orange':'green'}>{m.type}</Status></td><td className={m.liters<0?'negative':'positive'}>{m.liters>0?'+':''}{liters(m.liters)}</td><td>{m.description}</td></tr>)}</tbody></table></div>}</div>{modal&&<Modal title={modal.kind==='entry'?'Entrada de Combustível':'Ajustar Estoque'} onClose={()=>setModal(null)}><div className="form-grid"><label>Tanque<select value={modal.tankId} onChange={e=>setModal({...modal,tankId:e.target.value})}>{state.tanks.map((t:Tank)=><option key={t.id} value={t.id}>{t.name} - {state.fuels.find((f:FuelItem)=>f.id===t.fuelId)?.name}</option>)}</select></label><label>{modal.kind==='entry'?'Litros recebidos':'Estoque físico atual'}<input type="number" step="0.001" value={modal.liters} onChange={e=>setModal({...modal,liters:e.target.value})}/></label>{modal.kind==='entry'&&<><label>NF / Documento<input value={modal.invoice} onChange={e=>setModal({...modal,invoice:e.target.value})}/></label><label>Fornecedor<select value={modal.supplierId} onChange={e=>setModal({...modal,supplierId:e.target.value})}><option value="">Não informado</option>{state.suppliers.map((s:Supplier)=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label></>}<button className="primary-button span2" onClick={save}>Salvar movimentação</button></div></Modal>}</>}

function Clients({state,setState,audit}:any){const [search,setSearch]=useState('');const [show,setShow]=useState<any>(null);const rows=state.clients.filter((c:Client)=>`${c.name} ${c.doc} ${c.phone}`.toLowerCase().includes(search.toLowerCase()));function save(){if(!show.name)return;const exists=state.clients.some((c:Client)=>c.id===show.id);setState((s:State)=>({...s,clients:exists?s.clients.map((c:Client)=>c.id===show.id?show:c):[{...show,id:uid()},...s.clients]}));audit('Clientes',exists?'Alteração':'Cadastro',show.name);setShow(null)}return <><Header eyebrow="CADASTROS" title="Clientes" subtitle="Controle clientes, limites e situação de crédito."/><Toolbar search={search} setSearch={setSearch} button="Novo Cliente" onClick={()=>setShow({id:'',name:'',doc:'',phone:'',limit:0,status:'Ativo',notes:''})}/><div className="panel no-pad"><div className="table-wrap"><table><thead><tr><th>Cliente</th><th>CPF/CNPJ</th><th>Telefone</th><th>Limite</th><th>Saldo devedor</th><th>Status</th><th>Ações</th></tr></thead><tbody>{rows.map((c:Client)=>{const debt=state.receivables.filter((r:Receivable)=>r.clientId===c.id&&r.status!=='Pago'&&r.status!=='Cancelado').reduce((a:number,r:Receivable)=>a+(r.original-r.paid),0);return <tr key={c.id}><td><b>{c.name}</b></td><td>{c.doc}</td><td>{c.phone}</td><td>{money(c.limit)}</td><td className={debt>0?'negative':''}>{money(debt)}</td><td><Status tone={c.status==='Ativo'?'green':'orange'}>{c.status}</Status></td><td><button className="table-icon" onClick={()=>setShow({...c})}><Pencil size={16}/></button></td></tr>})}</tbody></table></div></div>{show&&<Modal title={show.id?'Editar Cliente':'Novo Cliente'} onClose={()=>setShow(null)}><div className="form-grid"><label>Nome / Razão Social<input value={show.name} onChange={e=>setShow({...show,name:e.target.value})}/></label><label>CPF / CNPJ<input value={show.doc} onChange={e=>setShow({...show,doc:e.target.value})}/></label><label>Telefone<input value={show.phone} onChange={e=>setShow({...show,phone:e.target.value})}/></label><label>Limite de Crédito<input type="number" value={show.limit} onChange={e=>setShow({...show,limit:Number(e.target.value)})}/></label><label>Status<select value={show.status} onChange={e=>setShow({...show,status:e.target.value})}><option>Ativo</option><option>Bloqueado</option><option>Inativo</option></select></label><label>Observações<input value={show.notes} onChange={e=>setShow({...show,notes:e.target.value})}/></label><button className="primary-button span2" onClick={save}>Salvar cliente</button></div></Modal>}</>}

function Receivables({state,setState,audit}:any){const [search,setSearch]=useState('');const [pay,setPay]=useState<any>(null);const rows=state.receivables.filter((r:Receivable)=>state.clients.find((c:Client)=>c.id===r.clientId)?.name.toLowerCase().includes(search.toLowerCase()));const total=rows.filter((r:Receivable)=>r.status!=='Pago'&&r.status!=='Cancelado').reduce((a:number,r:Receivable)=>a+r.original-r.paid,0);const overdue=rows.filter((r:Receivable)=>r.status!=='Pago'&&r.status!=='Cancelado'&&r.due<dayISO()).reduce((a:number,r:Receivable)=>a+r.original-r.paid,0);function receive(){const amount=Number(pay.amount);const r:Receivable=state.receivables.find((x:Receivable)=>x.id===pay.id);if(!r||!amount||amount>r.original-r.paid)return alert('Valor inválido.');setState((s:State)=>{const cash=s.cashSessions.find((c:CashSession)=>c.status==='Aberto');const newPaid=r.paid+amount;const mv=cash?{id:uid(),cashId:cash.id,date:nowIso(),type:'Recebimento' as const,value:amount,method:pay.method,description:`Recebimento ${s.clients.find((c:Client)=>c.id===r.clientId)?.name}`,refId:r.id}:null;return {...s,receivables:s.receivables.map((x:Receivable)=>x.id===r.id?{...x,paid:newPaid,status:newPaid>=x.original?'Pago':'Parcial'}:x),cashMoves:mv?[mv,...s.cashMoves]:s.cashMoves}});audit('Contas a Receber','Pagamento',`${state.clients.find((c:Client)=>c.id===r.clientId)?.name}: ${money(amount)}`);setPay(null)}return <><Header eyebrow="FINANCEIRO" title="Contas a Receber" subtitle="Fiado, pagamentos totais e parciais."/><section className="stats-grid three"><Card title="Total a receber" value={money(total)} sub="Saldo em aberto" icon={BadgeDollarSign}/><Card title="Vencido" value={money(overdue)} sub="Necessita atenção" icon={AlertTriangle} tone="orange"/><Card title="Recebido" value={money(rows.reduce((a:number,r:Receivable)=>a+r.paid,0))} sub="Pagamentos registrados" icon={CheckCircle2} tone="blue"/></section><Toolbar search={search} setSearch={setSearch}/><div className="panel no-pad"><div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Vencimento</th><th>Original</th><th>Pago</th><th>Saldo</th><th>Status</th><th>Ação</th></tr></thead><tbody>{rows.map((r:Receivable)=>{const client=state.clients.find((c:Client)=>c.id===r.clientId);const bal=r.original-r.paid;return <tr key={r.id}><td><b>{client?.name}</b></td><td>{new Date(r.due+'T12:00:00').toLocaleDateString('pt-BR')}</td><td>{money(r.original)}</td><td>{money(r.paid)}</td><td className={bal>0?'negative':''}>{money(bal)}</td><td><Status tone={r.status==='Pago'?'green':r.due<dayISO()?'orange':'blue'}>{r.status}</Status></td><td>{!['Pago','Cancelado'].includes(r.status)&&<button className="small-action" onClick={()=>setPay({id:r.id,amount:bal,method:'Dinheiro'})}>Receber</button>}</td></tr>})}</tbody></table></div></div>{pay&&<Modal title="Registrar Pagamento" onClose={()=>setPay(null)}><div className="form-grid"><label>Valor<input type="number" step="0.01" value={pay.amount} onChange={e=>setPay({...pay,amount:e.target.value})}/></label><label>Forma<select value={pay.method} onChange={e=>setPay({...pay,method:e.target.value})}>{['Dinheiro','PIX','Débito','Crédito'].map(x=><option key={x}>{x}</option>)}</select></label><button className="primary-button span2" onClick={receive}>Confirmar recebimento</button></div></Modal>}</>}

function Expenses({state,setState,audit}:any){const [show,setShow]=useState(false);const [form,setForm]=useState<any>({category:'Outros',description:'',value:'',method:'Dinheiro',supplierId:''});function save(){const v=Number(form.value);if(!v||!form.description)return;const ex:Expense={id:uid(),date:nowIso(),category:form.category,description:form.description,value:v,method:form.method,supplierId:form.supplierId||undefined};setState((s:State)=>{const cash=s.cashSessions.find((c:CashSession)=>c.status==='Aberto');const mv=cash?{id:uid(),cashId:cash.id,date:nowIso(),type:'Despesa' as const,value:v,method:form.method,description:form.description,refId:ex.id}:null;return {...s,expenses:[ex,...s.expenses],cashMoves:mv?[mv,...s.cashMoves]:s.cashMoves}});audit('Despesas','Nova despesa',`${form.description}: ${money(v)}`);setShow(false)}return <><Header eyebrow="FINANCEIRO" title="Despesas" subtitle="Registre gastos e vincule ao caixa." action={<button className="primary-button compact" onClick={()=>setShow(true)}><Plus size={17}/>Nova Despesa</button>}/><div className="panel no-pad">{state.expenses.length===0?<Empty text="Nenhuma despesa registrada."/>:<div className="table-wrap"><table><thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th>Fornecedor</th><th>Forma</th><th>Valor</th></tr></thead><tbody>{state.expenses.map((e:Expense)=><tr key={e.id}><td>{dateBR(e.date)}</td><td>{e.category}</td><td>{e.description}</td><td>{state.suppliers.find((s:Supplier)=>s.id===e.supplierId)?.name||'-'}</td><td>{e.method}</td><td className="negative">{money(e.value)}</td></tr>)}</tbody></table></div>}</div>{show&&<Modal title="Nova Despesa" onClose={()=>setShow(false)}><div className="form-grid"><label>Categoria<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{['Energia','Água','Manutenção','Impostos','Pessoal','Compras','Outros'].map(x=><option key={x}>{x}</option>)}</select></label><label>Fornecedor<select value={form.supplierId} onChange={e=>setForm({...form,supplierId:e.target.value})}><option value="">Não informado</option>{state.suppliers.map((s:Supplier)=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label><label className="span2">Descrição<input value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Valor<input type="number" step="0.01" value={form.value} onChange={e=>setForm({...form,value:e.target.value})}/></label><label>Pagamento<select value={form.method} onChange={e=>setForm({...form,method:e.target.value})}>{['Dinheiro','PIX','Débito','Crédito'].map(x=><option key={x}>{x}</option>)}</select></label><button className="primary-button span2" onClick={save}>Salvar despesa</button></div></Modal>}</>}

function SimpleCrud({title,eyebrow,subtitle,rows,columns,onNew}:any){return <><Header eyebrow={eyebrow} title={title} subtitle={subtitle} action={<button className="primary-button compact" onClick={onNew}><Plus size={17}/>Novo Registro</button>}/><div className="panel"><div className="table-wrap"><table><thead><tr>{columns.map((c:any)=><th key={c[0]}>{c[0]}</th>)}</tr></thead><tbody>{rows.map((r:any)=><tr key={r.id}>{columns.map((c:any)=><td key={c[0]}>{typeof c[1]==='function'?c[1](r):r[c[1]]}</td>)}</tr>)}</tbody></table></div></div></>}
function Suppliers({state,setState,audit}:any){const [show,setShow]=useState(false);const [f,setF]=useState<any>({name:'',doc:'',phone:'',contact:''});function save(){if(!f.name)return;const x={id:uid(),...f};setState((s:State)=>({...s,suppliers:[x,...s.suppliers]}));audit('Fornecedores','Cadastro',f.name);setShow(false)}return <>{<SimpleCrud title="Fornecedores" eyebrow="CADASTROS" subtitle="Distribuidoras e demais fornecedores." rows={state.suppliers} columns={[["Razão Social","name"],["CNPJ","doc"],["Telefone","phone"],["Contato","contact"]]} onNew={()=>setShow(true)}/>} {show&&<Modal title="Novo Fornecedor" onClose={()=>setShow(false)}><div className="form-grid"><label>Razão Social<input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></label><label>CNPJ<input value={f.doc} onChange={e=>setF({...f,doc:e.target.value})}/></label><label>Telefone<input value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></label><label>Contato<input value={f.contact} onChange={e=>setF({...f,contact:e.target.value})}/></label><button className="primary-button span2" onClick={save}>Salvar fornecedor</button></div></Modal>}</>}
function Employees({state,setState,audit}:any){const [show,setShow]=useState(false);const [f,setF]=useState<any>({name:'',doc:'',phone:'',role:'Frentista',active:true});function save(){if(!f.name)return;const x={id:uid(),...f};setState((s:State)=>({...s,employees:[x,...s.employees]}));audit('Funcionários','Cadastro',f.name);setShow(false)}return <><SimpleCrud title="Funcionários" eyebrow="EQUIPE" subtitle="Frentistas, caixas, gerentes e administrativo." rows={state.employees} columns={[["Nome","name"],["CPF","doc"],["Telefone","phone"],["Função","role"],["Status",(x:Employee)=><Status>{x.active?'Ativo':'Inativo'}</Status>]]} onNew={()=>setShow(true)}/>{show&&<Modal title="Novo Funcionário" onClose={()=>setShow(false)}><div className="form-grid"><label>Nome<input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></label><label>CPF<input value={f.doc} onChange={e=>setF({...f,doc:e.target.value})}/></label><label>Telefone<input value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></label><label>Função<select value={f.role} onChange={e=>setF({...f,role:e.target.value})}>{['Frentista','Caixa','Gerente','Administrativo','Outros'].map(x=><option key={x}>{x}</option>)}</select></label><button className="primary-button span2" onClick={save}>Salvar funcionário</button></div></Modal>}</>}
function UsersPage({state,setState,audit}:any){const [show,setShow]=useState(false);const [f,setF]=useState<any>({name:'',email:'',role:'Operador',active:true});function save(){if(!f.name||!f.email)return;const x={id:uid(),...f};setState((s:State)=>({...s,users:[x,...s.users]}));audit('Usuários','Cadastro',f.email);setShow(false)}return <><SimpleCrud title="Usuários" eyebrow="SEGURANÇA" subtitle="Perfis de acesso ao sistema." rows={state.users} columns={[["Nome","name"],["E-mail","email"],["Perfil","role"],["Status",(x:AppUser)=><Status>{x.active?'Ativo':'Inativo'}</Status>]]} onNew={()=>setShow(true)}/>{show&&<Modal title="Novo Usuário" onClose={()=>setShow(false)}><div className="form-grid"><label>Nome<input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></label><label>E-mail<input value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></label><label>Perfil<select value={f.role} onChange={e=>setF({...f,role:e.target.value})}><option>Administrador</option><option>Gerente</option><option>Operador</option></select></label><button className="primary-button span2" onClick={save}>Salvar usuário</button></div></Modal>}</>}
function AuditPage({state}:{state:State}){return <><Header eyebrow="SEGURANÇA" title="Auditoria" subtitle="Histórico das operações críticas do sistema."/><div className="panel"><div className="table-wrap"><table><thead><tr><th>Data</th><th>Usuário</th><th>Módulo</th><th>Ação</th><th>Detalhes</th></tr></thead><tbody>{state.audits.map(a=><tr key={a.id}><td>{dateBR(a.date)}</td><td>{a.user}</td><td>{a.module}</td><td>{a.action}</td><td>{a.detail}</td></tr>)}</tbody></table></div></div></>}
function Reports({state}:{state:State}){const totalSales=state.sales.filter(s=>s.status==='Ativa').reduce((a,s)=>a+s.total,0);const litersSold=state.sales.filter(s=>s.status==='Ativa').reduce((a,s)=>a+s.liters,0);const expenses=state.expenses.reduce((a,e)=>a+e.value,0);const cost=state.sales.filter(s=>s.status==='Ativa').reduce((a,s)=>a+s.liters*(state.fuels.find(f=>f.id===s.fuelId)?.costPrice||0),0);return <><Header eyebrow="ANÁLISES" title="Relatórios" subtitle="Resumo financeiro e operacional da base atual."/><section className="stats-grid"><Card title="Faturamento" value={money(totalSales)} sub="Vendas ativas" icon={BarChart3}/><Card title="Litros vendidos" value={liters(litersSold)} sub="Total acumulado" icon={Droplets} tone="blue"/><Card title="Despesas" value={money(expenses)} sub="Total registrado" icon={ReceiptText} tone="orange"/><Card title="Margem estimada" value={money(totalSales-cost-expenses)} sub="Venda - custo - despesas" icon={BadgeDollarSign}/></section><div className="report-grid section-block">{state.fuels.map(f=>{const ss=state.sales.filter(s=>s.status==='Ativa'&&s.fuelId===f.id);return <div className="panel" key={f.id}><span className="eyebrow">{f.name}</span><h2>{money(ss.reduce((a,s)=>a+s.total,0))}</h2><p>{liters(ss.reduce((a,s)=>a+s.liters,0))} vendidos</p></div>})}</div></>}
function SettingsPage({state,setState,audit}:any){const [f,setF]=useState({stationName:state.stationName,cnpj:state.cnpj,city:state.city});function save(){setState((s:State)=>({...s,...f}));audit('Configurações','Alteração','Dados do posto atualizados');alert('Configurações salvas.')}function reset(){if(confirm('Apagar todos os dados locais e voltar à demonstração inicial?')){localStorage.removeItem('posto-gestao-state-v2');location.reload()}}return <><Header eyebrow="SISTEMA" title="Configurações" subtitle="Dados gerais da unidade e manutenção local."/><div className="panel settings-card"><div className="form-grid"><label>Nome do posto<input value={f.stationName} onChange={e=>setF({...f,stationName:e.target.value})}/></label><label>CNPJ<input value={f.cnpj} onChange={e=>setF({...f,cnpj:e.target.value})}/></label><label>Cidade / UF<input value={f.city} onChange={e=>setF({...f,city:e.target.value})}/></label><div></div><button className="primary-button" onClick={save}>Salvar configurações</button><button className="danger-button" onClick={reset}><Trash2 size={16}/>Restaurar base demo</button></div><div className="info-box"><PackageCheck size={22}/><div><b>Persistência local ativa</b><p>Esta versão salva os dados no navegador. A próxima etapa para uso real em vários computadores será ligar a mesma interface ao Supabase/PostgreSQL.</p></div></div></div></>}

export default function App(){ const [state,setState]=usePersistentState(); const [user,setUser]=useState<AppUser|null>(()=>sessionStorage.getItem('posto-user')?JSON.parse(sessionStorage.getItem('posto-user')!):null);function login(u:AppUser){setUser(u);sessionStorage.setItem('posto-user',JSON.stringify(u))}function logout(){setUser(null);sessionStorage.removeItem('posto-user')}return user?<AppShell state={state} setState={setState} user={user} onLogout={logout}/>:<Login onLogin={login}/> }
