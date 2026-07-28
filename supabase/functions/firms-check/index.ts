// ============================================================================
// firms-check — superficie MINIMA pro verificador diario de links de afiliado
// Data: 2026-07-28
//
// POR QUE ESTA FUNCAO EXISTE
// O GitHub Actions precisa (a) ler a tabela `firms` e (b) desativar uma firma
// quando o link quebra. A saida obvia seria por a SUPABASE_SERVICE_ROLE_KEY num
// secret do Actions — e seria um erro grave:
//   - service role IGNORA RLS: le e escreve o banco INTEIRO, nao so `firms`.
//     Toda a blindagem testada na Etapa 2 (anon com 401 em INSERT/UPDATE)
//     deixa de valer pra quem tiver essa chave.
//   - com commit-back ligado, a superficie de vazamento e maior ainda.
//   - service role vazada so se revoga rotacionando o projeto todo.
//
// Entao: a service role NUNCA sai do Supabase. Ela vive aqui dentro. O Actions
// carrega so o FIRMS_CHECK_TOKEN, e o pior caso de um vazamento desse token e
// alguem DESATIVAR uma firma (reversivel num UPDATE) — nao perder o banco.
//
// CONTRATO — exatamente duas operacoes, nada alem disso:
//   GET  /firms-check   -> todas as firms, INCLUSIVE ativo=false
//                          (precisa enxergar as inativas pra detectar quando voltam)
//   POST /firms-check   -> { slug, motivo } marca ativo=false + needs_review=true
//                          NAO aceita alterar cupom, URL, tracking ou qualquer
//                          outro campo. O corpo e' ignorado fora desses 2 nomes.
//
// Deploy:
//   npx supabase functions deploy firms-check --project-ref qfwhduvutfumsaxnuofa --no-verify-jwt
//   (--no-verify-jwt porque a autenticacao aqui e' o X-Firms-Token, nao JWT)
// ============================================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SB_URL = Deno.env.get("SUPABASE_URL") || "https://qfwhduvutfumsaxnuofa.supabase.co";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const TOKEN = Deno.env.get("FIRMS_CHECK_TOKEN") || "";

// Colunas devolvidas no GET. `extra` entra porque o verificador usa
// extra.verificacao='js' pra saber que a atribuicao e' invisivel headless.
const COLS = "slug,nome,affiliate_url,tracking_param,tracking_value," +
             "coupon_code,coupon_description,ativo,needs_review,extra";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-firms-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Comparacao em tempo constante: evita que um atacante descubra o token
// caractere por caractere medindo o tempo de resposta.
function tokenConfere(recebido: string): boolean {
  if (!TOKEN || !recebido) return false;
  const a = new TextEncoder().encode(recebido);
  const b = new TextEncoder().encode(TOKEN);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function sb(path: string, init: RequestInit = {}) {
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  if (!SERVICE_KEY || !TOKEN) {
    // Falha explicita: melhor 500 do que rodar sem autenticacao.
    return json({ error: "funcao mal configurada (faltam secrets)" }, 500);
  }

  if (!tokenConfere(req.headers.get("x-firms-token") || "")) {
    // Nunca ecoar o que foi recebido: o log do Actions guardaria a tentativa.
    return json({ error: "token invalido" }, 401);
  }

  // ── GET: leitura ────────────────────────────────────────────────────────
  if (req.method === "GET") {
    const r = await sb(`firms?select=${COLS}&order=slug`);
    if (!r.ok) return json({ error: "falha ao ler firms" }, 502);
    const linhas = await r.json();
    return json({ ok: true, total: linhas.length, firms: linhas });
  }

  // ── POST: a UNICA escrita permitida ─────────────────────────────────────
  if (req.method === "POST") {
    let corpo: Record<string, unknown>;
    try {
      corpo = await req.json();
    } catch {
      return json({ error: "corpo nao e JSON" }, 400);
    }

    const slug = typeof corpo.slug === "string" ? corpo.slug.trim() : "";
    const motivo = typeof corpo.motivo === "string" ? corpo.motivo.slice(0, 500) : "";
    if (!slug) return json({ error: "slug obrigatorio" }, 400);
    if (!/^[a-z0-9-]{2,40}$/.test(slug)) return json({ error: "slug invalido" }, 400);

    // Allowlist EXPLICITA. Qualquer campo alem de slug/motivo e' rejeitado —
    // nao ignorado em silencio. Se o verificador algum dia for comprometido e
    // tentar reescrever um cupom ou uma affiliate_url, ele toma 400 e o log
    // registra a tentativa. Ignorar caladamente esconderia o ataque.
    const PERMITIDOS = new Set(["slug", "motivo"]);
    const proibidos = Object.keys(corpo).filter((k) => !PERMITIDOS.has(k));
    if (proibidos.length) {
      return json({
        error: "campo nao permitido",
        campos: proibidos,
        permitido: "esta funcao so desativa uma firma; nunca altera cupom, URL ou tracking",
      }, 400);
    }

    const existe = await sb(`firms?slug=eq.${encodeURIComponent(slug)}&select=slug,ativo`);
    if (!existe.ok) return json({ error: "falha ao consultar firma" }, 502);
    const achadas = await existe.json();
    if (!achadas.length) return json({ error: "firma nao existe", slug }, 404);

    // O UPDATE e' literal e fechado: dois booleanos. Nenhum valor vem do corpo.
    const r = await sb(`firms?slug=eq.${encodeURIComponent(slug)}`, {
      method: "PATCH",
      body: JSON.stringify({ ativo: false, needs_review: true }),
    });
    if (!r.ok) return json({ error: "falha ao desativar" }, 502);
    const linha = (await r.json())[0];

    console.log(`[firms-check] ${slug} desativada | motivo: ${motivo || "(sem motivo)"}`);
    return json({
      ok: true,
      slug,
      ativo: linha?.ativo,
      needs_review: linha?.needs_review,
      motivo,
    });
  }

  return json({ error: "metodo nao suportado" }, 405);
});
