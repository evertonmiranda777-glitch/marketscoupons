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

  const sortedPrices = Array.isArray(firm.prices) && firm.prices.length
    ? [...firm.prices].sort((a, b) => {
        const pa = parseFloat((a.n || '').replace(/[^0-9.]/g, '')) || Infinity;
        const pb = parseFloat((b.n || '').replace(/[^0-9.]/g, '')) || Infinity;
        return pa - pb;
      })
    : [];
  const cheapest = sortedPrices[0] || null;
  const priciest = sortedPrices[sortedPrices.length - 1] || null;  // decoy/anchor alto

  const langCode = langName.includes('Portuguese') ? 'pt' : langName.includes('Spanish') ? 'es' : 'en';

  // Whitelist de hashtags (evita alucinação tipo #nfl pra trading)
  const HASHTAGS_WHITELIST = {
    pt: {
      core: ['#propfirm', '#propfirmtrading', '#trader', '#trading', '#daytrade', '#mercadofinanceiro', '#traderbrasileiro', '#traderiniciante'],
      futures: ['#futuros', '#tradingfuturos', '#es', '#nq', '#mes', '#mnq', '#mgc', '#cl', '#daytradefuturos', '#mininasdaq', '#miniindice'],
      forex: ['#forex', '#tradingforex', '#mercadoforex', '#gbpusd', '#eurusd', '#forexbrasil'],
    },
    en: {
      core: ['#propfirm', '#propfirmtrading', '#trader', '#trading', '#daytrading', '#funded', '#fundedtrader'],
      futures: ['#futurestrading', '#futurestrader', '#es', '#nq', '#mes', '#mnq', '#mgc', '#cl', '#esfutures', '#nqfutures'],
      forex: ['#forex', '#forextrading', '#forextrader', '#eurusd', '#gbpusd', '#xauusd'],
    },
    es: {
      core: ['#propfirm', '#propfirmtrading', '#trader', '#trading', '#daytrading', '#mercadofinanciero', '#tradernovato'],
      futures: ['#futuros', '#tradingfuturos', '#es', '#nq', '#mes', '#mnq', '#minidax', '#miniindice'],
      forex: ['#forex', '#tradingforex', '#forexlatinoamerica', '#eurusd'],
    }
  };
  const whitelistBucket = HASHTAGS_WHITELIST[langCode] || HASHTAGS_WHITELIST.pt;
  const firmSlug = '#' + (firm.short_name || firm.name).toLowerCase().replace(/[^a-z0-9]/g, '');
  const typeWhitelist = (firm.type && /forex/i.test(firm.type)) ? whitelistBucket.forex : whitelistBucket.futures;
  const suggestedHashtags = [firmSlug, ...whitelistBucket.core.slice(0, 5), ...typeWhitelist.slice(0, 6)].slice(0, 12).join(' ');

  // Few-shot examples (PT) — mostrar EXEMPLOS > descrever regras (Gemini aprende com padrão)
  const FEW_SHOT_PT = `
EXEMPLO BOM 1 (Apex, cupom MARKET, $19.90):
Estourei 3 contas em 30 dias na FTMO.
Aí descobri essa.

→ $25K por $19.90 (era $199)
→ 100% dos lucros DEPOIS do primeiro payout
→ Trailing DD de -5% (perdoa swing)
→ Zero limite diário de perda
→ Payout em 5 dias

Trustpilot 4.4 com 18 mil reviews. Não é firma de um mês de vida.

Cupom MARKET tá ativo. Lifetime.
Link na bio. 🔥

#propfirm #apextraderfunding #futuros #daytrade #traderbrasileiro #mercadofinanceiro #prop #nfl #mnq #trading

---

EXEMPLO BOM 2 (Bulenox, cupom MARKET89, pass em 1 dia):
Quantos dias você levou pra passar seu último desafio?

Aqui passa em 1.

→ $25K por $15.95 (desconto de 89%)
→ Sem regra de consistência
→ Rithmic grátis por 14 dias
→ 90% de split (100% nos primeiros $10K)
→ Payout semanal, escala até $400K

Cupom MARKET89. Enquanto tá no ar.
Link na bio. ⚡

#propfirm #bulenox #futuros #tradovate #rithmic #daytrade #prop #mes #mnq #traderbrasileiro

---

EXEMPLO BOM 3 (FTMO, sem cupom, desconto via link):
FTMO não dá cupom.
A gente conseguiu um link com desconto automático.

→ €79 o desafio de 10K
→ 90% de split depois do funding
→ Static DD -10% (sem trailing que ferra)
→ MT4/MT5/cTrader
→ €500M+ pagos desde 2015

Trustpilot 4.8 com 41 mil reviews.
É a FTMO. Tá indo no link, tá com desconto.

Link na bio. ✅

#ftmo #propfirm #forex #mt5 #trader #tradingforex #mercadofinanceiro #propfirmforex #traderbrasileiro #daytrade

---

EXEMPLO RUIM (NÃO FAÇA ISSO):
Quer 100% dos seus lucros operando Futuros?

Fique com TUDO que você ganha! 🔥
Avaliação acessível, regras flexíveis.
Plataformas top do mercado.

Use o cupom MARKET para ganhar desconto.

Link na bio, pegue essa oferta agora! 💰

POR QUE É RUIM: hook é pergunta óbvia ("quem não quer?"), zero número específico, "TUDO" em caixa é genérico, "regras flexíveis" = vazio, "plataformas top" = vazio, CTA morno. É advertorial de afiliado ruim dos anos 2010.`;

  const FEW_SHOT_EN = `
GOOD EXAMPLE 1 (Apex, MARKET coupon, $19.90):
Blew 3 accounts in 30 days on FTMO.
Then I found this one.

→ $25K eval for $19.90 (was $199)
→ Keep 100% after first payout
→ -5% trailing DD (swing-friendly)
→ Zero daily loss limit
→ Payout in 5 days

Trustpilot 4.4 with 18K reviews. Not some rookie firm.

MARKET coupon is live. Lifetime.
Link in bio. 🔥

#propfirm #apextraderfunding #futurestrading #daytrading #funded #prop #es #nq #trading #traders

---

GOOD EXAMPLE 2 (Bulenox, MARKET89, 1-day pass):
How many days did your last eval take you?

This one passes in 1.

→ $25K for $15.95 (89% off)
→ No consistency rule
→ Free Rithmic for 14 days
→ 90% split (100% on first $10K)
→ Weekly payout, scale to $400K

MARKET89 code. While it lasts.
Link in bio. ⚡

#propfirm #bulenox #futurestrading #tradovate #rithmic #daytrading #prop #mes #mnq #funded

---

BAD EXAMPLE (DON'T DO THIS):
Want 100% of your profits trading Futures?

Keep EVERYTHING you earn! 🔥
Affordable eval, flexible rules.
Top platforms on the market.

Use code MARKET for a discount.

Link in bio, grab this deal now! 💰

WHY BAD: obvious rhetorical question, zero specific number, "EVERYTHING" caps is generic, "flexible rules" = empty, weak CTA.`;

  const fewShot = langCode === 'pt' ? FEW_SHOT_PT : FEW_SHOT_EN;

  return `# PAPEL
Copywriter sênior de direct response pra Instagram, nicho de trading. Base: Cialdini (influência), Kahneman (loss aversion, anchoring), Hormozi (value equation), Ogilvy (especificidade). Você NÃO escreve advertorial. Você escreve caption que para o scroll, vira consideração em click.

# CONTEXTO
Markets Coupons = afiliada de prop firms. Monetiza quando trader clica no link da bio e compra avaliação com nosso cupom. Essa caption vende UMA firma específica.

# AUDIÊNCIA (Voice of Customer — use as palavras deles, não as suas)
- Homem 25-40, Brasil/LatAm (ou global se idioma EN).
- Awareness stage: PRODUCT-AWARE → já conhece prop firms, já comprou avaliação antes, já estourou 2-3 contas esse ano. Não precisa explicar o que é prop firm.
- Estado emocional: FRUSTRADO + CÉTICO. Acha que toda firma tem pegadinha. Quer relief + prova.
- Linguagem real: "estourei", "quebrei a conta", "tomei MC", "passei o desafio", "tirei payout", "drawdown me comeu", "trailing me ferrou", "tá caro pra caralho", "vale a pena?", "MES/MNQ/MGC/NQ/ES".
- 5 objeções que ele PENSA ao ver a caption (preempte pelo menos 2 dentro do body):
  1. "Mais uma firma que vai fechar e levar meu dinheiro" → atacar com prova social (anos, $ pagos, Trustpilot).
  2. "Deve ter regra escondida tipo consistency ou scaling agressivo" → atacar citando explicitamente regras flexíveis da firma.
  3. "Tô queimado, já gastei muito em avaliação" → atacar com preço-âncora (mostrar que o desconto é real e absurdo).
  4. "Vai pagar mesmo quando eu tirar?" → atacar com tempo de payout específico + $ já pagos.
  5. "É ruim porque é barato" → atacar com prova de volume (X mil reviews, X anos).

# FIRMA (fonte única — ZERO invenção, só use o que está aqui)
- Nome: ${firm.name} (short: ${firm.short_name || firm.name})
- Tipo: ${firm.type || 'Prop firm'}
- ${couponLine}
- Profit split: ${firm.split || '—'}
- Drawdown: ${firm.drawdown || '—'} ${firm.dd_pct ? `(${firm.dd_pct})` : ''}
- Meta: ${firm.target || '—'}
- Escala: ${firm.scaling || '—'}
- Dias mín: ${firm.min_days || '—'} | Avaliação: ${firm.eval_days || 'ilimitado'} dias
- Plataformas: ${platforms}
- Preços: ${prices}
${cheapest ? `- ÂNCORA BAIXA (use esta): ${cheapest.a} por ${cheapest.n}${cheapest.o ? ` (era ${cheapest.o})` : ''}` : ''}
${priciest && priciest !== cheapest ? `- DECOY ALTO (menciona pra tornar a âncora baixa trivial): ${priciest.a} custa ${priciest.n}` : ''}
- Perks: ${perks}
- Prova social: ${tp}
- Descrição: ${firm.description || ''}

# FRAMEWORK PSICOLÓGICO (aplique em cada bloco — cada bloco tem 1 JOB psicológico)

## HOOK (linhas 1-2) — JOB: parar scroll via pattern interrupt
Regras duras:
- Precisa CABER em 125 caracteres (IG corta com "... mais" depois disso — toda persuasão precisa estar ANTES).
- Sem emoji. Sem exclamação. Sem "Quer X?". Sem caixa alta em palavra isolada.
- Use UM destes mecanismos (escolha o MAIS FORTE pros dados):
  a) **Perda nomeada** (loss aversion + specificity): "Estourei 3 contas em 30 dias. Então achei essa."
  b) **Número chocante** (anchoring low): "Conta de $25K. Dezenove dólares. Sem pegadinha."
  c) **Inimigo externo** (contrast + unity): "Enquanto FTMO cobra €155, aqui são $19."
  d) **Pergunta específica** (consistency + self-relevance): "Quantos dias você levou pra passar seu último desafio? Aqui passa em 1."
  e) **Callout raw** (mimetic desire + status): "Trader que tá cansado de firma fraca: lê isso."
- Linha 2 (opcional, curta) = PIVOT curto conectando dor → possibilidade. Ex: "Aí achei essa." / "Então parei de pagar caro." / "Essa aqui é diferente." NUNCA "e se você tivesse X contas" (frame abstrato que não conecta).
- HOOK-PERGUNTA ESTÁ BANIDO. "Estourou 3 contas esse ano?" / "Cansado de X?" / "Quer Y?" / "Já aconteceu Z com você?" = REJEITADO. Use AFIRMAÇÃO específica, não pergunta retórica.

## BODY (4-5 bullets com "→ ") — JOB: preempção de objeção + Hormozi value eq
Cada bullet = UM fato concreto com NÚMERO REAL da firma. Zero adjetivo vago. Zero invenção.
Ordem obrigatória (use EXATAMENTE esses 4 bullets, nessa ordem):
1. **Split + scaling** (só o que a firma REALMENTE oferece — não invente "escala livre"): "→ ${firm.split || 'X%'} dos lucros${firm.scaling && firm.scaling !== '—' ? ` — escala até ${firm.scaling}` : ''}"
2. **Drawdown específico** (OBRIGATÓRIO — nunca pule esse bullet): "→ ${firm.drawdown || 'DD'} de ${firm.dd_pct || 'X%'}" + frase curta de benefício se for trailing favorável ou static ("perdoa swing" / "previsível").
3. **Regra-relief** (ataca objeção "regra escondida"): cite UMA regra REAL flexível da firma (sem limite diário, sem consistency, news trading permitido, day 1 payout). Se não tem regra-relief clara nos dados, pule e use plataforma.
4. **Payout + prova de pagamento** (ataca objeção "vão pagar?"): "→ payout em ${firm.min_days ? 'X' : '5'} dias" + (opcional) marco ($ pagos / anos / reviews).
PROIBIDO inventar regra que a firma não tem. Se o dado não está na FIRMA acima, não escreve.
Linguagem de trader ("passa o desafio", "tira payout", "MC me pegou"), NUNCA advertorial ("aprove sua avaliação", "realize saques").
OBRIGATÓRIO: preempte PELO MENOS 2 das 5 objeções listadas em AUDIÊNCIA — marque mentalmente quais você atacou antes de entregar.

## PROVA SOCIAL (1 linha separada) — JOB: matar objeção "vai fechar/não paga"
Formato: "Trustpilot ${firm.trustpilot_score || 'X'} com ${firm.trustpilot_reviews ? Math.round(firm.trustpilot_reviews / 1000) + ' mil' : 'X mil'} reviews."
NÚMEROS GRANDES SEMPRE em formato leitura-rápida: "18 mil" não "18382". "41K" ou "41 mil" não "41523".
Exemplo: "Trustpilot 4.4 com 18 mil reviews. Não é firma de ontem."
Se não tiver dado forte, pula essa linha.

## PREÇO-PUNCH (1-2 linhas) — JOB: anchoring + decoy + bundling narrativo
Estrutura exata:
- Linha 1: âncora clara. Formato: "${cheapest ? `${cheapest.a} por ${cheapest.n}${cheapest.o ? ` (antes ${cheapest.o}).` : '.'}` : '$X por $Y.'}"
- Linha 2 (opcional, SE tiver decoy): "${priciest && priciest !== cheapest ? `A de ${priciest.a} fica em ${priciest.n}. Começa pela menor.` : ''}"
Anchoring funciona quando o "era" aparece ANTES (visão natural) ou logo depois em parentêses. Não use seta "→" aqui.

## CUPOM + URGÊNCIA (1-2 linhas) — JOB: scarcity real (nunca inventada) + commitment
- Se tem cupom: "Cupom ${firm.coupon || 'X'}. ${firm.discount_type === 'lifetime' ? 'Pra sempre — sem renovar.' : `${firm.discount}% OFF enquanto tá ativo.`}"
- Se é lifetime: use ISSO como gatilho — "Pra sempre" é raro em prop firm, foca nisso.
- Se não tem cupom: "Desconto aplicado automático no link. Sem código."
- NUNCA invente urgência falsa ("últimas horas!"). Use só o que é REAL.

## CTA (1 linha) — JOB: autonomy-preserving (não empurrar, convidar)
"Link na bio." / "Link in bio." / "Enlace en bio."
+ UM emoji forte (🔥 ⚡ ✅ 💰) — escolha o que combina com a firma.
Nunca "CORRE!" ou "NÃO PERCA!" — reduz autonomy, gera reatância.

## HASHTAGS (1 linha, 10-12 tags, todas em lowercase, separadas por espaço)
USE APENAS desta whitelist curada (NÃO invente, NÃO use #nfl/#sports/#lifestyle/#motivation/#success — banidas pra trading):
${suggestedHashtags}

Monte a linha combinando: firma-slug + 4-5 core + 5-6 do nicho (${(firm.type && /forex/i.test(firm.type)) ? 'forex' : 'futures'}).

# EXEMPLOS DE REFERÊNCIA (clone a estrutura, troque dados)
${fewShot}

# OTIMIZAÇÃO PRA ALGORITMO IG 2026
- Primeiros 125 caracteres são o que aparece no feed antes do "... mais". TODO o peso persuasivo do hook tem que caber ali.
- Line breaks agressivos (linha em branco entre cada bloco) aumentam tempo de leitura → sinal positivo pro algoritmo.
- Bullets com "→" aumentam legibilidade e save-rate.
- Números concretos e decisão-em-1-click aumentam save+share.

# REGRAS DURAS (viole qualquer uma = rejeitado)
✅ Use: números específicos da firma, linguagem de trader real ("estourei", "passa em X dias"), bullets com "→", linha em branco entre blocos, MÁX 2 emojis em toda caption, âncora de preço explícita, preempção de 2+ objeções.
❌ Nunca:
  - Hook genérico "Quer X?" ou "Cansado de Y?"
  - Palavras vazias: "incrível", "excelente", "top do mercado", "oportunidade única", "realize seus sonhos", "transforme", "eleve", "chegou a hora"
  - Verbos MAL COLOCADOS com contas de trading. Em PT-BR diz-se: "ter X contas", "operar X contas", "rodar X contas", "gerenciar X contas". NUNCA "tocar contas" (soa como tocar gado/boi), NUNCA "puxar contas", NUNCA "bater X contas".
  - Exclamações (remove todos os "!")
  - Markdown (**negrito**, *itálico*)
  - Aspas envolvendo a caption
  - Preâmbulo ("Aqui está:", "Segue a caption:")
  - Emojis no hook
  - Caixa alta em palavra isolada ("TUDO", "AGORA")
  - Hashtags alucinadas tipo #nfl, #sports, #lifestyle, #motivation, #luxury, #success, #entrepreneur
  - Palavras BANIDAS POR COMPLIANCE (RISCO LEGAL): "sinais", "entrada", "stop loss", "take profit", "recomendação de trade", "operação ao vivo", "lucro garantido", "trader profissional", "signals", "entry signals", "guaranteed profit", "copy trade", "we trade for you"
  - Prometer retornos/lucro ("você vai lucrar", "resultados garantidos")
  - Mencionar IA/Gemini/Claude/API

# IDIOMA
100% em ${langName}. Se PT: PT-BR com gírias leves de trader BR ("tá", "pra", "caralho"=evitar). Se EN: US English direto. Se ES: es-LA neutro.

# OUTPUT FINAL
APENAS a caption. Texto puro pronto pra Ctrl+V no Instagram. Sem explicação, sem preâmbulo, sem markdown, sem aspas.`;
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
