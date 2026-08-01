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

    return new Response(JSON.stringify({ erro: "acao_desconhecida" }), { status: 400, headers: H });
  } catch (e) {
    return new Response(JSON.stringify({ erro: "excecao", detalhe: String(e).slice(0, 200) }), { status: 500, headers: H });
  }
});
