import { useState } from 'react';
import { Fuel, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';

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
        <div className="brand-mark large"><Fuel size={34} /></div>
        <div>
          <span className="eyebrow light">GESTÃO INTELIGENTE</span>
          <h1>Posto Gestão</h1>
          <p>Controle de caixa, clientes, fiado e combustível em um único lugar.</p>
        </div>
      </section>

      <section className="login-card-wrap">
        <form className="login-card" onSubmit={submit}>
          <div className="brand-inline">
            <div className="brand-mark"><Fuel size={24} /></div>
            <div>
              <strong>Posto Gestão</strong>
              <small>Acesso ao sistema</small>
            </div>
          </div>

          <div className="login-title">
            <h2>Entrar</h2>
            <p>Informe seus dados para acessar o painel.</p>
          </div>

          <label>
            E-mail
            <div className="input-wrap">
              <Mail size={18} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="seu@email.com" />
            </div>
          </label>

          <label>
            Senha
            <div className="input-wrap">
              <LockKeyhole size={18} />
              <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} placeholder="Sua senha" />
              <button className="icon-button" type="button" onClick={() => setShowPassword((v) => !v)} aria-label="Mostrar senha">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <div className="login-row">
            <label className="checkbox-label"><input type="checkbox" defaultChecked /> Manter conectado</label>
            <button className="text-button" type="button">Esqueci minha senha</button>
          </div>

          <button className="primary-button" type="submit">Entrar no sistema</button>

          <div className="demo-note">
            <strong>Demo inicial</strong>
            <span>Use os dados já preenchidos para entrar.</span>
          </div>
        </form>
      </section>
    </div>
  );
}
