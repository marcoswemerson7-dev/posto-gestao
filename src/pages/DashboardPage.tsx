import {
  Bell,
  Fuel,
  Wallet,
  BadgeDollarSign,
  ReceiptText,
  Gauge,
  Droplets,
  Clock3,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";

const tanks = [
  {
    name: "Gasolina Comum",
    liters: 11840,
    capacity: 15000,
    price: "R$ 6,19/L",
  },
  {
    name: "Gasolina Aditivada",
    liters: 6240,
    capacity: 10000,
    price: "R$ 6,49/L",
  },
  { name: "Etanol", liters: 3920, capacity: 8000, price: "R$ 4,39/L" },
  { name: "Diesel S10", liters: 8750, capacity: 12000, price: "R$ 6,09/L" },
];

const sales = [
  ["08:21", "Gasolina Comum", "32,4 L", "R$ 200,56", "PIX"],
  ["08:12", "Diesel S10", "75,0 L", "R$ 456,75", "Prazo"],
  ["07:58", "Etanol", "28,7 L", "R$ 125,99", "Dinheiro"],
  ["07:46", "Gasolina Aditivada", "41,2 L", "R$ 267,39", "Débito"],
];

type Props = { onLogout: () => void; userName?: string; userRole?: string };

export default function DashboardPage({
  onLogout,
  userName = "Usuário",
  userRole = "Usuário",
}: Props) {
  return (
    <div className="app-shell">
      <Sidebar onLogout={onLogout} />
      <main className="content">
        <header className="topbar">
          <div>
            <span className="eyebrow">VISÃO GERAL</span>
            <h1>Bom dia, {userName}</h1>
            <p>Resumo operacional do posto em tempo real.</p>
          </div>
          <div className="topbar-actions">
            <button className="round-button">
              <Bell size={20} />
              <span className="notification-dot">3</span>
            </button>
            <span className="user-button">
              <span className="avatar">
                {userName.slice(0, 2).toUpperCase()}
              </span>
              <span>
                <strong>{userName}</strong>
                <small>{userRole}</small>
              </span>
            </span>
          </div>
        </header>

        <section className="stats-grid">
          <StatCard
            title="Caixa atual"
            value="R$ 8.460,25"
            subtitle="Aberto às 06:02"
            icon={Wallet}
            tone="green"
          />
          <StatCard
            title="Vendas de hoje"
            value="R$ 12.984,70"
            subtitle="+8,4% vs. ontem"
            icon={ReceiptText}
            tone="blue"
          />
          <StatCard
            title="A receber"
            value="R$ 18.740,00"
            subtitle="23 clientes com saldo"
            icon={BadgeDollarSign}
            tone="orange"
          />
          <StatCard
            title="Litros vendidos"
            value="2.184,6 L"
            subtitle="Hoje"
            icon={Gauge}
            tone="blue"
          />
        </section>

        <section className="section-block">
          <div className="section-title-row">
            <div>
              <span className="eyebrow">ESTOQUE</span>
              <h2>Combustíveis</h2>
            </div>
            <button className="secondary-button">Ver estoque completo</button>
          </div>
          <div className="fuel-grid">
            {tanks.map((tank) => {
              const pct = Math.round((tank.liters / tank.capacity) * 100);
              return (
                <article className="fuel-card" key={tank.name}>
                  <div className="fuel-card-head">
                    <div className="stat-icon green">
                      <Fuel size={19} />
                    </div>
                    <span className="status-pill">Normal</span>
                  </div>
                  <h3>{tank.name}</h3>
                  <div className="fuel-value">
                    {tank.liters.toLocaleString("pt-BR")} <small>L</small>
                  </div>
                  <div className="progress">
                    <div style={{ width: `${pct}%` }} />
                  </div>
                  <div className="fuel-meta">
                    <span>{pct}% do tanque</span>
                    <span>{tank.price}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="dashboard-columns">
          <div className="panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">MOVIMENTO</span>
                <h2>Últimas vendas</h2>
              </div>
              <button className="text-button">Ver todas</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Combustível</th>
                    <th>Litros</th>
                    <th>Valor</th>
                    <th>Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((row) => (
                    <tr key={row.join("-")}>
                      {row.map((cell) => (
                        <td key={cell}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel debt-panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">ATENÇÃO</span>
                <h2>Contas vencidas</h2>
              </div>
              <span className="danger-pill">R$ 4.280,00</span>
            </div>
            <div className="debt-item">
              <div className="debt-icon">
                <Clock3 size={18} />
              </div>
              <div>
                <strong>Transportes Almeida</strong>
                <span>Vencido há 7 dias</span>
              </div>
              <b>R$ 1.850,00</b>
            </div>
            <div className="debt-item">
              <div className="debt-icon">
                <Clock3 size={18} />
              </div>
              <div>
                <strong>João Ferreira</strong>
                <span>Vencido há 3 dias</span>
              </div>
              <b>R$ 980,00</b>
            </div>
            <div className="debt-item">
              <div className="debt-icon">
                <Clock3 size={18} />
              </div>
              <div>
                <strong>Fazenda Boa Vista</strong>
                <span>Vence hoje</span>
              </div>
              <b>R$ 1.450,00</b>
            </div>
            <button className="secondary-button full">
              Abrir contas a receber
            </button>
          </div>
        </section>

        <section className="quick-actions">
          <button>
            <div className="quick-icon">
              <Droplets size={20} />
            </div>
            <span>
              <strong>Entrada de combustível</strong>
              <small>Registrar nova carga</small>
            </span>
          </button>
          <button>
            <div className="quick-icon">
              <ReceiptText size={20} />
            </div>
            <span>
              <strong>Nova venda</strong>
              <small>Registrar abastecimento</small>
            </span>
          </button>
          <button>
            <div className="quick-icon">
              <BadgeDollarSign size={20} />
            </div>
            <span>
              <strong>Receber pagamento</strong>
              <small>Baixar dívida de cliente</small>
            </span>
          </button>
        </section>
      </main>
    </div>
  );
}
