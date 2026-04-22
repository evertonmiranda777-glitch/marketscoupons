// Vercel Serverless — Gera copy Instagram pra firma via Gemini 2.5 Flash
// POST /api/gen-firm-copy { firmId, lang? }
// Uso: admin Criativos tab

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

const LANG_NAMES = { pt: 'Portuguese (Brazil)', en: 'English', es: 'Spanish' };

function buildPrompt(firm, langName) {
  const prices = Array.isArray(firm.prices) ? firm.prices.slice(0, 4).map(p => `${p.a}: ${p.n}${p.o ? ` (era ${p.o})` : ''}`).join(' | ') : '';
  const perks = Array.isArray(firm.perks) ? firm.perks.slice(0, 6).join(', ') : '';
  const platforms = Array.isArray(firm.platforms) ? firm.platforms.join(', ') : '';
  const tp = firm.trustpilot_score ? `Trustpilot ${firm.trustpilot_score}/5 com ${firm.trustpilot_reviews || '?'} reviews` : '';
  const couponLine = firm.coupon ? `CUPOM: ${firm.coupon} — ${firm.discount}% OFF${firm.discount_type ? ` (${firm.discount_type})` : ''}` : (firm.discount ? `${firm.discount}% OFF aplicado automático via link (sem cupom)` : '');

  // Escolhe preço mais barato pra usar como headline de urgência
  const cheapest = Array.isArray(firm.prices) && firm.prices.length
    ? firm.prices.reduce((a, b) => {
        const pa = parseFloat((a.n || '').replace(/[^0-9.]/g, '')) || Infinity;
        const pb = parseFloat((b.n || '').replace(/[^0-9.]/g, '')) || Infinity;
        return pa < pb ? a : b;
      })
    : null;
  const cheapLine = cheapest ? `Conta mais barata: ${cheapest.a} por ${cheapest.n}${cheapest.o ? ` (era ${cheapest.o})` : ''}` : '';

  return `Você é um copywriter de Instagram ELITE, nível Hormozi + top afiliado brasileiro de trading. Direct response, agressivo, conversão. Não é advertorial corporativo.

Escrevo em ${langName} uma caption de Instagram pra uma prop firm. Alvo: trader que faz scroll no feed às 22h, desmotivado, cansado de prop firm cara, já testou 2-3 e estourou. Meu trabalho: fazer ele PARAR o scroll, sentir "porra, essa é diferente", clicar no link da bio AGORA.

━━━ DADOS DA FIRMA (fonte única de verdade — ZERO invenção) ━━━
Nome: ${firm.name} (curto: ${firm.short_name || firm.name})
Tipo: ${firm.type || 'Prop firm'}
${couponLine}
Profit split: ${firm.split || '—'}
Drawdown: ${firm.drawdown || '—'} ${firm.dd_pct ? `(${firm.dd_pct})` : ''}
Meta: ${firm.target || '—'}
Escala: ${firm.scaling || '—'}
Dias mín: ${firm.min_days || '—'} | Avaliação: ${firm.eval_days || 'ilimitado'} dias
Plataformas: ${platforms}
Preços: ${prices}
${cheapLine}
Perks: ${perks}
${tp}
Descrição: ${firm.description || ''}

━━━ ESTRUTURA OBRIGATÓRIA ━━━

LINHA 1 — HOOK ASSASSINO (máx 10 palavras, em CAIXA ALTA ou com número chocante)
Escolha UM destes ângulos (o mais forte pros dados da firma):
  a) Número choque: "$19.90. CONTA DE $25K. SEM PEGADINHA."
  b) Inimigo comum: "Cansado de prop firm com drawdown de $500?"
  c) Contrariar: "Enquanto FTMO cobra €155, isso aqui custa $19."
  d) Callout cru: "Trader quebrado lendo isso: presta atenção."
  e) Promessa específica: "Passa o desafio em 1 dia. Sem enrolação."
ZERO "Quer 100% dos seus lucros?" — isso é hook genérico de site de afiliado ruim.
ZERO emoji no hook.

[linha em branco]

LINHA 2-5 — BODY (4 linhas curtas, UMA POR LINHA, separadas por quebra)
Cada linha = 1 fato concreto com NÚMERO REAL. Formato exato:
  → ${firm.split || 'X%'} de profit split${firm.scaling ? ` (com escala até ${firm.scaling})` : ''}
  → ${firm.drawdown || 'DD'} de ${firm.dd_pct || 'X%'} — ${firm.drawdown === 'Trailing' ? 'perdoa swing' : firm.drawdown === 'Static' ? 'sem trailing que ferra' : 'regra clara'}
  → Plataformas fodas: ${platforms || 'várias'}
  → Trustpilot ${firm.trustpilot_score || '?'}/5 com ${firm.trustpilot_reviews || '?'} reviews reais
Ordene do mais impactante pro menos. Use linguagem de trader ("passa o desafio", "tira payout", "sem limite diário"), NUNCA advertorial ("proporciona aos operadores...").

[linha em branco]

LINHA 6 — PREÇO COMO PUNCH
Formato: "${cheapest ? cheapest.a : '25K'} por ${cheapest ? cheapest.n : '$X'}${cheapest && cheapest.o ? ` (antes ${cheapest.o})` : ''}. ${firm.coupon ? `Com o cupom ${firm.coupon}.` : 'Com desconto automático.'}"
Esse é o soco. Não dilua.

[linha em branco]

LINHA 7 — URGÊNCIA + CTA
${firm.coupon ? `"Cupom ${firm.coupon} tá ativo. Link na bio."` : `"Link na bio com desconto já aplicado."`}
Curta, imperativa. Pode adicionar "não dorme nessa" / "enquanto tá de pé" se encaixar.

[linha em branco]

LINHA 8 — HASHTAGS (10-12, separadas por espaço, todas minúsculas)
Mix: #propfirm #tradingfuturos #daytrade #${(firm.short_name || firm.name).toLowerCase().replace(/\s+/g,'')} + nicho (futuros/forex) + BR (#traderbrasileiro #mercadofinanceiro)

━━━ VOZ (ler 3x antes de escrever) ━━━
- Trader BR falando com trader BR. Nunca "nós da Markets Coupons acreditamos que..."
- Linhas CURTAS. Máx 12 palavras por linha. Quebra agressiva. IG respira.
- Zero adjetivo vazio ("incrível", "excelente", "melhor do mercado", "parceiro ideal").
- Zero clichê: "transforme sua trading", "eleve seu nível", "o futuro é agora", "chegou a hora".
- Use dinheiro concreto ($, R$, €) e % REAIS dos dados acima. Números convertem.
- 2-3 emojis NO MÁXIMO em toda caption (🔥 💰 ⚡ ✅). Nunca no hook.
- Se tiver prova social (Trustpilot 4.X, X reviews, X pagos), JOGA forte.

━━━ BANIDOS (sem exceção) ━━━
- "Quer X?" como hook. É fraco.
- "Conquiste", "libere seu potencial", "realize seus sonhos".
- Palavras de compliance proibidas: sinais, entrada, stop loss, take profit, recomendação, operação ao vivo, lucro garantido, trader profissional.
- Mencionar IA, Gemini, Claude ou como foi gerado.
- Prometer retorno/lucro: "você vai lucrar", "resultados garantidos".

━━━ OUTPUT ━━━
Escreva APENAS a caption final pronta pra colar no Instagram. Sem preâmbulo, sem "aqui está:", sem markdown (**negrito**), sem aspas envolvendo. Só o texto puro com as quebras de linha certas.`;
}

