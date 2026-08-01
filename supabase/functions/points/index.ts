// Sistema de pontos , UNICA porta de escrita no saldo.
//
// O navegador NAO escreve em point_ledger nem em point_redemptions (grants revogados na
// migration). Tudo passa por aqui, que roda com service role e valida antes de gravar.
//
// POR QUE ASSIM: a giveaway_tickets deixa o app inserir direto, com `task` em texto livre.
// O UNIQUE la so impede repetir a MESMA palavra , da pra inventar task:'a1','a2','a3' e
// ganhar bilhete sem fim. Auditado em 31/07/2026: ninguem explorou (43 bilhetes, todos com
// nome oficial). Mas aqui o ponto vira CONTA DE PROP FIRM, entao vale dinheiro de verdade.
//
// IDENTIDADE VEM DO TOKEN, NUNCA DO CORPO. Se o user_id viesse no body, qualquer um
// creditaria ponto na conta de qualquer um. O Authorization e validado contra o Supabase
// Auth e o uid sai de la.
//
// Deploy:  npx supabase functions deploy points --project-ref qfwhduvutfumsaxnuofa
// SEM --no-verify-jwt de proposito: esta funcao EXIGE usuario logado.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL_SB  = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON    = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const ORIGENS_OK = [
  "https://www.marketscoupons.com",
  "https://marketscoupons.com",
];

function cors(origin: string | null) {
  const ok = origin && ORIGENS_OK.includes(origin) ? origin : ORIGENS_OK[0];
  return {
    "Access-Control-Allow-Origin": ok,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false } });

