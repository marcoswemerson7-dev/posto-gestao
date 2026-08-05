import { useState } from 'react';
import {
  BarChart3,
  Droplets,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Users,
  WalletCards,
} from 'lucide-react';

type Props = {
  onLogin: () => void;
};

export default function LoginPage({ onLogin }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('admin@postogestao.com');
  const [password, setPassword] = useState('123456');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (email && password) onLogin();
  }

  return (
    <div className="login-shell">
      <section className="login-brand-panel">
        <div className="login-brand-content">
          <img
            className="login-logo-large"
            src="/logo-posto.png"
            alt="Posto dos Cerrados"
          />

          <h1>Posto dos Cerrados</h1>
          <div className="login-title-line" />
          <p>
            Gestão inteligente de caixa, vendas, estoque em litros, clientes e
            contas a receber.
          </p>

          <div className="login-feature-icons" aria-hidden="true">
            <div className="login-feature-item"><Droplets size={28} /></div>
            <div className="login-feature-item"><WalletCards size={28} /></div>
            <div className="login-feature-item"><Users size={28} /></div>
            <div className="login-feature-item"><BarChart3 size={28} /></div>
          </div>
        </div>
      </section>

      <section className="login-card-wrap">
        <form className="login-card" onSubmit={submit}>
          <div className="login-access-badge">
            <LockKeyhole size={16} />
            <span>Acesso ao sistema</span>
          </div>

          <div className="login-title">
            <h2>Entrar</h2>
            <p>Informe seus dados para acessar o painel.</p>
          </div>

          <label>
            E-mail
            <div className="input-wrap">
              <Mail size={18} />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Digite seu e-mail"
              />
            </div>
          </label>

          <label>
            Senha
            <div className="input-wrap">
              <LockKeyhole size={18} />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                placeholder="Digite sua senha"
              />
              <button
                className="icon-button"
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label="Mostrar senha"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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

          <button className="primary-button" type="submit">Entrar no sistema</button>

          <div className="demo-note">
            <strong>Acesso inicial / demonstração</strong>
            <span>admin@postogestao.com &nbsp;•&nbsp; 123456</span>
          </div>
        </form>
      </section>
    </div>
  );
}
