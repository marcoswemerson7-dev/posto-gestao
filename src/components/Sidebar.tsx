import {
  LayoutDashboard, WalletCards, Fuel, Users, BadgeDollarSign, ReceiptText,
  Warehouse, Truck, UserRoundCog, BarChart3, ShieldCheck, Settings, LogOut,
  CircleDollarSign
} from 'lucide-react';

const items = [
  ['Dashboard', LayoutDashboard],
  ['Caixa', WalletCards],
  ['Vendas', CircleDollarSign],
  ['Combustíveis', Fuel],
  ['Estoque', Warehouse],
  ['Clientes', Users],
  ['Contas a Receber', BadgeDollarSign],
  ['Despesas', ReceiptText],
  ['Fornecedores', Truck],
  ['Funcionários', UserRoundCog],
  ['Relatórios', BarChart3],
  ['Auditoria', ShieldCheck],
  ['Configurações', Settings],
] as const;

type Props = { onLogout: () => void };

export default function Sidebar({ onLogout }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark"><Fuel size={24} /></div>
        <div><strong>Posto Gestão</strong><small>Painel Administrativo</small></div>
      </div>

      <nav>
        {items.map(([label, Icon], index) => (
          <button key={label} className={`nav-item ${index === 0 ? 'active' : ''}`}>
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
  );
}
