// Vercel Serverless, Gera copy Instagram pra firma via Gemini 2.5 Flash
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

function buildPrompt(firm, langName, template = 'institucional') {
  const langCodeEarly = langName.includes('Portuguese') ? 'pt' : langName.includes('Spanish') ? 'es' : 'en';
  const prices = Array.isArray(firm.prices) ? firm.prices.slice(0, 4).map(p => `${p.a}: ${p.n}${p.o ? ` (era ${p.o})` : ''}`).join(' | ') : '';
  const perks = Array.isArray(firm.perks) ? firm.perks.slice(0, 6).join(', ') : '';
  const platforms = Array.isArray(firm.platforms) ? firm.platforms.join(', ') : '';
  const scalingNorm = normalizeScaling(firm.scaling);
  const reviewsFmt = fmtReviews(firm.trustpilot_reviews, langCodeEarly);
  const tp = firm.trustpilot_score ? `Trustpilot ${firm.trustpilot_score}/5 com ${reviewsFmt || firm.trustpilot_reviews || '?'} reviews` : '';
  const couponLine = firm.coupon ? `CUPOM: ${firm.coupon}, ${firm.discount}% OFF${firm.discount_type ? ` (${firm.discount_type})` : ''}` : (firm.discount ? `${firm.discount}% OFF aplicado automático via link (sem cupom)` : '');

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

  // ====== TEMPLATE INSTITUCIONAL ======
  // Tom corporativo sério, sem emojis no header, foco em capital + infraestrutura + condições.
  const FEW_SHOT_INSTITUCIONAL_PT = `
EXEMPLO INSTITUCIONAL 1 (Apex):
Opere com o Capital da APEX: Avaliações de Futuros com Condições Especiais

Você tem a estratégia, nós temos o capital. A APEX Trader Funding oferece a infraestrutura que você precisa para escalar suas operações no mercado de futuros sem arriscar seu patrimônio pessoal.

Aproveite nossas condições atuais para iniciar sua avaliação:
✅ Planos a partir de $19.90 (Taxa de avaliação).
✅ Regras flexíveis e Drawdown ajustado (EOD disponível).
✅ Opere nas principais plataformas: NinjaTrader, Tradovate e Rithmic.

Junte-se a uma comunidade com mais de 18 mil avaliações positivas no Trustpilot (Nota 4.4/5).

Use o cupom: MARKET

Garanta sua vaga e comece a operar com escala.

#apex #propfirm #propfirmtrading #trader #trading #daytrading #futurestrading #futurestrader #es #nq #mes #mnq

---

EXEMPLO INSTITUCIONAL 2 (Bulenox):
Opere com o Capital da Bulenox: Avaliações de Futuros com Drawdown Estático

Você tem a estratégia, nós temos o capital. A Bulenox oferece avaliações com regras claras e drawdown estático previsível, ideal para traders que buscam consistência operacional.

Aproveite as condições atuais para iniciar sua avaliação:
✅ Planos a partir de $19.25 (taxa de avaliação).
✅ Drawdown estático sem trailing, limites previsíveis.
✅ Plataformas: Tradovate, NinjaTrader e Rithmic incluído.
✅ Sem regra de consistência e payout semanal.

Junte-se a uma comunidade com mais de 1.500 avaliações no Trustpilot (nota 4.5/5).

Use o cupom: MARKET89

Garanta sua vaga e comece a operar com escala.

#bulenox #propfirm #propfirmtrading #trader #trading #daytrading #futurestrading #es #nq #mes #mnq #tradovate

---

EXEMPLO INSTITUCIONAL 3 (FTMO, sem cupom, desconto via link):
Opere com o Capital da FTMO: Avaliações de Forex com Histórico Comprovado

Você tem a estratégia, nós temos o capital. A FTMO é uma das maiores empresas de prop trading de forex do mercado, com mais de €500 milhões pagos a traders desde 2015.

Aproveite as condições atuais via nosso link:
✅ Desafios a partir de €79 (10K), desconto aplicado automático.
✅ Drawdown estático -10%, sem trailing.
✅ Plataformas: MT4, MT5 e cTrader nativos.
✅ Profit split de 90% após o funding.

Junte-se a uma comunidade com mais de 41 mil avaliações no Trustpilot (nota 4.8/5).

Sem cupom, desconto aplicado automático no link.

Garanta sua vaga e comece a operar com escala.

#ftmo #propfirm #propfirmtrading #forex #trader #trading #forextrading #mt5 #ctrader #eurusd #gbpusd #xauusd
`;

  // ====== TEMPLATE PROMOCIONAL ======
  // Tom mais energético, header com 🚀, hook em pergunta retórica corporativa (não dor), foco em escala e desconto.
  const FEW_SHOT_PROMOCIONAL_PT = `
EXEMPLO PROMOCIONAL 1 (Apex):
🚀 Escala de Capital para Traders de Futuros: 90% OFF na APEX

Trader, por que limitar seus ganhos ao tamanho do seu capital pessoal?

A APEX Trader Funding está liberando um desconto exclusivo de 90% para novas avaliações de futuros. É a sua chance de acessar contas de 25K a 150K com o menor custo do mercado.

O que diferencia a APEX:
🔹 Payouts ágeis e regras simplificadas.
🔹 Sem limite de perda diária.
🔹 News trading permitido.
🔹 Divisão de lucros competitiva para o trader.

Milhares de traders já escalaram suas operações conosco.

Confira nossos reviews no Trustpilot e veja por que somos referência global.

Insira o cupom: MARKET

Clique no link e escolha seu plano.

#apex #propfirm #propfirmtrading #trader #trading #daytrading #futurestrading #futurestrader #es #nq #mes #mnq

---

EXEMPLO PROMOCIONAL 2 (Bulenox):
🚀 Escala de Capital para Traders de Futuros: 89% OFF na Bulenox

Trader, por que limitar suas operações ao tamanho do seu capital pessoal?

A Bulenox está com desconto exclusivo de 89% lifetime para novas avaliações. É a oportunidade de acessar contas de 25K a 250K com regras claras e drawdown estático previsível.

O que diferencia a Bulenox:
🔹 Drawdown estático sem trailing.
🔹 Sem regra de consistência.
🔹 Payout semanal e escala até $400K.
🔹 Profit split 90% (100% nos primeiros $10K).
🔹 Rithmic incluído por 14 dias.

Milhares de traders já passaram nas avaliações conosco.

Confira nossos reviews no Trustpilot (4.5/5 com 1.500 avaliações) e veja por que somos referência.

Insira o cupom: MARKET89

Clique no link e escolha seu plano.

#bulenox #propfirm #propfirmtrading #trader #trading #daytrading #futurestrading #es #nq #mes #mnq #tradovate

---

EXEMPLO PROMOCIONAL 3 (FTMO, sem cupom):
🚀 Escala de Capital para Traders de Forex: Desconto Exclusivo na FTMO

Trader, por que limitar suas operações ao tamanho do seu capital pessoal?

A FTMO está com desconto exclusivo aplicado automático via nosso link para novas avaliações de forex. É a oportunidade de acessar contas de 10K a 200K com a maior empresa de prop trading do mercado.

O que diferencia a FTMO:
🔹 Mais de €500M pagos desde 2015.
🔹 Drawdown estático -10% (sem trailing).
🔹 MT4, MT5 e cTrader nativos.
🔹 Profit split de 90% após o funding.
🔹 Payout em 5 dias.

Milhares de traders já passaram nas avaliações conosco.

Confira nossos reviews no Trustpilot (4.8/5 com 41 mil avaliações) e veja por que somos referência.

Sem cupom, desconto aplicado automático no link.

Clique no link e escolha seu plano.

#ftmo #propfirm #propfirmtrading #forex #trader #trading #forextrading #mt5 #ctrader #eurusd #gbpusd #xauusd
`;

  const FEW_SHOT_PT = template === 'promocional' ? FEW_SHOT_PROMOCIONAL_PT : FEW_SHOT_INSTITUCIONAL_PT;

  // ====== TEMPLATE INSTITUCIONAL, EN ======
  const FEW_SHOT_INSTITUCIONAL_EN = `
INSTITUTIONAL EXAMPLE 1 (Apex):
Trade with APEX Capital: Futures Evaluations with Special Conditions

You bring the strategy, we provide the capital. APEX Trader Funding offers the infrastructure you need to scale your futures operations without risking your personal capital.

Take advantage of our current conditions to start your evaluation:
✅ Plans starting at $19.90 (evaluation fee).
✅ Flexible rules and adjusted drawdown (EOD available).
✅ Trade on top platforms: NinjaTrader, Tradovate and Rithmic.

Join a community with over 18,000 positive Trustpilot reviews (rating 4.4/5).

Use the coupon: MARKET

Secure your spot and start trading with scale.

#apex #propfirm #propfirmtrading #trader #trading #daytrading #futurestrading #futurestrader #es #nq #mes #mnq

---

INSTITUTIONAL EXAMPLE 2 (Bulenox):
Trade with Bulenox Capital: Futures Evaluations with Static Drawdown

You bring the strategy, we provide the capital. Bulenox offers evaluations with clear rules and predictable static drawdown, ideal for traders seeking operational consistency.

Take advantage of our current conditions to start your evaluation:
✅ Plans starting at $19.25 (evaluation fee).
✅ Static drawdown without trailing, predictable limits.
✅ Platforms: Tradovate, NinjaTrader and Rithmic included.
✅ No consistency rule and weekly payout.

Join a community with over 1,500 Trustpilot reviews (rating 4.5/5).

Use the coupon: MARKET89

Secure your spot and start trading with scale.

#bulenox #propfirm #propfirmtrading #trader #trading #daytrading #futurestrading #es #nq #mes #mnq #tradovate

---

INSTITUTIONAL EXAMPLE 3 (FTMO, no coupon):
Trade with FTMO Capital: Forex Evaluations with Proven Track Record

You bring the strategy, we provide the capital. FTMO is one of the largest forex prop trading firms, with over €500 million paid to traders since 2015.

Take advantage of our current conditions via our link:
✅ Challenges starting at €79 (10K), discount auto-applied.
✅ Static drawdown -10%, no trailing.
✅ Platforms: MT4, MT5 and cTrader native.
✅ 90% profit split after funding.

Join a community with over 41,000 Trustpilot reviews (rating 4.8/5).

No coupon, discount auto-applied via link.

Secure your spot and start trading with scale.

#ftmo #propfirm #propfirmtrading #forex #trader #trading #forextrading #mt5 #ctrader #eurusd #gbpusd #xauusd
`;

  // ====== TEMPLATE PROMOCIONAL, EN ======
  const FEW_SHOT_PROMOCIONAL_EN = `
PROMOTIONAL EXAMPLE 1 (Apex):
🚀 Capital Scale for Futures Traders: 90% OFF on APEX

Trader, why limit your earnings to the size of your personal capital?

APEX Trader Funding is releasing an exclusive 90% discount on new futures evaluations. It's your chance to access 25K to 150K accounts at the lowest cost on the market.

What sets APEX apart:
🔹 Fast payouts and simplified rules.
🔹 No daily loss limit.
🔹 News trading allowed.
🔹 Competitive profit split for the trader.

Thousands of traders have already scaled their operations with us.

Check our reviews on Trustpilot and see why we're a global reference.

Enter the coupon: MARKET

Click the link below and choose your plan.

#apex #propfirm #propfirmtrading #trader #trading #daytrading #futurestrading #futurestrader #es #nq #mes #mnq

---

PROMOTIONAL EXAMPLE 2 (Bulenox):
🚀 Capital Scale for Futures Traders: 89% OFF on Bulenox

Trader, why limit your earnings to the size of your personal capital?

Bulenox is releasing an exclusive 89% lifetime discount on new evaluations. It's your chance to access 25K to 250K accounts with clear rules and predictable static drawdown.

What sets Bulenox apart:
🔹 Predictable static drawdown without trailing.
🔹 No consistency rule.
🔹 Weekly payout and scale up to $400K.
🔹 90% profit split (100% on the first $10K).
🔹 Rithmic included for 14 days.

Thousands of traders have already scaled their operations with us.

Check our reviews on Trustpilot and see why we're a global reference.

Enter the coupon: MARKET89

Click the link below and choose your plan.

#bulenox #propfirm #propfirmtrading #trader #trading #daytrading #futurestrading #es #nq #mes #mnq #tradovate

---

PROMOTIONAL EXAMPLE 3 (FTMO, no coupon):
🚀 Capital Scale for Forex Traders: Exclusive Discount on FTMO

Trader, why limit your earnings to the size of your personal capital?

FTMO is releasing an exclusive discount auto-applied via our link on new forex evaluations. It's your chance to access 10K to 200K accounts with the largest prop trading firm on the market.

What sets FTMO apart:
🔹 Over €500M paid since 2015.
🔹 Static drawdown -10% (no trailing).
🔹 MT4, MT5 and cTrader native.
🔹 90% profit split after funding.
🔹 Payout in 5 days.

Thousands of traders have already scaled their operations with us.

Check our reviews on Trustpilot and see why we're a global reference.

No coupon, discount auto-applied via link.

Click the link below and choose your plan.

#ftmo #propfirm #propfirmtrading #forex #trader #trading #forextrading #mt5 #ctrader #eurusd #gbpusd #xauusd
`;

  const FEW_SHOT_EN = template === 'promocional' ? FEW_SHOT_PROMOCIONAL_EN : FEW_SHOT_INSTITUCIONAL_EN;

  // ====== TEMPLATE INSTITUCIONAL, ES ======
  const FEW_SHOT_INSTITUCIONAL_ES = `
EJEMPLO INSTITUCIONAL 1 (Apex):
Opera con el Capital de APEX: Evaluaciones de Futuros con Condiciones Especiales

Tú tienes la estrategia, nosotros el capital. APEX Trader Funding ofrece la infraestructura que necesitas para escalar tus operaciones en el mercado de futuros sin arriesgar tu patrimonio personal.

Aprovecha nuestras condiciones actuales para iniciar tu evaluación:
✅ Planes desde $19.90 (tasa de evaluación).
✅ Reglas flexibles y Drawdown ajustado (EOD disponible).
✅ Opera en las principales plataformas: NinjaTrader, Tradovate y Rithmic.

Únete a una comunidad con más de 18 mil reseñas positivas en Trustpilot (calificación 4.4/5).

Usa el cupón: MARKET

Asegura tu lugar y comienza a operar con escala.

#apex #propfirm #propfirmtrading #trader #trading #daytrading #futuros #tradingfuturos #es #nq #mes #mnq

---

EJEMPLO INSTITUCIONAL 2 (Bulenox):
Opera con el Capital de Bulenox: Evaluaciones de Futuros con Drawdown Estático

Tú tienes la estrategia, nosotros el capital. Bulenox ofrece evaluaciones con reglas claras y drawdown estático predecible, ideal para traders que buscan consistencia operativa.

Aprovecha nuestras condiciones actuales para iniciar tu evaluación:
✅ Planes desde $19.25 (tasa de evaluación).
✅ Drawdown estático sin trailing, límites predecibles.
✅ Plataformas: Tradovate, NinjaTrader y Rithmic incluido.
✅ Sin regla de consistencia y payout semanal.

Únete a una comunidad con más de 1.500 reseñas en Trustpilot (calificación 4.5/5).

Usa el cupón: MARKET89

Asegura tu lugar y comienza a operar con escala.

#bulenox #propfirm #propfirmtrading #trader #trading #daytrading #futuros #es #nq #mes #mnq #tradovate

---

EJEMPLO INSTITUCIONAL 3 (FTMO, sin cupón):
Opera con el Capital de FTMO: Evaluaciones de Forex con Historial Comprobado

Tú tienes la estrategia, nosotros el capital. FTMO ofrece la infraestructura que necesitas para escalar tus operaciones de forex con respaldo de más de €500 millones pagados a traders desde 2015.

Aprovecha las condiciones actuales vía nuestro enlace:
✅ Desafíos desde €79 (10K), descuento aplicado automático.
✅ Drawdown estático -10%, sin trailing.
✅ Plataformas: MT4, MT5 y cTrader nativos.
✅ Profit split del 90% después del funding.

Únete a una comunidad con más de 41 mil reseñas en Trustpilot (calificación 4.8/5).

Sin cupón, descuento aplicado automático en el enlace.

Asegura tu lugar y comienza a operar con escala.

#ftmo #propfirm #propfirmtrading #forex #trader #trading #tradingforex #mt5 #ctrader #eurusd #gbpusd #xauusd
`;

  // ====== TEMPLATE PROMOCIONAL, ES ======
  const FEW_SHOT_PROMOCIONAL_ES = `
EJEMPLO PROMOCIONAL 1 (Apex):
🚀 Escala de Capital para Traders de Futuros: 90% OFF en APEX

Trader, ¿por qué limitar tus ganancias al tamaño de tu capital personal?

APEX Trader Funding está liberando un descuento exclusivo del 90% para nuevas evaluaciones de futuros. Es tu oportunidad de acceder a cuentas de 25K a 150K con el menor costo del mercado.

Lo que diferencia a APEX:
🔹 Payouts ágiles y reglas simplificadas.
🔹 Sin límite de pérdida diaria.
🔹 News trading permitido.
🔹 División de ganancias competitiva para el trader.

Miles de traders ya escalaron sus operaciones con nosotros.

Revisa nuestras reseñas en Trustpilot y descubre por qué somos referencia global.

Inserta el cupón: MARKET

Haz clic en el enlace y elige tu plan.

#apex #propfirm #propfirmtrading #trader #trading #daytrading #futuros #tradingfuturos #es #nq #mes #mnq

---

EJEMPLO PROMOCIONAL 2 (Bulenox):
🚀 Escala de Capital para Traders de Futuros: 89% OFF en Bulenox

Trader, ¿por qué limitar tus ganancias al tamaño de tu capital personal?

Bulenox está liberando un descuento exclusivo del 89% lifetime para nuevas evaluaciones. Es tu oportunidad de acceder a cuentas de 25K a 250K con reglas claras y drawdown estático predecible.

Lo que diferencia a Bulenox:
🔹 Drawdown estático sin trailing.
🔹 Sin regla de consistencia.
🔹 Payout semanal y escala hasta $400K.
🔹 Profit split 90% (100% en los primeros $10K).
🔹 Rithmic incluido por 14 días.

Miles de traders ya escalaron sus operaciones con nosotros.

Revisa nuestras reseñas en Trustpilot y descubre por qué somos referencia global.

Inserta el cupón: MARKET89

Haz clic en el enlace y elige tu plan.

#bulenox #propfirm #propfirmtrading #trader #trading #daytrading #futuros #es #nq #mes #mnq #tradovate

---

EJEMPLO PROMOCIONAL 3 (FTMO, sin cupón):
🚀 Escala de Capital para Traders de Forex: Descuento Exclusivo en FTMO

Trader, ¿por qué limitar tus ganancias al tamaño de tu capital personal?

FTMO está liberando un descuento exclusivo aplicado automático vía nuestro enlace para nuevas evaluaciones de forex. Es tu oportunidad de acceder a cuentas de 10K a 200K con la mayor empresa de prop trading del mercado.

Lo que diferencia a FTMO:
🔹 Más de €500M pagados desde 2015.
🔹 Drawdown estático -10% (sin trailing).
🔹 MT4, MT5 y cTrader nativos.
🔹 Profit split del 90% después del funding.
🔹 Payout en 5 días.

Miles de traders ya escalaron sus operaciones con nosotros.

Revisa nuestras reseñas en Trustpilot y descubre por qué somos referencia global.

Sin cupón, descuento aplicado automático en el enlace.

Haz clic en el enlace y elige tu plan.

#ftmo #propfirm #propfirmtrading #forex #trader #trading #tradingforex #mt5 #ctrader #eurusd #gbpusd #xauusd
`;

  const FEW_SHOT_ES = template === 'promocional' ? FEW_SHOT_PROMOCIONAL_ES : FEW_SHOT_INSTITUCIONAL_ES;

  const fewShot = langCode === 'pt' ? FEW_SHOT_PT : (langCode === 'es' ? FEW_SHOT_ES : FEW_SHOT_EN);

  return `# 🌐 IDIOMA DO OUTPUT (CRÍTICO, LEIA ANTES DE QUALQUER COISA)
TODO o texto da caption final DEVE ser escrito em **${langName}** (código: ${langCode}).
- Se ${langCode}=pt: PT-BR neutro (sem gírias pesadas).
- Se ${langCode}=en: US English direto, sem traduzir literalmente do PT.
- Se ${langCode}=es: español neutro (es-LA), sem misturar com português.
NÃO importa que as INSTRUÇÕES abaixo estejam em PT, elas são só pra você seguir. O OUTPUT FINAL é em ${langName}.
Os exemplos few-shot (mais abaixo) ESTÃO no idioma correto (${langCode}). Use-os como referência de tom e estrutura.

# PAPEL
Copywriter de promo comercial para Instagram, nicho de prop trading. Estilo: anúncio de oferta direto, foco em FEATURES + DESCONTO + CUPOM. NÃO escreve storytelling, NÃO escreve dor, NÃO faz pergunta-callout. Escreve promo que parece anúncio oficial da firma com benefícios listados.

# CONTEXTO
Markets Coupons = afiliada de prop firms. Caption vai pro Instagram (orgânico) e potencialmente Meta Ads (paid). DEVE seguir compliance Meta Ads: zero promessa de retorno/lucro, zero "fique rico", zero "ganhe dinheiro com trading". Apenas features, preços, cupom, CTA neutro.

# OBJETIVO DA CAPTION
Listar BENEFÍCIOS REAIS da firma + DESCONTO em vigor (cupom + preços com âncora) de forma que o trader veja valor concreto e clique no link da bio. Estilo: promo direta, não advertorial.

# COMPLIANCE META ADS (CRÍTICO, viole = caption rejeitada)
- ZERO promessa de retorno: "você vai lucrar", "fique rico", "renda garantida", "results guaranteed", "make money fast", "you'll profit"
- ZERO storytelling de dor: "estourou X contas?", "cansado de Y?", "quebrei minha conta", proibido
- ZERO antes/depois de capital ou resultado financeiro
- ZERO urgência fake ("últimas horas!", "só hoje!") a não ser que seja REAL e datada
- ZERO superlativos vazios sobre lifestyle ("transforme sua vida", "realize seus sonhos")
- OK: features técnicas (DD, split, payout days, plataformas), preços com desconto, cupom, "scale to bigger plans" (sem prometer dinheiro), Trustpilot, número de reviews

# FIRMA (fonte única, ZERO invenção, só use o que está aqui)
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
- News trading permitido: ${firm.news_trading === true ? 'SIM' : firm.news_trading === false ? 'NÃO' : 'não informado, NÃO mencione'}
- Day-1 payout: ${firm.day1_payout === true ? 'SIM' : firm.day1_payout === false ? 'NÃO' : 'não informado, NÃO mencione'}
- Descrição (USE APENAS PARA CONTEXTO INTERNO, NUNCA COPIE/COLE NO OUTPUT): ${firm.description || ''}

# ❌ ZERO INVENÇÃO, regra sagrada
Cada número, regra, perk e benefício na caption TEM que existir nos dados acima. Se não tá listado, NÃO EXISTE. Não infere ("provavelmente tem"), não deduz ("firma grande deve ter"), não copia de outra firma do few-shot.
Exemplos proibidos de invenção:
  - Dizer "sem limite diário" se news_trading/perks não citam explicitamente.
  - Dizer "payout em 5 dias" se min_days não é 5.
  - Explicar mecanismo técnico do DD ("ajusta no fechamento", "congela depois de $X") a não ser que apareça EXATO nos dados.
  - Citar "mais de $X pagos" se não tá na descrição/perks.
Se você não tem o dado, ESCOLHE OUTRO BULLET dos disponíveis. Não inventa pra preencher.

# 🔁 CADA DADO APARECE 1× SÓ
Scaling, split, DD, payout, escala-até, cada um pode aparecer UMA VEZ na caption inteira. Se escala até $X já apareceu no bullet 1, NÃO repete no 4. Duplicação = rejeitado.

# 🪞 COERÊNCIA NARRATIVA
A firma sendo vendida nesta caption é **${firm.name}**. Se o hook usa mecanismo "saí de X pra cá", X PRECISA ser outra firma (genérica "firma antiga" / "outra firma" se não quiser nomear). NUNCA "Estourei na ${firm.name}. Aí achei a ${firm.name}", destrói credibilidade.

# TEMPLATE EM USO: ${template === 'promocional' ? 'PROMOCIONAL (🚀 + pergunta retórica + 🔹 bullets)' : 'INSTITUCIONAL (header descritivo + tagline + ✅ bullets)'}

Siga EXATAMENTE a estrutura dos exemplos few-shot abaixo. Adapte os DADOS pra firma atual mas mantenha:
- Mesmo tom (institucional sério OU promocional energético)
- Mesma ordem de blocos
- Mesmos emojis (✅ pra institucional, 🔹 pra promocional)
- Mesma frase-chave ("Você tem a estratégia, nós temos o capital." pra institucional / "Trader, por que limitar seus ganhos..." pra promocional)
- Mesma despedida ("Garanta sua vaga e comece a operar com escala." pra institucional / "Clique no link e escolha seu plano." pra promocional)

# ESTRUTURA DO TEMPLATE INSTITUCIONAL (use SE template=institucional)
1. **Header descritivo:** "Opere com o Capital da [FIRMA]: [Subtítulo descritivo do que diferencia]"
2. **Tagline corporativa (FRASE FIXA):** começa SEMPRE com "Você tem a estratégia, nós temos o capital." Depois conecta com pitch da firma usando UM destes verbos: "oferece a infraestrutura que você precisa para escalar suas operações...", "disponibiliza o capital institucional para...", "estrutura avaliações que permitem [trader acessar maior capital / acessar contas até $X]". JAMAIS começa com "A [FIRMA] é uma das maiores...". JAMAIS copia o campo "Descrição" da firma, esse campo é só pra você entender o contexto, NUNCA aparece no output.
3. **Lead-in:** "Aproveite nossas condições atuais para iniciar sua avaliação:" (ou variação se sem cupom: "Aproveite as condições via nosso link:")
4. **Bullets ✅ (3-4 items):** preço, drawdown+regras, plataformas, perks-relief
5. **Prova social:** "Junte-se a uma comunidade com mais de [N] avaliações positivas no Trustpilot (Nota [X]/5)."
6. **Cupom:** "Use o cupom: [CODE]" OU "Sem cupom, desconto aplicado automático no link."
7. **CTA:** "Garanta sua vaga e comece a operar com escala."
8. **Hashtags:** linha de hashtags

# ESTRUTURA DO TEMPLATE PROMOCIONAL (use SE template=promocional)
1. **Header com 🚀:** "🚀 Escala de Capital para Traders de [Futuros/Forex]: [DESC]% OFF na [FIRMA]"
2. **Pergunta retórica (FRASE FIXA):** "Trader, por que limitar seus ganhos ao tamanho do seu capital pessoal?" (essa frase é literal, não reescreve, não adapta, não troca palavra. Cola igual nos exemplos.)
3. **Pitch da promo:** "A [FIRMA] está liberando um desconto exclusivo de [DESC]% para novas avaliações de [futuros/forex]. É a sua chance de acessar contas de [tier menor] a [tier maior] com [diferencial: 'o menor custo do mercado' / 'condições competitivas' / 'regras simplificadas']." JAMAIS copia o campo "Descrição".
4. **Subtítulo:** "O que diferencia a [FIRMA]:"
5. **Bullets 🔹 (4-5 items):** payouts/regras, drawdown, regras-relief, profit split, plataforma se relevante
6. **Prova social parágrafo:** "Milhares de traders já escalaram suas operações conosco." + linha em branco + "Confira nossos reviews no Trustpilot e veja por que somos referência global."
7. **Cupom:** "Insira o cupom: [CODE]" OU "Sem cupom, desconto aplicado automático no link."
8. **CTA:** "Clique no link e escolha seu plano."
9. **Hashtags:** linha de hashtags

# EXEMPLOS DE REFERÊNCIA, clone EXATAMENTE a estrutura, troque DADOS pela firma atual
${fewShot}

# DADOS DA FIRMA PRA USAR (lista pra você consultar enquanto adapta o exemplo)
- cheapest_plan = ${cheapest ? `${cheapest.a} por ${cheapest.n}${cheapest.o ? ` (era ${cheapest.o})` : ''}` : '—'}
- priciest_plan = ${priciest ? `${priciest.a} por ${priciest.n}` : '—'}
- todos_precos = ${prices}
- coupon_line = ${couponLine}
- trustpilot_line = ${tp || 'sem dado de Trustpilot'}
- platforms_line = ${platforms || 'sem dado de plataformas'}
- perks_line = ${perks || 'sem perks listados'}

# HASHTAGS (1 linha, 10-12 tags lowercase, separadas por espaço)
Use APENAS dessa whitelist (NÃO invente, NÃO use #lifestyle/#motivation/#success/#luxury):
${suggestedHashtags}

# REGRAS DURAS (viole qualquer uma = rejeitado)
✅ OBRIGATÓRIO: replicar EXATAMENTE a voz, ordem dos blocos, emojis e frase-chave do template em uso (${template === 'promocional' ? 'PROMOCIONAL' : 'INSTITUCIONAL'}). Os exemplos few-shot SÃO o template, não recrie estrutura, só substitua os dados.

❌ NUNCA:
  - **Misturar templates:** se template=institucional, NÃO use 🚨/🔥/🎟/💥 do promocional antigo. Se template=promocional, NÃO use estrutura puramente institucional.
  - **Estrutura de "8 blocos com 🚨/🔥/🎟/💰/⚡/🚀/💥"**, esse padrão antigo está APOSENTADO. Use só os 2 templates novos.
  - **Inventar dados:** cada número/regra/perk DEVE estar nos dados da firma acima. Se não tem, omite.
  - **Promessa de retorno** (Meta Ads BAN): "você vai lucrar", "ganhe X", "fique rico", "renda passiva", "results guaranteed", "you'll profit"
  - **Lifestyle vazio**: "transforme sua vida", "realize seus sonhos", "eleve seu jogo"
  - **Adjetivos vazios**: "incrível", "excelente", "top do mercado", "oportunidade única"
  - **Verbos errados com conta**: NUNCA "tocar contas", "puxar contas", "bater contas". Use "ter conta", "operar conta", "comprar avaliação", "passar avaliação".
  - **Markdown** (**negrito**, *itálico*) ou aspas envolvendo a caption
  - **Preâmbulo** ("Aqui está:", "Segue a caption:")
  - **Hashtags banidas**: #nfl, #sports, #lifestyle, #motivation, #luxury, #success, #entrepreneur, #wealth
  - **Palavras BANIDAS COMPLIANCE LEGAL**: "sinais", "entrada", "stop loss", "take profit", "recomendação de trade", "operação ao vivo", "lucro garantido", "trader profissional", "signals", "guaranteed profit", "copy trade", "we trade for you"
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

  const { firmId, lang, template } = req.body || {};
  if (!firmId || typeof firmId !== 'string') return res.status(400).json({ error: 'Missing firmId' });
  const langName = LANG_NAMES[lang] || LANG_NAMES.pt;
  const tmpl = (template === 'promocional' || template === 'institucional') ? template : 'institucional';

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

  const prompt = buildPrompt(firm, langName, tmpl);
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
