// Vercel Serverless — Gera copy Instagram pra firma via Gemini 2.5 Flash
// POST /api/gen-firm-copy { firmId, lang? }
// Uso: admin Criativos tab

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

const LANG_NAMES = { pt: 'Portuguese (Brazil)', en: 'English', es: 'Spanish' };

// Normaliza valores bagunçados do Supabase antes de jogar no prompt
function normalizeScaling(s) {
  if (!s) return null;
  const raw = String(s).trim();
  if (/^(sim|yes|true)$/i.test(raw)) return 'disponível (sem teto fixo publicado)';
  if (/^(não|nao|no|false|—|-)$/i.test(raw)) return null;
  return raw;
}
// Formata número de reviews pra leitura rápida: 18382 → "18 mil", 1516 → "1,5 mil"
function fmtReviews(n, langCode) {
  const num = parseInt(n, 10);
  if (!num || num < 1) return null;
  if (num < 1000) return String(num);
  if (langCode === 'pt' || langCode === 'es') {
    if (num < 10000) return (num / 1000).toFixed(1).replace('.', ',') + ' mil';
    return Math.round(num / 1000) + ' mil';
  }
  if (num < 10000) return (num / 1000).toFixed(1) + 'K';
  return Math.round(num / 1000) + 'K';
}

