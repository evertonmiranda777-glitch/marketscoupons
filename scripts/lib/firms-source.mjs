/**
 * firms-source.mjs — fonte unica de dado de AFILIADO para os geradores estaticos.
 *
 * Por que existe: `cms_firms` guarda preco/regra/KB. Os dados de AFILIADO
 * (URL de cadastro, cupom, parametro de tracking) moram na tabela `firms`
 * desde 28/07/2026. As paginas em seo/, compare/ e guides/ sao HTML estatico:
 * se forem geradas a partir do `cms_firms` sozinho, um valor que divergiu
 * continua servido indefinidamente sem ninguem ver.
 *
 * mergeAffiliate() sobrepoe `firms` em cima das linhas do cms_firms, do mesmo
 * jeito que o app.js faz em runtime. Depois desse merge, `f.link` e `f.coupon`
 * sao SEMPRE o valor da tabela `firms`.
 *
 * Nao ha fallback silencioso: se a tabela `firms` nao responder, o processo
 * ABORTA. Gerar 900 paginas com dado velho e pior que nao gerar.
 */

const SB_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const PROJECT_REF = 'qfwhduvutfumsaxnuofa';

const FN_URL = process.env.FIRMS_CHECK_URL
  || 'https://qfwhduvutfumsaxnuofa.supabase.co/functions/v1/firms-check';

// Le pela Edge Function `firms-check` usando so o FIRMS_CHECK_TOKEN.
// E' esse o caminho que roda no GitHub Actions: a SUPABASE_SERVICE_ROLE_KEY
// (que ignora RLS e abre o banco inteiro) nunca sai do Supabase.
async function fetchViaFuncao() {
  const tok = process.env.FIRMS_CHECK_TOKEN;
  if (!tok) return [];
  const r = await fetch(FN_URL, { headers: { 'X-Firms-Token': tok } });
  if (!r.ok) return [];
  const d = await r.json();
  // So as ativas geram pagina: firma desativada pelo autofix nao volta pro ar sozinha.
  return (d.firms || []).filter((x) => x.ativo === true);
}

async function fetchFirmsTable() {
  const viaFn = await fetchViaFuncao();
  if (viaFn.length) return viaFn;

  // Caminho LOCAL (maquina do dono, .env.local). Nao usado no CI.
  const SR = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || '';
  const SBP = process.env.SUPABASE_ACCESS_TOKEN || '';
  const cols = 'slug,nome,affiliate_url,tracking_param,tracking_value,coupon_code,coupon_description,ativo,needs_review,extra';

  if (SR) {
    const r = await fetch(`${SB_URL}/rest/v1/firms?ativo=eq.true&select=${cols}`, {
      headers: { apikey: SR, Authorization: `Bearer ${SR}` },
    });
    const d = await r.json();
    if (Array.isArray(d) && d.length) return d;
  }
  if (SBP) {
    const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SBP}`, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({ query: `SELECT ${cols} FROM public.firms WHERE ativo = true` }),
    });
    const d = await r.json();
    if (Array.isArray(d) && d.length) return d;
  }
  return [];
}

/**
 * Sobrepoe os dados de afiliado da tabela `firms` nas linhas do cms_firms.
 * Devolve o MESMO array (mutado) pra nao quebrar quem ja o usava.
 * Lanca se a tabela nao responder ou se alguma firma ficar sem correspondencia.
 */
export async function mergeAffiliate(firms, { strict = true } = {}) {
  const aff = await fetchFirmsTable();
  if (!aff.length) {
    throw new Error(
      'tabela `firms` vazia ou inacessivel. Abortado de proposito: gerar pagina estatica\n' +
      'com dado de afiliado velho vaza comissao em silencio.\n' +
      'Defina FIRMS_CHECK_TOKEN (CI) ou SUPABASE_SERVICE_ROLE_KEY (local) e rode de novo.'
    );
  }

  const bySlug = Object.create(null);
  for (const a of aff) bySlug[a.slug] = a;

  const orfas = [];
  for (const f of firms) {
    const a = bySlug[f.id];
    if (!a) { orfas.push(f.id); continue; }
    f.link = a.affiliate_url;                 // sempre a rota de CADASTRO da tabela
    f.coupon = a.coupon_code || '';           // null na tabela = firma sem codigo
    f.tracking_param = a.tracking_param;
    f.tracking_value = a.tracking_value;
    f.aff_needs_review = a.needs_review === true;
    if (a.coupon_description) f.disc_note = f.disc_note || a.coupon_description;
    if (a.extra) f.aff_extra = a.extra;
  }

  if (orfas.length) {
    const msg = `firmas ativas no cms_firms SEM linha na tabela firms: ${orfas.join(', ')}`;
    if (strict) throw new Error(msg + '\nCadastre na tabela `firms` antes de gerar as paginas.');
    console.warn('  aviso: ' + msg);
  }

  console.log(`  [firms-source] ${aff.length} linhas de afiliado aplicadas sobre ${firms.length} firmas`);
  return firms;
}

/** Mapa slug -> linha da tabela `firms` (pra quem precisa do dado cru). */
export async function affiliateMap() {
  const aff = await fetchFirmsTable();
  const m = Object.create(null);
  for (const a of aff) m[a.slug] = a;
  return m;
}
