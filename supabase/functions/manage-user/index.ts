import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) {
      console.error("manage-user: variáveis obrigatórias ausentes");
      return json(
        { success: false, error: "Configuração da função incompleta." },
        500,
      );
    }
    const auth = req.headers.get("Authorization");
    if (!auth)
      return json({ success: false, error: "Sessão não informada." }, 401);
    const caller = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });
    const {
      data: { user },
      error: userError,
    } = await caller.auth.getUser();
    if (userError || !user)
      return json({ success: false, error: "Sessão inválida." }, 401);
    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: perfil } = await admin
      .from("perfis")
      .select("empresa_id,perfil,ativo")
      .eq("id", user.id)
      .single();
    if (!perfil?.ativo || perfil.perfil !== "administrador")
      return json(
        {
          success: false,
          error: "Somente administrador pode gerenciar usuários.",
        },
        403,
      );
    const body = await req.json();
    const action = String(body.action || "");
    if (action === "create") {
      const email = String(body.email || "")
        .trim()
        .toLowerCase();
      const password = String(body.password || "");
      const nome = String(body.nome || "").trim();
      if (
        !nome ||
        !email ||
        password.length < 8 ||
        !["administrador", "gerente", "frentista"].includes(body.perfil)
      )
        return json(
          { success: false, error: "Dados do usuário inválidos." },
          400,
        );
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome },
      });
      const createdId = created?.user?.id;
      if (error || !createdId) {
        console.error(
          "manage-user createUser",
          error?.message || "user_id ausente",
        );
        return json(
          {
            success: false,
            error:
              error?.message ||
              "Não foi possível criar o usuário no Supabase Auth.",
          },
          400,
        );
      }
      const { error: profileError } = await admin
        .from("perfis")
        .upsert({
          id: createdId,
          empresa_id: perfil.empresa_id,
          nome,
          email,
          perfil: body.perfil,
          ativo: body.ativo !== false,
          must_change_password: true,
        });
      if (profileError) {
        const { error: rollbackError } =
          await admin.auth.admin.deleteUser(createdId);
        if (rollbackError)
          console.error("manage-user rollback", rollbackError.message);
        return json(
          {
            success: false,
            error: `Usuário não vinculado ao perfil: ${profileError.message}`,
          },
          400,
        );
      }
      return json({ success: true, user_id: createdId });
    }
    const targetId = String(body.user_id || "");
    const { data: target } = await admin
      .from("perfis")
      .select("id,empresa_id")
      .eq("id", targetId)
      .eq("empresa_id", perfil.empresa_id)
      .single();
    if (!target)
      return json(
        { success: false, error: "Usuário não encontrado nesta empresa." },
        404,
      );
    if (action === "reset_password") {
      const password = String(body.password || "");
      if (password.length < 8)
        return json(
          {
            success: false,
            error: "A senha deve ter pelo menos 8 caracteres.",
          },
          400,
        );
      const { error } = await admin.auth.admin.updateUserById(targetId, {
        password,
      });
      if (error) return json({ success: false, error: error.message }, 400);
      await admin
        .from("perfis")
        .update({ must_change_password: true })
        .eq("id", targetId)
        .eq("empresa_id", perfil.empresa_id);
      return json({ success: true });
    }
    if (action === "update_profile") {
      const values: { nome?: string; perfil?: string; ativo?: boolean } = {};
      if (body.nome) values.nome = String(body.nome).trim();
      if (["administrador", "gerente", "frentista"].includes(body.perfil))
        values.perfil = body.perfil;
      if (typeof body.ativo === "boolean") values.ativo = body.ativo;
      const { error } = await admin
        .from("perfis")
        .update(values)
        .eq("id", targetId)
        .eq("empresa_id", perfil.empresa_id);
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true });
    }
    return json({ success: false, error: "Ação inválida." }, 400);
  } catch (error) {
    console.error(
      "manage-user",
      error instanceof Error ? error.message : "erro desconhecido",
    );
    return json(
      { success: false, error: "Não foi possível gerenciar o usuário." },
      500,
    );
  }
});