function buildPrompt(firm, langName) {
  const langCodeEarly = langName.includes('Portuguese') ? 'pt' : langName.includes('Spanish') ? 'es' : 'en';
  const prices = Array.isArray(firm.prices) ? firm.prices.slice(0, 4).map(p => `${p.a}: ${p.n}${p.o ? ` (era ${p.o})` : ''}`).join(' | ') : '';
  const perks = Array.isArray(firm.perks) ? firm.perks.slice(0, 6).join(', ') : '';
  const platforms = Array.isArray(firm.platforms) ? firm.platforms.join(', ') : '';
  const scalingNorm = normalizeScaling(firm.scaling);
  const reviewsFmt = fmtReviews(firm.trustpilot_reviews, langCodeEarly);
  const tp = firm.trustpilot_score ? `Trustpilot ${firm.trustpilot_score}/5 com ${reviewsFmt || firm.trustpilot_reviews || '?'} reviews` : '';
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

  const langCode = langCodeEarly;

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

  // Few-shot — TEMPLATE PROMO COMERCIAL: features + desconto + cupom + CTA. Sem dor, sem storytelling. Compliance Meta Ads.
  const FEW_SHOT_PT = `
EXEMPLO BOM 1 (Apex, cupom MARKET, 90% OFF lifetime):
🚨 APEX 90% OFF AVALIAÇÕES + RESETS POR $50 🚨

🔥 Descontos pesados em todas as avaliações
Escolha seu plano e comece hoje:

🎟 Descontos do cupom
* 90% OFF na primeira mensalidade
* 50% OFF nas mensalidades recorrentes

💰 Planos com desconto
* 25K · 50K · 100K: a partir de $19.90
* 150K: $59.90

⚡ Benefícios exclusivos
* Resets por apenas $50
* Aprovação em 1 dia
* Sem regra de consistência na avaliação
* 100% dos lucros, escala disponível
* Trailing/EOD de -5% (perdoa swing)
* Sem limite diário, news trading permitido, payout no Day-1
* Trustpilot 4.4 com 18K reviews

Use o cupom: MARKET

🚀 Aproveite o desconto e pague menos pelos planos maiores
💥 Cupom lifetime — sem renovar

Link na bio.

#apex #propfirm #propfirmtrading #trader #trading #daytrading #futurestrading #futurestrader #es #nq #mes #mnq

---

EXEMPLO BOM 2 (Bulenox, cupom MARKET89, 89% OFF):
🚨 BULENOX 89% OFF + STATIC DD PREVISÍVEL 🚨

🔥 Avaliação enxuta com regras claras
Escolha seu plano e comece hoje:

🎟 Desconto do cupom
* 89% OFF lifetime nas mensalidades

💰 Planos com desconto
* 25K: $19.25 (era $175)
* 50K · 100K: a partir de $24.50
* 250K: $34.10 (era $310)

⚡ Benefícios exclusivos
* Static DD previsível (sem trailing que ferra)
* Sem regra de consistência
* 90% de split (100% nos primeiros $10K)
* Rithmic incluído por 14 dias
* Payout semanal, escala até $400K
* Trustpilot 4.5 com 1,5K reviews

Use o cupom: MARKET89

🚀 Aproveite o desconto e pague menos pelos planos maiores
💥 Cupom lifetime — sem renovar

Link na bio.

#bulenox #propfirm #propfirmtrading #trader #trading #daytrading #futurestrading #es #nq #mes #mnq #tradovate

---

EXEMPLO BOM 3 (FTMO, sem cupom, desconto via link):
🚨 FTMO COM DESCONTO EXCLUSIVO NO LINK 🚨

🔥 Forex sério, payout em 5 dias
Escolha seu desafio e comece hoje:

💰 Planos com desconto
* 10K: €79 (sem o link: €115)
* 25K: €155 (sem o link: €250)
* 100K · 200K: a partir de €399

⚡ Benefícios exclusivos
* 90% de split depois do funding
* Static DD -10% (sem trailing)
* Plataformas MT4, MT5 e cTrader
* Mais de €500M pagos desde 2015
* Trustpilot 4.8 com 41K reviews

Sem cupom — desconto aplicado automático no link

🚀 Aproveite o desconto e escolha seu desafio
💥 Oferta exclusiva via Markets Coupons

Link na bio.

#ftmo #propfirm #propfirmtrading #forex #trader #trading #forextrading #mt5 #ctrader #eurusd #gbpusd #xauusd

---

EXEMPLO RUIM (NÃO FAÇA ISSO):
Estourou 3 contas esse ano? 😩

Essa aqui é diferente.
Você vai lucrar muito! 🔥
Realize seus sonhos no trading.
Cupom MARKET — pegue agora!

POR QUE É RUIM: storytelling de dor ("estourou 3 contas") não é promo comercial. "Você vai lucrar" promete retorno (BANIDO Meta Ads). "Realize seus sonhos" = vazio. "Pegue agora!" = exclamação + urgência forçada. Falta features secas + preços + cupom estruturado.`;

  const FEW_SHOT_EN = `
GOOD EXAMPLE 1 (Apex, MARKET, 90% OFF lifetime):
🚨 APEX 90% OFF EVALS + $50 RESETS 🚨

🔥 Massive discounts on every evaluation
Pick your plan and start today:

🎟 Coupon discounts
* 90% OFF first month
* 50% OFF recurring fees

💰 Discounted plans
* 25K · 50K · 100K: starting at $19.90
* 150K: $59.90

⚡ Exclusive benefits
* Resets for only $50
* One Day To Pass
* No consistency rule on evaluations
* Keep 100% of profits, scaling available
* Trailing/EOD -5% (forgives swings)
* No daily loss limit, news trading allowed, Day-1 payout
* Trustpilot 4.4 with 18K reviews

Use the coupon: MARKET

🚀 Lock in the discount and scale to bigger plans
💥 Lifetime coupon — no renewal

Link in bio.

#apex #propfirm #propfirmtrading #trader #trading #daytrading #futurestrading #futurestrader #es #nq #mes #mnq

---

GOOD EXAMPLE 2 (Bulenox, MARKET89, 89% OFF):
🚨 BULENOX 89% OFF + PREDICTABLE STATIC DD 🚨

🔥 Clean evaluation with clear rules
Pick your plan and start today:

🎟 Coupon discount
* 89% OFF lifetime on monthly fees

💰 Discounted plans
* 25K: $19.25 (was $175)
* 50K · 100K: starting at $24.50
* 250K: $34.10 (was $310)

⚡ Exclusive benefits
* Predictable static DD (no trailing trap)
* No consistency rule
* 90% split (100% on first $10K)
* Rithmic included for 14 days
* Weekly payout, scale up to $400K
* Trustpilot 4.5 with 1.5K reviews

Use the coupon: MARKET89

🚀 Lock in the discount and scale to bigger plans
💥 Lifetime coupon — no renewal

Link in bio.

#bulenox #propfirm #propfirmtrading #trader #trading #daytrading #futurestrading #es #nq #mes #mnq #tradovate

---

GOOD EXAMPLE 3 (FTMO, no coupon, link discount):
🚨 FTMO WITH EXCLUSIVE DISCOUNT VIA LINK 🚨

🔥 Serious forex, payout in 5 days
Pick your challenge and start today:

💰 Discounted plans
* 10K: €79 (without the link: €115)
* 25K: €155 (without the link: €250)
* 100K · 200K: starting at €399

⚡ Exclusive benefits
* 90% split after funding
* Static -10% DD (no trailing)
* MT4, MT5 and cTrader supported
* Over €500M paid since 2015
* Trustpilot 4.8 with 41K reviews

No coupon — discount auto-applied via link

🚀 Lock in the discount and pick your challenge
💥 Exclusive offer via Markets Coupons

Link in bio.

#ftmo #propfirm #propfirmtrading #forex #trader #trading #forextrading #mt5 #ctrader #eurusd #gbpusd #xauusd

---

BAD EXAMPLE (DON'T DO THIS):
Blew 3 accounts this year? 😩

This one is different.
You'll profit big time! 🔥
Make your dreams come true.
Use MARKET — grab it now!

WHY BAD: pain storytelling ("blew 3 accounts") is not a commercial promo. "You'll profit" promises returns (Meta Ads BAN). "Make your dreams come true" = empty fluff. "Grab it now!" = forced urgency + exclamation. Missing dry features + price tiers + structured coupon block.`;

  const fewShot = langCode === 'pt' ? FEW_SHOT_PT : FEW_SHOT_EN;

  return `# PAPEL
Copywriter de promo comercial para Instagram, nicho de prop trading. Estilo: anúncio de oferta direto, foco em FEATURES + DESCONTO + CUPOM. NÃO escreve storytelling, NÃO escreve dor, NÃO faz pergunta-callout. Escreve promo que parece anúncio oficial da firma com benefícios listados.

# CONTEXTO
Markets Coupons = afiliada de prop firms. Caption vai pro Instagram (orgânico) e potencialmente Meta Ads (paid). DEVE seguir compliance Meta Ads: zero promessa de retorno/lucro, zero "fique rico", zero "ganhe dinheiro com trading". Apenas features, preços, cupom, CTA neutro.

# OBJETIVO DA CAPTION
Listar BENEFÍCIOS REAIS da firma + DESCONTO em vigor (cupom + preços com âncora) de forma que o trader veja valor concreto e clique no link da bio. Estilo: promo direta, não advertorial.

# COMPLIANCE META ADS (CRÍTICO — viole = caption rejeitada)
- ZERO promessa de retorno: "você vai lucrar", "fique rico", "renda garantida", "results guaranteed", "make money fast", "you'll profit"
- ZERO storytelling de dor: "estourou X contas?", "cansado de Y?", "quebrei minha conta" — proibido
- ZERO antes/depois de capital ou resultado financeiro
- ZERO urgência fake ("últimas horas!", "só hoje!") a não ser que seja REAL e datada
- ZERO superlativos vazios sobre lifestyle ("transforme sua vida", "realize seus sonhos")
- OK: features técnicas (DD, split, payout days, plataformas), preços com desconto, cupom, "scale to bigger plans" (sem prometer dinheiro), Trustpilot, número de reviews

# FIRMA (fonte única — ZERO invenção, só use o que está aqui)
- Nome: ${firm.name} (short: ${firm.short_name || firm.name})
- Tipo: ${firm.type || 'Prop firm'}
- ${couponLine}
- Profit split: ${firm.split || '—'}
- Drawdown: ${firm.drawdown || '—'} ${firm.dd_pct ? `(${firm.dd_pct})` : ''}
- Meta: ${firm.target || '—'}
- Escala: ${scalingNorm || 'não informado publicamente'}
- Dias mín: ${firm.min_days || '—'} | Avaliação: ${firm.eval_days || 'ilimitado'} dias
- Plataformas: ${platforms}
- Preços: ${prices}
${cheapest ? `- ÂNCORA BAIXA (use esta): ${cheapest.a} por ${cheapest.n}${cheapest.o ? ` (era ${cheapest.o})` : ''}` : ''}
${priciest && priciest !== cheapest ? `- DECOY ALTO (menciona pra tornar a âncora baixa trivial): ${priciest.a} custa ${priciest.n}` : ''}
- Perks DISPONÍVEIS (só cite o que tá aqui): ${perks}
- Prova social: ${tp}
- News trading permitido: ${firm.news_trading === true ? 'SIM' : firm.news_trading === false ? 'NÃO' : 'não informado — NÃO mencione'}
- Day-1 payout: ${firm.day1_payout === true ? 'SIM' : firm.day1_payout === false ? 'NÃO' : 'não informado — NÃO mencione'}
- Descrição: ${firm.description || ''}

# ❌ ZERO INVENÇÃO — regra sagrada
Cada número, regra, perk e benefício na caption TEM que existir nos dados acima. Se não tá listado, NÃO EXISTE. Não infere ("provavelmente tem"), não deduz ("firma grande deve ter"), não copia de outra firma do few-shot.
Exemplos proibidos de invenção:
  - Dizer "sem limite diário" se news_trading/perks não citam explicitamente.
  - Dizer "payout em 5 dias" se min_days não é 5.
  - Explicar mecanismo técnico do DD ("ajusta no fechamento", "congela depois de $X") a não ser que apareça EXATO nos dados.
  - Citar "mais de $X pagos" se não tá na descrição/perks.
Se você não tem o dado, ESCOLHE OUTRO BULLET dos disponíveis. Não inventa pra preencher.

# 🔁 CADA DADO APARECE 1× SÓ
Scaling, split, DD, payout, escala-até — cada um pode aparecer UMA VEZ na caption inteira. Se escala até $X já apareceu no bullet 1, NÃO repete no 4. Duplicação = rejeitado.

# 🪞 COERÊNCIA NARRATIVA
A firma sendo vendida nesta caption é **${firm.name}**. Se o hook usa mecanismo "saí de X pra cá", X PRECISA ser outra firma (genérica "firma antiga" / "outra firma" se não quiser nomear). NUNCA "Estourei na ${firm.name}. Aí achei a ${firm.name}" — destrói credibilidade.

# ESTRUTURA OBRIGATÓRIA DA CAPTION (siga ordem exata, igual aos exemplos few-shot)

## BLOCO 1 — HEADLINE (linha 1, dentro de 🚨 emojis)
Formato exato: 🚨 [NOME DA FIRMA EM CAIXA] [DESC]% OFF [PRODUTO + 1 perk extra se relevante] 🚨
Exemplos:
- "🚨 APEX 90% OFF AVALIAÇÕES + RESETS POR $50 🚨"
- "🚨 BULENOX 89% OFF + STATIC DD PREVISÍVEL 🚨"
- "🚨 FTMO COM DESCONTO EXCLUSIVO NO LINK 🚨"
Caixa alta SOMENTE no nome da firma e nos números. Não escreva tudo em CAPS LOCK.

## BLOCO 2 — TAGLINE (linha começando com 🔥, depois 1 linha "Escolha seu plano e comece hoje:")
Formato:
🔥 [tagline curta de benefício principal — 4-7 palavras, sem promessa de lucro]
Escolha seu plano e comece hoje:

## BLOCO 3 — DESCONTOS DO CUPOM (🎟, opcional — só se a firma tem cupom)
🎟 Descontos do cupom
* [desconto na primeira mensalidade ou lifetime, baseado nos dados]
* [desconto recorrente se aplicável]

## BLOCO 4 — PLANOS COM DESCONTO (💰, OBRIGATÓRIO)
💰 Planos com desconto
* [tier menor]: [preço novo] (era [preço velho]) — usa âncora "era X" se houver
* [tier médio]: a partir de [preço]
* [tier maior]: [preço]
USE OS PREÇOS REAIS da firma (cheapest = ${cheapest ? `${cheapest.a}: ${cheapest.n}${cheapest.o ? ` era ${cheapest.o}` : ''}` : '—'}, priciest = ${priciest ? `${priciest.a}: ${priciest.n}` : '—'})

## BLOCO 5 — BENEFÍCIOS EXCLUSIVOS (⚡, OBRIGATÓRIO — 5 a 8 bullets)
⚡ Benefícios exclusivos
* [drawdown + tipo: "Trailing/EOD -5%", "Static DD previsível", etc — usar dado real]
* [profit split — "100% dos lucros", "90% de split", etc]
* [scaling se houver — "escala até $X", "sem teto"]
* [regras-relief reais — "sem limite diário", "news trading permitido", "Day-1 payout", "sem regra de consistência"]
* [plataformas — "Rithmic incluído", "MT4/MT5/cTrader"]
* [payout — "payout em X dias", "payout semanal"]
* [Trustpilot se houver — "Trustpilot ${firm.trustpilot_score || 'X'} com ${reviewsFmt || 'X'} reviews"]
* [provas históricas se houver — "$X pagos desde Y", "anos no mercado"]
SÓ inclua bullets com DADOS REAIS da firma (seção FIRMA acima). Sem invenção.

## BLOCO 6 — CUPOM (linha solta, formato exato)
Se tem cupom: "Use o cupom: ${firm.coupon || 'X'}"
Se sem cupom: "Sem cupom — desconto aplicado automático no link"

## BLOCO 7 — CTA FINAL (2 linhas com 🚀 e 💥)
🚀 [convite genérico sem promessa de lucro — ex: "Aproveite o desconto e pague menos pelos planos maiores", "Lock in the discount and scale to bigger plans"]
💥 [info de permanência/exclusividade — "Cupom lifetime — sem renovar", "Oferta exclusiva via Markets Coupons"]

## BLOCO 8 — LINK NA BIO (1 linha)
"Link na bio." (PT) / "Link in bio." (EN) / "Enlace en bio." (ES)
SEM emoji aqui (já tem emojis suficientes nos blocos anteriores).

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
✅ Use: estrutura de 8 blocos exata (Headline → Tagline → Cupom → Planos → Benefícios → Cupom → CTA → Link), emojis nos cabeçalhos de bloco (🚨 🔥 🎟 💰 ⚡ 🚀 💥), bullets com asterisco (*), preços reais com "era X" (anchoring), Trustpilot dentro do bloco de benefícios.

❌ Nunca:
  - **Storytelling de dor:** "estourou X contas?", "cansado de Y?", "quebrei minha conta", "MC me pegou", "tomei stop", "tô queimado". Promo comercial NÃO tem dor.
  - **Pergunta-callout no início:** "Quer X?", "Já passou por Y?", "Cansado de Z?" — REJEITADO.
  - **Bullets com seta "→"**: usa asterisco (*) em vez de seta. Padrão promo, não Twitter.
  - **Promessa de retorno** (Meta Ads BAN): "você vai lucrar", "ganhe X", "fique rico", "renda passiva", "results guaranteed", "you'll profit", "make money fast"
  - **Lifestyle vazio**: "transforme sua vida", "realize seus sonhos", "eleve seu jogo", "chegou a hora"
  - **Adjetivos vazios**: "incrível", "excelente", "top do mercado", "oportunidade única"
  - **Verbos errados com conta**: NUNCA "tocar contas" (soa como gado), "puxar contas", "bater contas". Use "ter conta", "operar conta", "rodar conta", "comprar avaliação", "passar avaliação".
  - **Exclamações no corpo** (só nos blocos de headline com 🚨 e CTA com 🚀💥, e olhe lá — o exemplo aprovado tem zero "!" no corpo)
  - **Markdown** (**negrito**, *itálico*)
  - **Aspas envolvendo a caption inteira**
  - **Preâmbulo** ("Aqui está:", "Segue a caption:")
  - **Caixa alta em palavra isolada** ("TUDO", "AGORA") — só permitido no nome da firma no Headline
  - **Hashtags banidas pra trading**: #nfl, #sports, #lifestyle, #motivation, #luxury, #success, #entrepreneur, #wealth
  - **Palavras BANIDAS POR COMPLIANCE LEGAL**: "sinais", "entrada", "stop loss", "take profit", "recomendação de trade", "operação ao vivo", "lucro garantido", "trader profissional", "signals", "entry signals", "guaranteed profit", "copy trade", "we trade for you"
  - **Mencionar IA/Gemini/Claude/API**

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

  const delays = [800, 1500, 2500];
  const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
  const maxAttempts = KEYS.length * MODELS.length;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const keyIdx = (startIdx + attempt) % KEYS.length;
    const modelIdx = Math.floor(attempt / KEYS.length) % MODELS.length;
    const model = MODELS[modelIdx];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEYS[keyIdx]}`;
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      const data = await resp.json();
      if (!resp.ok) {
        const errDetail = JSON.stringify(data).slice(0, 400);
        console.error(`[gen-firm-copy] ${model} key${keyIdx} →`, resp.status, errDetail);
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
