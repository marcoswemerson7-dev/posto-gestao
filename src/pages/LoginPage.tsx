import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";

import { supabase } from "../lib/supabase";

type Props = {
  onLogin: () => void;
};

export default function LoginPage({ onLogin }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    const emailLimpo = email.trim();

    if (!emailLimpo || !password) {
      setError("Informe seu e-mail e senha.");
      return;
    }

    try {
      setLoading(true);

      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: emailLimpo,
          password,
        });

      if (loginError) {
        console.error(loginError);
        setError("E-mail ou senha inválidos.");
        return;
      }

      if (!data.user) {
        setError("Não foi possível identificar o usuário.");
        return;
      }

      const { data: perfil, error: perfilError } = await supabase
        .from("perfis")
        .select(
          `
          id,
          nome,
          email,
          perfil,
          ativo,
          empresa_id
        `,
        )
        .eq("id", data.user.id)
        .single();

      if (perfilError || !perfil) {
        console.error(perfilError);

        await supabase.auth.signOut();

        setError("Seu login existe, mas o perfil não pôde ser carregado.");

        return;
      }

      if (!perfil.ativo) {
        await supabase.auth.signOut();

        setError("Este usuário está desativado. Procure o administrador.");

        return;
      }

      const perfisPermitidos = ["administrador", "gerente", "frentista"];

      if (!perfisPermitidos.includes(perfil.perfil)) {
        await supabase.auth.signOut();

        setError("Seu usuário não possui um perfil de acesso válido.");

        return;
      }

      onLogin();
    } catch (err) {
      console.error(err);

      setError("Não foi possível entrar no sistema. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <section className="login-brand-panel">
        <div className="login-brand-content">
          <img
            src="/logo-posto.png"
            alt="Posto dos Cerrados"
            className="login-logo"
          />

          <h1>Posto dos Cerrados</h1>

          <div className="login-title-line" />

          <p>
            Gestão inteligente de caixa, vendas, estoque em litros, clientes e
            contas a receber.
          </p>
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
                autoComplete="email"
                disabled={loading}
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
                type={showPassword ? "text" : "password"}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                disabled={loading}
              />

              <button
                className="icon-button"
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                disabled={loading}
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

            <button className="text-button" type="button">
              Esqueci minha senha
            </button>
          </div>

          {error && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                background: "#fff1f2",
                color: "#be123c",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar no sistema"}
          </button>
        </form>
      </section>
    </div>
  );
}