const ALLOWED_ORIGINS = [
  'https://www.marketscoupons.com',
  'https://marketscoupons.com',
  'https://marketscoupons.vercel.app',
];
function getCorsOrigin(req) {
  const origin = req.headers.origin || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

module.exports = async (req, res) => {
  const corsOrigin = getCorsOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const KEYS = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
  if (!KEYS.length) return res.status(503).json({ error: 'Copy generator unavailable' });

  const { firmId, lang } = req.body || {};
  if (!firmId || typeof firmId !== 'string') return res.status(400).json({ error: 'Missing firmId' });
  const langName = LANG_NAMES[lang] || LANG_NAMES.pt;

  // Buscar dados da firma no Supabase
  let firm;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/cms_firms?id=eq.${encodeURIComponent(firmId)}&select=*`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!r.ok) return res.status(502).json({ error: 'Firm fetch failed' });
    const arr = await r.json();
    firm = arr[0];
    if (!firm) return res.status(404).json({ error: 'Firm not found' });
  } catch (e) {
    return res.status(500).json({ error: 'Firm fetch error' });
  }

  const prompt = buildPrompt(firm, langName);
  const payload = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 1.15,
      topP: 0.95,
      thinkingConfig: { thinkingBudget: 0 },
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  });

  if (typeof module.exports._keyIdx === 'undefined') module.exports._keyIdx = 0;
  const startIdx = module.exports._keyIdx % KEYS.length;
  module.exports._keyIdx++;

  const delays = [1000, 2000];
  const maxAttempts = Math.max(2, KEYS.length);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const keyIdx = (startIdx + attempt) % KEYS.length;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEYS[keyIdx]}`;
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      const data = await resp.json();
      if (!resp.ok) {
        const errDetail = JSON.stringify(data).slice(0, 400);
        console.error(`[gen-firm-copy] gemini error (key ${keyIdx}):`, resp.status, errDetail);
        if (attempt < maxAttempts - 1) { await new Promise(r => setTimeout(r, delays[Math.min(attempt, delays.length - 1)])); continue; }
        return res.status(502).json({ error: 'Upstream error', status: resp.status, detail: errDetail });
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) {
        if (attempt < maxAttempts - 1) { await new Promise(r => setTimeout(r, delays[Math.min(attempt, delays.length - 1)])); continue; }
        return res.status(502).json({ error: 'Empty response' });
      }
      return res.status(200).json({ copy: text.trim(), firmName: firm.name });
    } catch (e) {
      console.error(`[gen-firm-copy] fetch error:`, e.message);
      if (attempt < maxAttempts - 1) { await new Promise(r => setTimeout(r, delays[Math.min(attempt, delays.length - 1)])); continue; }
      return res.status(500).json({ error: 'Gen error' });
    }
  }
  return res.status(502).json({ error: 'Upstream error after retries' });
};