/** uid do token. null = nao autenticado. NUNCA aceitar user_id do corpo. */
async function quemE(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization") || "";
  const jwt = auth.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return null;
  const cli = createClient(URL_SB, ANON, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data, error } = await cli.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const H = cors(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers: H });

  // Origin estranho e barrado; ausente (server-to-server) passa.
  if (origin && !ORIGENS_OK.includes(origin)) {
    return new Response(JSON.stringify({ erro: "origem_nao_permitida" }), { status: 403, headers: H });
  }

  const url = new URL(req.url);
  const acao = url.searchParams.get("action") || "me";

  const uid = await quemE(req);
  if (!uid) return new Response(JSON.stringify({ erro: "nao_autenticado" }), { status: 401, headers: H });

  try {
    // ── saldo, tier, tarefas e resgates do usuario
    if (acao === "me") {
      const [saldo, tarefas, feitas, premios, resgates] = await Promise.all([
        admin.from("v_user_points").select("saldo,ganho_total,tier").eq("user_id", uid).maybeSingle(),
        admin.from("point_tasks").select("*").eq("ativo", true).order("ordem"),
        admin.from("point_ledger").select("task_key,ref,created_at").eq("user_id", uid).in("motivo", ["task", "task_rep"]),
        admin.from("point_rewards").select("*").eq("ativo", true).order("ordem"),
        admin.from("point_redemptions").select("id,reward_slug,custo_pontos,status,created_at").eq("user_id", uid).order("created_at", { ascending: false }),
      ]);
      const jaFez = new Set((feitas.data ?? []).map((x: Record<string, unknown>) => x.task_key));
      return new Response(JSON.stringify({
        saldo: saldo.data?.saldo ?? 0,
        ganho_total: saldo.data?.ganho_total ?? 0,
        tier: saldo.data?.tier ?? "bronze",
        tarefas: (tarefas.data ?? []).map((t: Record<string, unknown>) => ({ ...t, feita: jaFez.has(t.key) })),
        premios: premios.data ?? [],
        resgates: resgates.data ?? [],
      }), { headers: H });
    }

    // ── creditar tarefa
    if (acao === "claim" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const key = String(body?.task_key || "");
      const ref = body?.ref ? String(body.ref) : null;

      // a tarefa TEM que existir e estar ativa. Nome inventado morre aqui , e morreria de
      // novo na FK, que e a garantia que nao depende deste if.
      const { data: tarefa } = await admin.from("point_tasks")
        .select("key,points,repeatable").eq("key", key).eq("ativo", true).maybeSingle();
      if (!tarefa) return new Response(JSON.stringify({ erro: "tarefa_invalida" }), { status: 400, headers: H });

      // repetivel exige `ref` (id da review, do indicado...), senao repetiria infinito
      if (tarefa.repeatable && !ref) {
        return new Response(JSON.stringify({ erro: "ref_obrigatoria" }), { status: 400, headers: H });
      }

      const { error } = await admin.from("point_ledger").insert({
        user_id: uid,
        delta: tarefa.points,
        task_key: key,
        motivo: tarefa.repeatable ? "task_rep" : "task",
        ref,
      });
      // 23505 = indice unico: ja tinha feito. Nao e erro do usuario, e o sistema funcionando.
      if (error) {
        const dup = String(error.code) === "23505";
        return new Response(JSON.stringify({ erro: dup ? "ja_creditada" : "falha", detalhe: dup ? null : error.message }),
          { status: dup ? 409 : 500, headers: H });
      }
      const { data: novo } = await admin.from("v_user_points").select("saldo,tier").eq("user_id", uid).maybeSingle();
      return new Response(JSON.stringify({ ok: true, ganhou: tarefa.points, saldo: novo?.saldo ?? 0, tier: novo?.tier }), { headers: H });
    }

    // ── resgatar premio (desconto atomico dentro do banco, com trava de linha)
    if (acao === "redeem" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const slug = String(body?.reward_slug || "");
      if (!slug) return new Response(JSON.stringify({ erro: "premio_obrigatorio" }), { status: 400, headers: H });

      const { data, error } = await admin.rpc("resgatar_premio", { p_user: uid, p_reward: slug });
      if (error) return new Response(JSON.stringify({ erro: "falha", detalhe: error.message }), { status: 500, headers: H });
      const r = data as Record<string, unknown>;
      return new Response(JSON.stringify(r), { status: r?.ok ? 200 : 400, headers: H });
    }

    // ── extrato
    if (acao === "extrato") {
      const { data } = await admin.from("point_ledger")
        .select("delta,task_key,motivo,nota,created_at").eq("user_id", uid)
        .order("created_at", { ascending: false }).limit(100);
      return new Response(JSON.stringify({ extrato: data ?? [] }), { headers: H });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ADMIN , aprovar / entregar / recusar resgate.
    //
    // Passa por aqui, e nao por escrita direta na tabela, DE PROPOSITO. A policy de admin
    // existe (pt_redemp_admin), mas o GRANT de UPDATE foi revogado pra `authenticated`, e
    // admin e authenticated , entao nem ele escreve pela tabela. Isso e' bom: mantem UMA
    // porta so pra qualquer mudanca de saldo, com o mesmo registro no extrato.
    //
    // A checagem e' profiles.is_admin no BANCO, nunca a allowlist de e-mail do admin.html
    // (aquela e' so UX e vive no cliente).
    // ══════════════════════════════════════════════════════════════════════════
    if (acao.startsWith("admin_")) {
      const { data: perfil } = await admin.from("profiles").select("is_admin").eq("id", uid).maybeSingle();
      if (!perfil?.is_admin) {
        return new Response(JSON.stringify({ erro: "nao_autorizado" }), { status: 403, headers: H });
      }

      // lista de pedidos, com quem pediu
      if (acao === "admin_resgates") {
        const status = url.searchParams.get("status");
        let q = admin.from("point_redemptions")
          .select("id,user_id,reward_slug,custo_pontos,status,nota_admin,created_at,updated_at")
          .order("created_at", { ascending: false }).limit(200);
        if (status) q = q.eq("status", status);
        const { data: pedidos } = await q;

        // junta nome/e-mail , a tabela guarda so o uuid
        const ids = [...new Set((pedidos ?? []).map((p: Record<string, unknown>) => p.user_id))];
        const { data: perfis } = ids.length
          ? await admin.from("profiles").select("id,email,full_name").in("id", ids)
          : { data: [] };
        const porId = new Map((perfis ?? []).map((p: Record<string, unknown>) => [p.id, p]));

        const { count: pendentes } = await admin.from("point_redemptions")
          .select("id", { count: "exact", head: true }).eq("status", "pendente");

        return new Response(JSON.stringify({
          pendentes: pendentes ?? 0,
          resgates: (pedidos ?? []).map((p: Record<string, unknown>) => ({
            ...p,
            usuario: porId.get(p.user_id) ?? null,
          })),
        }), { headers: H });
      }

      // muda a situacao do pedido
      if (acao === "admin_situacao" && req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        const id = Number(body?.id);
        const novo = String(body?.status || "");
        const nota = body?.nota ? String(body.nota) : null;
        if (!id || !["aprovado", "entregue", "recusado"].includes(novo)) {
          return new Response(JSON.stringify({ erro: "parametros_invalidos" }), { status: 400, headers: H });
        }

        // recusar devolve ponto e estoque , logica no banco, numa transacao so
        if (novo === "recusado") {
          if (!nota) return new Response(JSON.stringify({ erro: "motivo_obrigatorio" }), { status: 400, headers: H });
          const { data, error } = await admin.rpc("recusar_resgate", { p_id: id, p_nota: nota });
          if (error) return new Response(JSON.stringify({ erro: "falha", detalhe: error.message }), { status: 500, headers: H });
          const r = data as Record<string, unknown>;
          return new Response(JSON.stringify(r), { status: r?.ok ? 200 : 400, headers: H });
        }

        // entregue e recusado sao FINAIS: nao se volta atras. Correcao vira ajuste manual
        // no extrato, que fica registrado , sobrescrever apagaria o historico.
        const { data: atual } = await admin.from("point_redemptions").select("status").eq("id", id).maybeSingle();
        if (!atual) return new Response(JSON.stringify({ erro: "resgate_inexistente" }), { status: 404, headers: H });
        if (atual.status === "entregue" || atual.status === "recusado") {
          return new Response(JSON.stringify({ erro: "situacao_final", situacao: atual.status }), { status: 409, headers: H });
        }

        const { error } = await admin.from("point_redemptions")
          .update({ status: novo, nota_admin: nota, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) return new Response(JSON.stringify({ erro: "falha", detalhe: error.message }), { status: 500, headers: H });
        return new Response(JSON.stringify({ ok: true, status: novo }), { headers: H });
      }

      // ajuste manual de pontos (correcao, bonus). Fica no extrato com o motivo.
      if (acao === "admin_ajuste" && req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        const alvo = String(body?.user_id || "");
        const delta = Number(body?.delta);
        const nota = String(body?.nota || "");
        if (!alvo || !Number.isInteger(delta) || delta === 0 || !nota) {
          return new Response(JSON.stringify({ erro: "parametros_invalidos" }), { status: 400, headers: H });
        }
        const { error } = await admin.from("point_ledger")
          .insert({ user_id: alvo, delta, motivo: "admin", ref: uid, nota });
        if (error) return new Response(JSON.stringify({ erro: "falha", detalhe: error.message }), { status: 500, headers: H });
        return new Response(JSON.stringify({ ok: true }), { headers: H });
      }
    }

    return new Response(JSON.stringify({ erro: "acao_desconhecida" }), { status: 400, headers: H });
  } catch (e) {
    return new Response(JSON.stringify({ erro: "excecao", detalhe: String(e).slice(0, 200) }), { status: 500, headers: H });
  }
});
