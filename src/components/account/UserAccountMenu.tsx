import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Eye,
  EyeOff,
  LogOut,
  Pencil,
  Settings,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import {
  atualizarMeuPerfil,
  enviarAvatar,
  removerAvatar,
  urlAvatar,
} from "../../lib/postoData";

export type AccountUser = {
  id: string;
  empresaId: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  phone?: string;
  jobTitle?: string;
  avatarPath?: string;
  createdAt?: string;
};
type Props = {
  user: AccountUser;
  companyName: string;
  onLogout: () => void | Promise<void>;
  onUpdated: () => Promise<void>;
};
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("") || "U";
function Avatar({
  user,
  large = false,
  preview,
  forceInitial = false,
}: {
  user: AccountUser;
  large?: boolean;
  preview?: string;
  forceInitial?: boolean;
}) {
  const src = forceInitial ? "" : preview || urlAvatar(user.avatarPath);
  return (
    <span className={`account-avatar ${large ? "large" : ""}`}>
      {src ? (
        <img src={src} alt={`Foto de ${user.name}`} />
      ) : (
        initials(user.name)
      )}
    </span>
  );
}
function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal account-dialog"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="round-button sm" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function UserAccountMenu({
  user,
  companyName,
  onLogout,
  onUpdated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<"profile" | "edit" | "password" | null>(
    null,
  );
  const root = useRef<HTMLDivElement>(null);
  const [edit, setEdit] = useState({
    name: user.name,
    phone: user.phone || "",
    file: null as File | null,
    preview: "",
    remove: false,
    saving: false,
  });
  const [password, setPassword] = useState({
    value: "",
    confirm: "",
    show: false,
    saving: false,
  });
  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setDialog(null);
      }
    };
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", key);
    };
  }, []);
  useEffect(
    () => setEdit((x) => ({ ...x, name: user.name, phone: user.phone || "" })),
    [user.name, user.phone],
  );
  useEffect(
    () => () => {
      if (edit.preview) URL.revokeObjectURL(edit.preview);
    },
    [edit.preview],
  );
  function resetEdit() {
    setEdit({
      name: user.name,
      phone: user.phone || "",
      file: null,
      preview: "",
      remove: false,
      saving: false,
    });
  }
  function openEdit() {
    resetEdit();
    setOpen(false);
    setDialog("edit");
  }
  function closeEdit() {
    if (edit.saving) return;
    resetEdit();
    setDialog(null);
  }
  function selectPhoto(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      return alert("Use uma imagem JPG, PNG ou WEBP.");
    if (file.size > 5 * 1024 * 1024)
      return alert("A imagem deve ter no máximo 5 MB.");
    if (edit.preview) URL.revokeObjectURL(edit.preview);
    setEdit({
      ...edit,
      file,
      preview: URL.createObjectURL(file),
      remove: false,
    });
  }
  async function saveProfile() {
    if (!edit.name.trim()) return alert("Informe o nome completo.");
    setEdit((x) => ({ ...x, saving: true }));
    let uploadedAvatar: string | null = null;
    let profileSaved = false;
    try {
      const previousAvatar = user.avatarPath || null;
      let avatar = edit.remove ? null : previousAvatar;
      if (edit.file) {
        uploadedAvatar = await enviarAvatar(user.empresaId, user.id, edit.file);
        avatar = uploadedAvatar;
      }
      await atualizarMeuPerfil(edit.name, edit.phone, avatar);
      profileSaved = true;
      if (previousAvatar && previousAvatar !== avatar)
        try {
          await removerAvatar(previousAvatar);
        } catch (cleanupError) {
          console.error(
            "Falha ao remover avatar anterior",
            cleanupError instanceof Error ? cleanupError.message : "erro",
          );
        }
      await onUpdated();
      setDialog(null);
      resetEdit();
      alert("Perfil atualizado com sucesso.");
    } catch (error) {
      if (uploadedAvatar && !profileSaved)
        try {
          await removerAvatar(uploadedAvatar);
        } catch (cleanupError) {
          console.error(
            "Falha ao limpar avatar não utilizado",
            cleanupError instanceof Error ? cleanupError.message : "erro",
          );
        }
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o perfil.",
      );
      setEdit((x) => ({ ...x, saving: false }));
    }
  }
  async function changePassword() {
    if (password.value.length < 8)
      return alert("A senha deve ter pelo menos 8 caracteres.");
    if (password.value !== password.confirm)
      return alert("As senhas não coincidem.");
    setPassword((x) => ({ ...x, saving: true }));
    try {
      const { error } = await supabase.auth.updateUser({
        password: password.value,
      });
      if (error) throw error;
      setPassword({ value: "", confirm: "", show: false, saving: false });
      setDialog(null);
      alert("Senha alterada com sucesso.");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar a senha.",
      );
      setPassword((x) => ({ ...x, saving: false }));
    }
  }
  const choose = (value: typeof dialog) => {
    setOpen(false);
    setDialog(value);
  };
  return (
    <div className="account-menu" ref={root}>
      <button
        className="account-trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <Avatar user={user} />
        <span className="account-identity">
          <strong>{user.name}</strong>
          <small>{user.jobTitle || user.role}</small>
        </span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="account-dropdown">
          <div className="account-summary">
            <Avatar user={user} />
            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
              <small>{user.role}</small>
            </div>
          </div>
          <div className="account-divider" />
          <button onClick={() => choose("profile")}>
            <UserRound size={17} />
            Meu Perfil
          </button>
          <button onClick={openEdit}>
            <Pencil size={17} />
            Editar Perfil
          </button>
          <button onClick={() => choose("password")}>
            <ShieldCheck size={17} />
            Alterar Senha
          </button>
          <button onClick={() => choose("profile")}>
            <Settings size={17} />
            Configurações da Conta
          </button>
          <div className="account-divider" />
          <button className="danger" onClick={onLogout}>
            <LogOut size={17} />
            Sair
          </button>
        </div>
      )}
      {dialog === "profile" && (
        <Dialog title="Minha Conta" onClose={() => setDialog(null)}>
          <div className="profile-overview">
            <Avatar user={user} large />
            <h3>{user.name}</h3>
            <span>{user.jobTitle || user.role}</span>
          </div>
          <div className="profile-info">
            <h4>Informações pessoais</h4>
            <p>
              <b>Nome completo</b>
              <span>{user.name}</span>
            </p>
            <p>
              <b>E-mail</b>
              <span>{user.email}</span>
            </p>
            <p>
              <b>Telefone</b>
              <span>{user.phone || "Não informado"}</span>
            </p>
            <h4>Informações profissionais</h4>
            <p>
              <b>Cargo</b>
              <span>{user.jobTitle || user.role}</span>
            </p>
            <p>
              <b>Perfil de acesso</b>
              <span>{user.role}</span>
            </p>
            <p>
              <b>Empresa/Posto</b>
              <span>{companyName}</span>
            </p>
            <p>
              <b>Data de cadastro</b>
              <span>
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("pt-BR")
                  : "Não informada"}
              </span>
            </p>
          </div>
          <button className="primary-button" onClick={openEdit}>
            Editar Perfil
          </button>
        </Dialog>
      )}
      {dialog === "edit" && (
        <Dialog title="Editar Perfil" onClose={closeEdit}>
          <div className="profile-photo-edit">
            <Avatar
              user={user}
              large
              preview={edit.preview}
              forceInitial={edit.remove}
            />
            <div className="profile-photo-copy">
              <strong>Foto do perfil</strong>
              <small>JPG, PNG ou WEBP • máximo de 5 MB</small>
            </div>
            <div className="profile-photo-actions">
              <label className="secondary-button">
                Selecionar foto
                <input
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => selectPhoto(e.target.files?.[0])}
                />
              </label>
              {(user.avatarPath || edit.preview) && !edit.remove && (
                <button
                  className="danger-button"
                  onClick={() =>
                    setEdit({ ...edit, file: null, preview: "", remove: true })
                  }
                >
                  <Trash2 size={16} />
                  Remover foto
                </button>
              )}
            </div>
          </div>
          <div className="form-grid">
            <label>
              Nome completo
              <input
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </label>
            <label>
              Telefone
              <input
                value={edit.phone}
                onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
              />
            </label>
            <label>
              E-mail
              <input readOnly value={user.email} />
            </label>
            <label>
              Perfil de acesso
              <input readOnly value={user.role} />
            </label>
            <div className="modal-actions span2">
              <button className="secondary-button" onClick={closeEdit}>
                Cancelar
              </button>
              <button
                className="primary-button"
                disabled={edit.saving}
                onClick={saveProfile}
              >
                {edit.saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </Dialog>
      )}
      {dialog === "password" && (
        <Dialog
          title="Alterar Senha"
          onClose={() => !password.saving && setDialog(null)}
        >
          <div className="form-grid">
            <label>
              Nova senha
              <div className="password-field">
                <input
                  type={password.show ? "text" : "password"}
                  value={password.value}
                  onChange={(e) =>
                    setPassword({ ...password, value: e.target.value })
                  }
                />
                <button
                  className="table-icon"
                  onClick={() =>
                    setPassword({ ...password, show: !password.show })
                  }
                >
                  {password.show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <label>
              Confirmar nova senha
              <input
                type={password.show ? "text" : "password"}
                value={password.confirm}
                onChange={(e) =>
                  setPassword({ ...password, confirm: e.target.value })
                }
              />
            </label>
            <button
              className="primary-button span2"
              disabled={password.saving}
              onClick={changePassword}
            >
              {password.saving ? "Alterando..." : "Alterar senha"}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
