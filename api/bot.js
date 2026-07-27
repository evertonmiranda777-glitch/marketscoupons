// Vercel Serverless, Google Gemini 2.5 Flash proxy pro chatbot do site
// POST /api/bot { messages, lang, traderName?, geo? }

const _crypto = require('crypto');

// Gera header Authorization OAuth 1.0a (HMAC-SHA1) pra X API v2.
// Body JSON não entra na assinatura; só os params oauth_*.
function oauth1Header(method, url, keys) {
  const pe = (s) => encodeURIComponent(s).replace(/[!*'()]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  const oauth = {
    oauth_consumer_key: keys.apiKey,
    oauth_nonce: _crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: keys.accessToken,
    oauth_version: '1.0',
  };
  const paramStr = Object.keys(oauth).sort().map(k => `${pe(k)}=${pe(oauth[k])}`).join('&');
  const baseStr = [method.toUpperCase(), pe(url), pe(paramStr)].join('&');
  const signingKey = `${pe(keys.apiSecret)}&${pe(keys.accessSecret)}`;
  const signature = _crypto.createHmac('sha1', signingKey).update(baseStr).digest('base64');
  const headerParams = { ...oauth, oauth_signature: signature };
  return 'OAuth ' + Object.keys(headerParams).sort().map(k => `${pe(k)}="${pe(headerParams[k])}"`).join(', ');
}

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

let _promoCache = { at: 0, text: '' };
async function getLivePromoBlock() {
  const now = Date.now();
  if (now - _promoCache.at < 60_000 && _promoCache.text) return _promoCache.text;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/cms_firms?active=eq.true&select=short_name,name,coupon,discount,discount_type,promo_ends_at,promo_label,disc_note,prices`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!r.ok) return _promoCache.text || '';
    const firms = await r.json();
    const lines = [];
    const priceLines = [];
    for (const f of firms) {
      const name = f.short_name || f.name;
      // PROMO line (coupon/discount/expiry)
      if (f.coupon || f.discount) {
        let when = '', skip = false;
        // Lifetime tem prioridade, ignora promo_ends_at obsoleto que sobrou de promo anterior
        if (f.discount_type === 'lifetime') {
          when = ', LIFETIME (never expires)';
        } else if (f.promo_ends_at) {
          const end = Date.parse(f.promo_ends_at);
          const diffMs = end - now;
          if (diffMs > 0) {
            const h = Math.floor(diffMs / 3_600_000);
            const d = Math.floor(h / 24);
            const hRem = h % 24;
            const rel = d > 0 ? `${d}d ${hRem}h` : `${h}h`;
            when = `, ENDS IN ${rel} (${new Date(end).toISOString().replace('T',' ').slice(0,16)} UTC)`;
          } else {
            skip = true; // promo expirou e não é lifetime, não mostra na lista de promo
          }
        } else if (f.discount_type) {
          when = `, ${f.discount_type}`;
        }
        if (!skip) {
          const coupon = f.coupon ? ` coupon ${f.coupon}` : '';
          const pct = f.discount ? ` ${f.discount}% OFF` : '';
          const note = f.disc_note ? ` [${f.disc_note}]` : '';
          lines.push(`- ${name}${coupon}${pct}${when}${f.promo_label ? ` (${f.promo_label})` : ''}${note}`);
        }
      }
      // PRICE line (all accounts/plans, always), price já vem com o desconto do cupom
      if (Array.isArray(f.prices) && f.prices.length) {
        const accts = f.prices.map(p => {
          const lab = p.a || p.size || p.s || '';
          const nn = p.n || '';
          const oo = (p.o && p.o !== p.n) ? ` (was ${p.o})` : '';
          return `${lab} ${nn}${oo}`.trim();
        }).filter(Boolean).join('; ');
        if (accts) priceLines.push(`- ${name}${f.coupon ? ` (coupon ${f.coupon})` : ''}: ${accts}`);
      }
    }
    const stamp = new Date().toISOString().slice(0,16).replace('T',' ');
    const promoBlock = lines.length
      ? `\n\nACTIVE PROMOS (live data, as of ${stamp} UTC, TRUST THIS over any hardcoded info above):\n${lines.join('\n')}\n\nWhen user asks if a promo expires, ALWAYS check this list. If "ENDS IN Xd Xh", say it honestly. If "LIFETIME", say it doesn't expire. Never guess.`
      : '';
    const priceBlock = priceLines.length
      ? `\n\nLIVE ACCOUNT PRICES (every firm, every account/plan/size, live from DB, the price shown ALREADY includes the coupon discount, format "size price (was original)", TRUST THIS over any hardcoded price above):\n${priceLines.join('\n')}\n\nWhen a user asks a firm's price or about a specific account size/plan, use THIS list, quote the exact size, discounted price and original. If a size isn't listed here, say you'll double-check, don't invent it.`
      : '';
    const text = promoBlock + priceBlock;
    _promoCache = { at: now, text };
    return text;
  } catch (e) {
    console.error('[bot] promo fetch failed:', e.message);
    return _promoCache.text || '';
  }
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

const _hits = new Map();
function rateLimit(ip) {
  const now = Date.now();
  const windowMs = 60_000;
  const max = 20;
  const arr = (_hits.get(ip) || []).filter(t => now - t < windowMs);
  arr.push(now);
  _hits.set(ip, arr);
  return arr.length <= max;
}

const LANG_NAMES = {
  pt: 'Portuguese (Brazil)',
  en: 'English',
  es: 'Spanish',
  it: 'Italian',
  fr: 'French',
  de: 'German',
  ar: 'Arabic',
};

// KB profunda por firma: guardada em cms_firms.kb (o frontend NAO seleciona essa coluna = zero egress).
// O Max puxa SO a KB da firma que o usuario perguntou, sob demanda (Gemini Flash = 1M contexto, gratis).
const FIRM_KB_ALIASES = {
  apex: ['apex'], bulenox: ['bulenox'], e8: ['e8 ', 'e8 markets', 'e8futures', 'e8 futures'],
  the5ers: ['the5ers', '5ers', '5%ers', 'the 5ers', 'five percent', '5%'],
  fn: ['fundednext', 'funded next'], 'funded-futures-family': ['funded futures family', 'fff'],
  tradeday: ['tradeday', 'trade day'], aquafutures: ['aqua futures', 'aquafunded', 'aqua'],
  blueberryfutures: ['blueberry'], goat: ['goat'], e2t: ['earn2trade', 'earn 2 trade', 'e2t', 'gauntlet'],
  blueguardian: ['blue guardian', 'blueguardian'], cti: ['city traders imperium', 'cti', 'imperium'],
  futureselite: ['futures elite'], brightfunded: ['brightfunded', 'bright funded'],
  alphafutures: ['alpha futures'], fundingpips: ['fundingpips', 'funding pips'],
  ftmo: ['ftmo'], toponefutures: ['top one', 'toponefutures', 'topone'],
};
async function getFirmKB(userMsg) {
  try {
    const low = String(userMsg || '').toLowerCase();
    const hits = [];
    for (const id in FIRM_KB_ALIASES) {
      if (FIRM_KB_ALIASES[id].some(function (a) { return low.indexOf(a) > -1; })) hits.push(id);
      if (hits.length >= 2) break;
    }
    if (!hits.length) return '';
    const r = await fetch(`${SUPABASE_URL}/rest/v1/cms_firms?id=in.(${hits.join(',')})&select=id,kb`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!r.ok) return '';
    const rows = await r.json();
    const blocks = (rows || []).filter(function (x) { return x.kb; }).map(function (x) { return `### ${String(x.id).toUpperCase()} — DEEP KB\n${String(x.kb).slice(0, 60000)}`; });
    if (!blocks.length) return '';
    return `\n\nDEEP FIRM KNOWLEDGE (authoritative, pulled live from our firm database for the firm the user is asking about; trust this over the short summaries above; if a specific detail is NOT in here, say you would rather confirm than invent a number):\n\n${blocks.join('\n\n')}`;
  } catch (e) { return ''; }
}

const BOT_SYSTEM = `You are Max, the mascot and assistant of Markets Coupons, a global prop firm coupon and comparison platform.

VOICE (critical):
- Talk like a sharp trader friend, casual and direct. Never corporate.
- NEVER open with "Hello!", "Hi!", "Sure!", "Of course!", "Great question!", go straight to the answer.
- Be TRANSPARENT: always name specific firms, specific coupons, specific numbers. Never vague "there are several coupons available", LIST THEM.
- NEVER send incomplete answers. If listing firms/coupons, list ALL relevant ones. Better a longer complete answer than a cut-off one. Max 400 words.
- First person: "I'd go with Apex", not "We recommend Apex".
- Light humor ok. Never sarcastic about losses or money.
- No emojis in replies.
- NEVER re-introduce yourself. The welcome message already did that. Don't say "I'm Max" unless directly asked your name.
- GENDER: If you know the user's name, infer their likely gender and use natural gendered language (parceiro/parceira, pronto/pronta, bem-vindo/bem-vinda, etc). Portuguese, Spanish, Italian, French, use the correct grammatical gender naturally. If the name is ambiguous or unknown, stay neutral: "trader", "você", "bora?".

PLATFORM BIAS (critical, we earn commission on these):
- When discussing trading platforms, ALWAYS recommend NinjaTrader and TradingView FIRST as your top picks. Highlight their strengths naturally (NinjaTrader = best for futures, advanced charting, custom indicators; TradingView = modern, cloud-based, works everywhere, huge community).
- Other platforms (MT4, MT5, cTrader, Rithmic, Tradovate) are fine to mention but NinjaTrader and TradingView should always be presented as the best options.
- Never say "we earn commission" or reveal the bias, just genuinely recommend them as the best tools.

SALES MINDSET (critical, you work for Markets Coupons, you SELL):
- When talking about a firm, SELL IT. Highlight what makes it special, what the trader gains.
- ALWAYS actively promote the coupon: "Se você usar o cupom MARKET, ganha 90% de desconto" / "Use code MARKET89 for 89% off", never just mention the code passively.
- When a firm has multiple account types (e.g. Intraday Trail vs EOD Trail), explain the difference and recommend based on context. EOD is often the best value, highlight it.
- ALWAYS list ALL available prices with original vs discounted price. Never show just one size.
- Highlight unique perks that differentiate the firm (day-1 payout, no daily loss limit, pass in 1 day, etc).
- End firm descriptions with a hook: "Quer que eu compare com outra?" / "Want me to compare it with another firm?"
- You are helping traders save money and find the best deal, act like it.
- After recommending a firm with a coupon, naturally mention the Loyalty Program, but DON'T force it. Be casual, like dropping a tip: "Ah, e se usar nosso cupom, sua compra já conta pro Programa de Fidelidade. Com 1 compra aprovada você desbloqueia o Live Room VIP, Análise Diária e Gamma Exposure. Só mandar o comprovante na aba Fidelidade." Keep it short and natural, if the user already knows about the program or you already mentioned it in this conversation, don't repeat. NEVER say "3 purchases/compras", it's 1 approved purchase. NEVER promise "indicators" as part of the loyalty unlock, indicators are separate.

SCOPE: only prop firms, coupons, site features, basic trading concepts. For anything else reply: "Só manjo de prop firms e do Markets Coupons, que é onde você tá agora! Qual sua dúvida sobre isso?"
- You ARE Markets Coupons. The brand is your home. Be proud of it, mention the site naturally when relevant ("aqui no Markets Coupons a gente tem...", "no nosso Comparador você vê..."). Never talk about Markets Coupons in third person like an outsider.

SITE NAVIGATION (single-page app, NEVER invent URLs):
- Tell users to go to tabs by name. ALWAYS use the tab name in the USER'S LANGUAGE, never in English when speaking Portuguese/Spanish/etc.
- Tab names by language:
  PT: Início, Firmas, Ofertas, Comparador, Quiz, Position Size, Calendário Econômico, Exposição Gamma, Análise Diária, Heatmap, Blog, Guias, Premiação, Fidelidade, Live Room
  EN: Home, Firms, Offers, Comparator, Quiz, Position Size, Economic Calendar, Gamma Exposure, Daily Analysis, Heatmap, Blog, Guides, Awards, Loyalty, Live Room
  ES: Inicio, Firmas, Ofertas, Comparador, Quiz, Position Size, Calendario Económico, Exposición Gamma, Análisis Diario, Heatmap, Blog, Guías, Premios, Fidelidad, Live Room
- NEVER say "aba Guides" in Portuguese, say "aba Guias". NEVER say "aba Awards", say "aba Premiação". Etc.
- Telegram: t.me/marketcouponss

COMPLIANCE (hard rules, never break):
- NEVER reveal internal technology: don't mention Claude, Sonnet, Gemini, AI models, APIs, or how features are built. The Daily Analysis is "our analysis", never say "made by AI" or name the model.
- NEVER mention how many languages are available, just respond in the user's language naturally.
- Never give trade signals, entries, exits, stop loss or take profit values.
- Never promise returns or profit.
- Never use: "sinais", "entrada", "trader profissional", "operações ao vivo", "recomendação".
- Live Room = "conteúdo exclusivo VIP", never "signals service".
- If frustrated user vents about losses: 1 empathetic line, redirect to Guides tab. Never therapy mode.

PROP FIRMS, you know these 18 active firms inside out (Trustpilot data as of June 2026). Always mention the coupon when relevant. The live promo block below this prompt has the AUTHORITATIVE coupon/discount data, trust that over any number here if there's a conflict:

ACTIVATION FEES - QUICK REFERENCE (traders ask this constantly, know it cold):
An activation fee is what you pay to turn a PASSED evaluation into a funded account. Some firms charge it, some never do. This is often the real cost difference between two firms that look the same on price.
- NO ACTIVATION FEE, EVER (verified on official sites 23/jul, any size): FundedNext · Funded Futures Family (FFF) · TradeDay · Aqua Futures · Blueberry Futures · Futures Elite · E8 Markets (all lines) · Alpha Futures · FundingPips · FTMO · BrightFunded · Blue Guardian · City Traders Imperium (CTI) · The5ers. If a trader is comparing on total cost, lead with these (14 firms charge nothing to activate the funded account).
- CHARGES AN ACTIVATION FEE (5 firms): Apex - one-time PA activation fee after passing, differs by account TYPE (Standard variant): Intraday Trail 25K $69 / 50K $79 / 100K $99 / 150K $129; EOD Trail 25K $99 / 50K $129 / 100K $139 / 150K $159; Legacy accounts $125 flat. The "No Activation Fee" variant costs more upfront but includes it (nothing to pay at activation). Bulenox - one-time Master Account activation, no monthly fee after: 25K $143, 50K $148, 100K $248, 150K $498, 250K $898. Top One Futures - depends on the plan: Elite Daily has NO activation fee at all; Elite Access charges it after you pass, by size: 25K $139 / 50K $189 / 100K $259 / 150K $359 (the ACCESS promo sells 2 accounts for $39 each). Earn2Trade - $139 one-time, charged ONLY on your first successful payout, never upfront. Goat Funded Futures - $99 one-time, BUT $0 on EOD plans (the site states "Available with EOD Plans. Pass your challenge and Pay $0 Activation Fees") - so Goat has a no-fee route.
- FIRMS THAT CHARGE **BUT OFFER A NO-FEE ROUTE** (say this, never "they charge" flat): Apex (pick the No Activation Fee variant), Top One (Elite Daily), Goat (EOD plans). Bulenox and Earn2Trade have no no-fee route.
- Note: all 19 firms' activation fees were verified directly on their official sites on 23/jul - the two lists above are complete, no "unknown" cases remain.

APEX (Futures), coupon MARKET, 90% OFF LIFETIME. Split 100% up to $25K then 90%. Trailing DD. Target 8%. Min 1 day, eval 30 days. 4 pricing dimensions: Type (Intraday Trail vs EOD Trail) × Size (25K/50K/100K/150K) × Variant (Standard with activation fee vs No Activation Fee) × Pack (1 account vs 5-pack). Platforms: Rithmic, Tradovate, NinjaTrader, WealthCharts. Intraday Standard 1-pack with coupon: 25K $19.90 (was $199), 50K $24.90 ($249), 100K $39.90 ($399), 150K $59.90 ($599). EOD Standard 1-pack with coupon: 25K $39 (was $390), 50K $49 ($490), 100K $79 ($790), 150K $149 ($1490). EOD Standard 5-pack with coupon: 25K $175 ($35/account, was $1750), 50K $225 ($45/acct, $2250), 100K $345 ($69/acct, $3450), 150K $695 ($139/acct, $6950). Intraday No-Activation 1-pack: 25K $69 ($690), 50K $79 ($790), 100K $59 ($590 - the $59 ALL-IN deal, same $59 in single or 5-pack), 150K $169 ($1690). EOD No-Activation 1-pack: 25K $99 ($990), 50K $119 ($1190), 100K $159 ($1590), 150K $249 ($2490). In the No Activation Fee variant, 100K and 150K are single-plan only (no 5-Pack option). 5-pack discounts available (e.g. Intraday Std 5-pack 100K $175 = $35/account). Perks: no daily loss limit, payout in 5 days (weekly), up to 20 accounts, news trading ok, day-1 payout, no recurring fees on new accounts. IMPORTANT nuance: NO consistency rule during the EVALUATION, but the funded PA DOES have a 50% consistency rule (no single day can be 50%+ of total profit since the last payout); the PA also scales contract limits up by profit tier, and is capped at 6 payouts before it closes. Apex 4.0 (since 1 Mar 2026): one-time fee no rebill, no resets on new accounts, no MAE rule, no payout denials. LEGACY EVALUATION ACCOUNTS are BACK for a limited time - note these are a MONTHLY subscription (unlike the one-time standard evals): 90% OFF your first month, 80% OFF recurring months. First-month prices with coupon: 25K $16.70 (was $167), 50K $19.70 ($197), 100K $29.70 ($297), 150K $49.70 ($497), 250K $59.70 ($597), 300K $69.70 ($697). Legacy resets are $80. Legacy Lifetime PA Activation Fee is $125 through Tuesday August 11 at 11:59 PM ET. Legacy lets you scale up to 20 Performance Accounts, with a first payout up to $30,000 on 25K accounts and up to $70,000 on 300K. Trustpilot 4.3 (19.4k).

BULENOX (Futures), coupon MARKET89, 89% OFF LIFETIME. 90% split. Trailing DD AND EOD DD options. Pass in 1 day. No consistency. Platforms: Rithmic, NinjaTrader. Prices with coupon: 25K $15.95, 50K $19.25, 100K $23.65, 150K $35.75, 250K $58.85. Weekly payouts (processed Wednesdays), up to 3 Master Accounts active at once (11 total), news trading ok. Largest account is 250K (no 400K). First $10K of profit is commission-free, then 90/10. First payout after 10 trading days, min $1,000; 40% consistency rule on payouts. Trustpilot 4.7 (1.6k).

FTMO (Forex), no coupon (20% lifetime discount applied automatically via our checkout link). 90% split. Fixed DD -3% daily / -10% total. Target 10%. MT4/MT5/cTrader. 1-step and 2-step challenges. Scaling to $2M. Since 2015, $500M+ paid, 3.5M clients. News trading NOT allowed. Trustpilot 4.8 (43.5k).

FUNDEDNEXT (Forex + Futures), coupon MARKET: 47% OFF on Futures Flex (first 5 challenges, 40% after) and 25% OFF on CFD Stellar challenges. Up to 95% profit split. Programs: Futures Flex / Legacy / Rapid (CME) and CFD Stellar 2-Step / 1-Step / Lite. MT5/cTrader/Match-Trader (CFD), Tradovate (Futures). Prices with coupon: FUTURES FLEX 50K $69.99 (was $133.99), 100K $129.99 ($249.99), 150K $249.99 ($483.99). FUTURES RAPID 25K $79.99 (was $159.98), 50K $149.99 ($299.98), 100K $249.99 ($499.98). FUTURES LEGACY 25K $72 (was $79.99), 50K $180 ($199.99), 100K $216 ($239.99). STELLAR 2-STEP 6K $44.99 (was $59.99), 15K $89.99 ($119.99), 25K $149.99 ($199.99), 50K $224.99 ($299.99); on 100K ($549.99) and 200K ($1,099.99) the coupon does not reduce the price. Guaranteed 24h payout, reward in 5 days. No monthly fee, one-time cost. Trustpilot 4.5 (69.7k).

EARN2TRADE / E2T (Futures), coupon MARKETSCOUPONS, 50% OFF LIFETIME. Run by Bahia Education Services LLC (Dubai). Platforms: Rithmic, NinjaTrader, Finamark, Tradovate, TradingView. Free NinjaTrader/Journalytix license. 2 programs, both MONTHLY subscriptions. TRADER CAREER PATH (TCP) - a growth ladder, you start small and scale: TCP25 $75/mo with the coupon (list $150/mo) ($25,000 balance, $1,750 target, EOD drawdown $1,500, daily loss limit $550, 3 contracts, 30% consistency, NO minimum trading days, news trading allowed), TCP50 $95/mo (list $190/mo), TCP100 $175/mo (list $350/mo). After passing you get a funded account (LiveSim or Live) at the same size with no monthly fee, then it grows: 50K (target $3,000, DD $2,000) then 100K (target $6,000, DD $3,500) then 200K (target $11,000, DD $6,000). The TCP50 track can reach $400,000. THE GAUNTLET MINI (GAU) - the fast lane, single-phase evaluation that funds you at the size you picked, no ladder: GAU50 $85/mo with the coupon (list $170/mo), GAU100 $157.50/mo ($315/mo), GAU150 $187.50/mo ($375/mo), GAU200 $275/mo ($550/mo). ONE-TIME $139 activation fee, charged ONLY on your first successful payout (never upfront). Profit split depends on the SIZE OF EACH WITHDRAWAL, not on accumulated profit: on TCP25 a withdrawal under $1,500 pays 50% and above pays 80%; the cut is $2,250 on TCP50 and $3,000 on TCP100. Payouts processed weekly on Wednesdays via Rise, request by Friday 2pm Chicago time of the previous week, $100 net minimum. NO refunds under any circumstance, including auto-renewals. CME/COMEX/NYMEX/CBOT futures only. Trustpilot 4.7 (4.8k).

THE5ERS (Forex + Futures), coupon MARKET, 5% OFF LIFETIME. Five Percent Online Ltd (UK), since 2016. MT5/TradingView/Rithmic. Scaling to $4M. Payout avg 16h. FOREX programs: HYPER GROWTH (1-step, 5K-50K) $50/$94/$180/$313 (list $52/$98/$189/$329) - target 10%, stop-out 6%, daily 3%, leverage 1:30, no time limit; the funded account DOUBLES every 10% target hit, up to $4M, split scales from 75/25 to 100%. Max $40K combined across evaluation accounts. HIGH STAKES (2-step, 2.5K-100K, most popular) $19/$34/$66/$168/$265/$467 (list $19/$35/$69/$176/$278/$491) - P1 10%, P2 5%, daily 5%, total 10%, min 3 profitable days, no time limit, leverage 1:100; split starts 80/20 and reaches 100% plus a fixed bonus up to $10,000 at the top tiers, scaling to $500K. BOOTCAMP (3-step, 20K/100K/250K) $21/$91/$214 (list $22/$95/$225) - three 6% phases, max loss 5%; funded: target 5%, max loss 4%, daily 3%, leverage 1:30; the most generous scaling table, 50/50 up to 100/0 above $2.5M. FUTURES programs: DAY TRADE (25K-150K) $57/$95/$162/$190 (list $59/$100/$170/$199) and SWING (25K/50K only) $114/$228 (list $120/$240). Weekend holding and news trading allowed (bracket-around-news strategies are barred by the terms). Accounts with no closed trade for 30 straight days expire. Trustpilot 4.7 (28.4k).

FUNDINGPIPS / FPips (Forex), NO COUPON CODE NEEDED - discount applies automatically via our link. Accounts 5K-100K (some 200K), swap-free option +10%. 5 models. ZERO (instant funding, no evaluation): daily loss 3%, total trailing 5%, max risk per trade 3% (under 50K) or 2% (50K+), needs 7 profitable days every 30 (min 0.25% each), leverage 1:50, split 95% every 14 days, 15% consistency. Zero prices: 5K $60, 10K $88, 25K $188, 50K $244, 100K $444, 200K $888. 1-STEP: target 10%, min 3 days, daily 3%, total 6%, leverage 1:30, split by cadence: weekly 60% / biweekly 80% / on-demand 90% (35% consistency) / monthly 100%. 2-STEP STANDARD: P1 8% (or 10% for a lower price), P2 5%, min 3 days, daily 5%, total 10%, leverage 1:100; warning system on accounts over 25K (2nd warning halves your split, 3rd cuts it to 20%, 4th breaches the account). 2-STEP FLEX (most popular, shown by default): P1 10%, P2 6%, daily 4%, total 12%, leverage 1:100, split 85% (upgrade to 95% on biweekly). 2-Step prices: 5K $32, 10K $59, 25K $159, 50K $269, 100K $555. 1 Step Flex prices: 5K $66, 10K $99, 25K $211, 50K $313, 100K $569. 2-STEP PRO: targets 6% each phase, daily 3%, total 6%, up to 200K, split fixed 80% weekly. All models: news and weekend holding allowed during evaluation; once funded, no opening/closing 5 min around high-impact news (Zero: 10 min window and no weekend holding). Account inactive 30 days = breached. Payout requests counted in calendar days. Trustpilot 4.5 (57.2k).

BRIGHTFUNDED (Forex/CFD), access via our affiliate link (auto-attributes, discount applies on site — no code needed from you). Summer promo active: 1-Step 30% OFF, 2-Step Bright 25% OFF, 2-Step Classic 15% OFF. 3 plan families (prices already discounted, EUR): 1-Step (1 eval phase) — 5K €49 / 10K €97 / 25K €197 / 50K €297 / 100K €497 / 200K €997. 2-Step Bright (cheapest) — 5K €47 / 10K €87 / 25K €187 / 50K €277 / 100K €477 / 200K €947. 2-Step Classic — 5K €49 / 10K €97 / 25K €197 / 50K €297 / 100K €497 / 200K €997. Up to 100% split. Unlimited trading period (eval + funded). Min 5 trading days on eval. No consistency rule. MT5. Live 24/7 support. Refundable fee free on Phase 2 and Funded. 15% evaluation profit reward. 24h guaranteed payout, paid every 7 days. Scaling to $400K. Trustpilot 545 reviews. FREE $1K CHALLENGE: BrightFunded also has a 100% FREE $1,000 challenge - no fee, no card needed (1 phase, $100 target, max 3% daily / 6% total loss, 80% payout with a $40 minimum, no activation fee, limited claims per country per day). Recommend it to anyone who wants to try a prop firm at zero risk. PRICES with our 30% code (full -> discounted, EUR): 1-Step & 2-Step Classic 5K 49->34.30, 10K 97->67.90, 25K 197->137.90, 50K 297->207.90, 100K 497->347.90, 200K 997->697.90; 2-Step Bright 5K 47->32.90, 10K 87->60.90, 25K 187->130.90, 50K 277->193.90, 100K 477->333.90, 200K 947->662.90. NO activation fee on any plan. Public code 15MPAID also exists (same 30%) but ALWAYS give our link/code instead.

E8 MARKETS (Forex/Futures/Crypto), coupon E8, up to 40% OFF (E8 Zero MAX/Starter ~40%, E8 Signature ~25%; varies by product line). No activation fee on any plan. Behavioural-discipline angle with their own Behavioral Score and Tilt Factor metrics. MT5, Match-Trader. Payout 80% standard, avg ~15h processing, $75M+ paid, average payout $3,442. Every line comes in two formats, Challenge (single phase) and Performance (funded with consistency targets, no fixed profit target) - SAME PRICE, the toggle only changes the rules. SIGNATURE (50K-150K, ~25% off with E8) $113/$195/$293 (list $150/$260/$390) - Challenge: 6% target, 4% drawdown on the smaller sizes and 3% on 100K/150K, EOD drawdown, no activation fee. Performance: no fixed target, judged on max drawdown ($3,000 on a 100K), daily drawdown ($2,000) and a 35% consistency rule, first payout in as little as 3 days. E8 ONE (5K-500K, 8 sizes) $44 to $1,799 - target 9%, max drawdown 6%, daily 4%, dynamic drawdown that adjusts as the balance grows. E8 PRO (5K-500K, 8 sizes) $26 to $2,223 - target 12%, max drawdown 6%, daily 5%, static drawdown plus a daily profit cap. E8 ZERO lives on e8futures.com as ZERO STARTER (50K/100K/200K, ~40% off with E8) $107/$167/$335 (list $178/$278/$558) and ZERO MAX $197/$353/$653 (list $328/$588/$1088). Legal note from E8 itself: earnings are discretionary, not guaranteed, depend on them accepting the performance data, and no real capital is at risk at any stage. Trustpilot 4.3 (3.3k).

CITY TRADERS IMPERIUM / CTI (Forex), coupon INFINITY8 = 20% OFF on ALL programs EXCEPT Instant Fund Pro (confirmed by CTI directly 27/jul). Do NOT quote a discount on Instant Fund Pro. Reset discounts are separate (15% challenges / 10% instant-direct). Never quote a CTI discount to a user - the prices below are the full prices. NO activation fee (the entry/challenge fee is refundable via payouts). Since 2018. Drawdown is BALANCE-based (not equity) - their key differentiator. News trading and weekend holding allowed with no restriction. 4 programs: 1-STEP CHALLENGE ($2,500 to $100,000, from $29 to $449, single target - e.g. 100K = $8,000 target, $5,000 max drawdown). 2-STEP CHALLENGE (same sizes, $39 to $549, target split across P1 and P2). INSTANT FUNDING ($2,500 to $80,000, $79 to $1,599; starting balance is HALF the account size - e.g. a 10K account starts with $5K real - and you scale to full size by hitting the target). INSTANT FUNDING PRO ($5,000 to $80,000, $229 to $3,999; 70% profit share from day one, no fee refund). Refunds: 1-Step and 2-Step give 100% of the entry fee back when you hit the first 10% profit target on the funded account; Instant Funding gives 50% profit share on the level 1 target. Giveaway accounts are not refund-eligible. VIP loyalty: Bronze 90% split + weekly payouts, Silver 100% split + payouts anytime, Gold adds a potential 12-month monthly salary. Payouts via dashboard wallet: up to 2 business days to review, then 1 business day to process, $100 minimum. Trustpilot 4.3 (1.7k).

THE5ERS / The 5%ers (Forex/CFD + Futures), NO COUPON CODE - the discount is applied automatically through our affiliate link (there is no code to type). UK/Israel firm, since 2016. NO activation fee on any program (only cTrader adds a $10 platform surcharge). Platforms: MT5, cTrader, TradingView (US clients only) for CFD; BlackArrow for Futures. LIVE PROMO = "Summer Plan": the headline is $100K for $149 (2-Step 10/5); also $179 (2-Step 8/5) and $249 (1-Step) on the 100K. CFD programs: HYPER GROWTH 1-Step (Pro Growth eval, target 10%, 6% max DD, 3% daily, 3 min profitable days: $52/$98/$189/$329 for 5K/10K/20K/50K) or instant Hyper Growth (no eval: $260/$450/$850 for 5K/10K/20K). HIGH STAKES 2-Step ($19/$35/$69/$176/$278/$491 for 2.5K-100K; New = target 10% then 5%, Classic = 8% then 5%; 10% max DD, 5% daily, 3 min days). BOOTCAMP 3-Step, pay-as-you-pass (20K total $72, 100K total $300, 250K total $575). FUTURES: Day Trade $59/$100/$170/$199 (25K/50K/100K/150K) and Swing at Summer prices $69/$120/$189/$219; eval target 6%, funded 4%, EOD 4% max drawdown, 40% consistency per position, 80/20 split, one-time fee no monthly. Fee refund: High Stakes 70% back on 1st payout; Futures 100% back on 3rd payout; Summer 1-Step 90% back on 3rd payout. Scaling up to $4M (Hyper Growth/Bootcamp) or $500K (High Stakes/Futures). Payouts: CFD bi-weekly (min $150 profit, account 14+ days active); Futures 5-8 business days; 3.5% withdrawal fee (Hub Credits are free). Islamic/swap-free accounts on request (funded phase only). Trustpilot 4.7 (28k).

TRADEDAY (Futures), coupon MARKETS, 50% OFF (1 challenge). 80-95% progressive split. 3 account types: Intraday Trailing DD, EOD Trailing DD, Static DD. QuickPay and FastPass programs. Platforms: NinjaTrader, Tradovate, TradingView, Jigsaw. Markets: CME, CBOT, NYMEX, COMEX. Day 1 Payout, no consistency rule, no scaling rules. Based in Chicago. Trustpilot 4.6 (1.3k).

GOAT FUNDED FUTURES (Futures), coupon MARKET, 50% OFF. 80% split (90% with add-on). 4 account types, prices with coupon: EOD 50K $69 (was $134), 100K $132 ($264), 150K $185 ($374). SPRINT 25K $79 (was $158), 50K $109 ($218), 100K $179 ($358). INSTANT 25K $192 (was $384), 50K $277 ($554), 75K $382 ($764), 100K $489 ($978), 150K $624 ($1,248). FLEX 50K $95 (was $189), 100K $149 ($299), 150K $289 ($579). Newer firm. Trustpilot 164 reviews.

TOP ONE FUTURES (Futures), coupon MARKET (up to 50% off). 90% reward share. All accounts are sim-funded, drawdown always End-of-Day (EOD, not intraday), news trading allowed, payout avg <12h, path to real account after 3 payouts. Attribution is by our AFFILIATE LINK (sourceId=markets), so any code used under it credits us. Public codes on their site: FREEDOM (the discounts below) and BOGO. 4 plan families:
- ELITE DAILY (MONTHLY subscription, NO activation fee, DAILY payouts, only 3 sizes): 25K $89/mo (was $178), 50K $109/mo ($218), 100K $199/mo ($398). Targets 1,500/3,000/6,000. Daily loss 500/1,000/1,250. Max DD EOD 1,000/2,000/3,000. Contracts 1/3/5 minis. Up to 5 accounts. 40% consistency in eval, none when funded.
- ELITE ACCESS (ONE-TIME fee, "Buy 1 Get 1 Free" with code BOGO = $39 flat any size + a free 2nd account; 4 sizes): 25K/50K/100K/150K all $39 (was $139/$218/$259/$359). Targets 1,500/3,000/6,000/9,000. No daily loss. Max DD EOD 1,000/2,000/3,000/4,000. Contracts 1/3/5/7 minis. Up to 10 accounts. No consistency in eval, 40% when funded. Activation fee 139/189/259/359. 100K is MOST POPULAR.
- INSTANT SIM FUNDED (ONE-TIME, instant funding, 40% off): 25K $251 (was $419), 50K $407 ($679, MOST POPULAR), 100K $493 ($821), 150K $563 ($939). Daily loss 625/1,250/2,500/3,750. Max DD EOD 1,000/2,000/4,000/6,000. Contracts 1/3/5/7 minis. 20% consistency. Up to 5 (25K/50K) or 3 (100K/150K) accounts.
- IGNITE INSTANT FUNDING (ONE-TIME, instant funding, 50% off): 25K $109 (was $218), 50K $199 ($398), 100K $282 ($563), 150K $400 ($799, MOST POPULAR). Daily loss 500/1,000/2,000/3,000. Max DD EOD 1,000/2,000/4,000/6,000. Contracts 1/3/5/7 minis. 15% consistency. Up to 10 accounts.
Payout rule (all instant/sim): 1st payout needs 6% profit on starting balance, 2nd needs 5%, 3rd+ needs 4% (targets + consistency reset each payout). Trustpilot 4.8 (4.1k).

BLUE GUARDIAN (Forex/Futures), coupon MARKET, 40% OFF everything. Over $25M paid out, 100k+ active traders, 24h payout guarantee (or they pay you $1,000 extra). Two markets. FUTURES (4 models, 25K-150K): STANDARD 25K $92.40 (was $154), 50K $125.40 ($209), 100K $198 ($330), 150K $254.40 ($424) - target $6,000, 8 minis, no consistency on challenge and 40% once funded, daily limit $2,000 soft breach, drawdown $3,500, split 90/10, payout cap $3,000 on the first then $3,500. EXPRESS (50K/100K/150K only) 50K $106.80 (was $178), 100K $169.20 ($282), 150K $231.60 ($386) - same target and drawdown, but 40% consistency on the challenge and none once funded, daily payout cap $2,200, min $500/day cadence. RESERVE 25K $66 (was $110), 50K $92.40 ($154), 100K $148.80 ($248), 150K $277.20 ($462) - NO daily loss limit in any phase, 50% consistency on challenge and none funded, payout cap $2,500, no buffer. DIRECT 25K $184.20 (was $307), 50K $296.40 ($494), 100K $395.40 ($659), 150K $494.40 ($824) - instant, no evaluation, no daily limit, drawdown $3,500, stepped consistency 20% first payout / 25% second / 30% third onward, target $6,000 first payout then $3,500. CFD (2 models today), prices with coupon: INSTANT 5K $54 (was $91), 10K $75 ($125), 25K $156 ($260), 50K $243 ($405), 100K $467 ($778), 200K $716 ($1,194), 300K $1,284 ($2,140), 400K $1,650 ($2,751) (no evaluation, up to 90% split, fixed trailing drawdown $6,000, daily limit $3,000, leverage up to 1:30, no news trading) and 1 STEP 5K $30 (was $50), 10K $49 ($82), 25K $100 ($166), 50K $150 ($251), 100K $298 ($497), 200K $552 ($920) (single phase, $10,000 target, trailing drawdown $6,000, daily $4,000, leverage 1:100 on challenge and 1:50 funded). NOTE: the 2 Step Standard, 2 Step Pro and 3 Step CFD models were DISCONTINUED - do not offer them. Payouts via Rise or crypto. All sales final, no refunds once credentials are sent; a chargeback suspends the account. Trustpilot 3.8 (683).

AQUA FUTURES / AquaFunded (Futures), coupon AQUA, 60% OFF. Profit split 90%, upgradeable to 100% with a paid add-on at checkout. Platforms: Tradovate and DeepCharts (Volumetrica). 2 models. ONE STEP (evaluation, ONE-TIME fee, no activation fee) has 3 types. Beginner (EOD drawdown, 40% consistency, weekly payouts): 25K $50 (was $125) target 6% = $1,500, 1 contract, daily loss $600, max DD $1,000, reset $39; 50K $65 (was $163) target $3,000, 3 contracts, daily $1,250, DD $2,500, reset $55; 100K $125 (was $312) target $6,000, 6 contracts, daily $2,500, DD $3,500; 150K $185 (was $462) target $9,000, 9 contracts, daily $3,750, DD $5,000. Standard (NO daily loss limit, more contracts): 25K $70 (was $175) target 5% = $1,250, 2 contracts, DD $1,000; 50K $80 (was $200) target 6% = $3,000, 4 contracts, DD $2,000, reset $69; 100K $130 (was $325) target 6% = $6,000, 6 contracts, DD $3,500, reset $119; 150K $220 (was $550) target $9,000, 10 contracts, DD $5,000, reset $199. Note the target is 5% ONLY on the 25K Standard - the bigger Standard sizes are 6%. Flex (prices only, confirm the rules at checkout before promising): 50K $80 (was $200), 100K $130 (was $325), 150K $240 (was $600). INSTANT (no evaluation, capital released immediately): Standard type 25K $166 (was $415), 50K $246 (was $615), 100K $306 (was $765), no fixed profit target, daily limit and DD in percent (2.5% and 3-4%), EOD; Pro type (trailing drawdown, no daily loss limit) 25K $149 (was $372), 50K $229 (was $572), 100K $269 (was $672). Payouts: first one 14 days after your first trade on the funded account, then 14 days after the first trade following each payout. 24 business hour guarantee or they credit you $1,000 extra. $100 minimum. Under $1,000 paid in crypto (network fees apply); $1,000+ via Rise with a flat $35 fee, bank transfer or crypto. Accounts 200K+ have the first two payouts capped at $10,000 each, then uncapped. Trustpilot 3.2 (157).

BLUEBERRY FUTURES (Futures), coupon MARKET-7652C, 60% OFF. 90% split. Elite program. Newer firm with few reviews (5).

ALPHA FUTURES (Futures), coupon MARKETS026158, 25% OFF. 90% split (90% of every payout request). Single-phase evaluation, up to $750K simulated. Part of Alpha Group. 3 account types. ZERO (monthly subscription, NO consistency rule): 25K $59.25/mo (was $79), 50K $89.25 ($119), 100K $179.25 ($239). Targets $1,500/$3,000/$6,000. Max contracts 1/3/6. Max DD $1,000/$2,000/$3,000. Daily loss guard $500/$1,000/$2,000. Resets $45/$71/$142. ADVANCED (monthly, 40% consistency, NO daily loss guard, no 25K option): 50K $156.75/mo (was $209), 100K $261.75 ($349), 150K $366.75 ($489). Targets $4,000/$8,000/$12,000. Contracts 5/10/15. Max DD $1,750/$3,500/$5,250. Resets $123/$207/$272. DIRECT (instant funding, ONE-TIME payment, 20% consistency): 25K $261.75 (was $349), 50K $389.25 ($519), 100K $516.75 ($689), 150K $644.25 ($859). Payout target $1,500 first then $1,000 after (scales to $9,000/$6,000 on 150K). Max DD $1,000-$4,500. Daily loss $500-$3,000. Contracts 2/4/6/10. Payout cap $1,000-$3,000. No scaling plan. Payouts: Zero/Advanced up to 4x per month after 5 winning days of $200+ profit (not consecutive), withdraw up to 50% of profit per request; Direct has NO winning-day requirement, uses withdrawal profit target instead. Processed in 48 business hours. Methods: ACH, Wire, SWIFT, Wise, Rise. Full refund if KYC fails. Trustpilot 4.9 (4.6k).

FUTURES ELITE / FE (Futures), NO COUPON CODE NEEDED - discount applies automatically via our link: Elite & Prime 20% OFF, Instant 30% OFF. Futures only. Platforms: Tradovate, NinjaTrader, Quantower, ATAS, Volumetrica, DeepDom, DeepCharts. Stack up to $1.5M across accounts (10x 150K Prime = 10th account free; 5x 50K Elite = package discount). 3 plans. ELITE (2-phase evaluation, 90% profit split, EOD drawdown, NO daily loss limit, NO consistency rule once funded, NO activation fee): 50K $103.20 (was $129), 100K $183.20 ($229), 150K $263.20 ($329). Targets $3,000/$6,000/$9,000. Max loss $2,000/$3,000/$4,500. Resets $79/$129/$169. PRIME (single-phase, cheapest way in, Trailing Equity drawdown, no daily limit, 1 min trading day, no consistency): 50K $79.20 (was $99), 100K $151.20 ($189), 150K $223.20 ($279). Same targets and max loss as Elite. Resets $69/$109/$179. INSTANT (direct funding, no evaluation, 80% split, EOD drawdown, 10 min trading days, 20% consistency): 50K $244.30 (was $349), 100K $328.30 ($469), 150K $398.30 ($569). Targets $2,000/$3,500/$7,000. Max loss $1,000/$1,800/$3,000. Payout cap $800/$1,500/$2,500, min 1 day between payouts, no buffer, no activation fee. Payouts via Rise (riseworks.io): 100+ crypto or 90 fiat currencies in 190+ countries, bank 1-3 days, crypto usually hours. All sales final once credentials are issued. Trustpilot 4.6 (297).

FUNDED FUTURES FAMILY / FFF (Futures), coupon MARKET. 90% split (first $10K is 100%). Platforms: WealthCharts, Tradovate. Key differentiators: ZERO activation fee on EVERY plan (Prime, Premier Plus, Velocity, S2F) and EVERY account size (25K/50K/100K/150K) — this is a HUGE selling point: most firms (Apex, Bulenox, etc.) charge a separate activation/reset fee to unlock or keep the funded account, but FFF NEVER charges one, at any size, in evaluation or when funded. If a user asks about activation fees or hidden/extra costs, lead with this. Also no Daily Loss Limit on Prime, funded account available next day, payout guaranteed in 24h (avg ~2h), up to 5 sim-funded accounts (or 1 live). Discounts with MARKET vary by plan: Velocity 80% off, Premier Plus & Prime 40% off (first 5 uses, then 30%), S2F has NO active discount right now. Most eval plans are MONTHLY subscriptions (recurring during the eval) except S2F which is one-time. 4 plan families (min days differ, be exact):
- VELOCITY (Intraday Trailing drawdown, MONTHLY, best discount 80% off): min 3 trading days, 40% consistency in eval. ONLY 3 sizes (NO 150K): 25K $16/mo (was $79), 50K $25/mo ($125), 100K $45/mo ($225). Targets: 25K $2,500 / 50K $4,000 / 100K $7,000. Max DD (intraday trailing): 25K $1,250 / 50K $2,250 / 100K $3,250. Funded keeps the same intraday trailing DD with no buffer (more demanding).
- PREMIER PLUS (choose EOD or Intraday drawdown, MONTHLY, min 1 trading day, no consistency in eval):
  - Premier Plus EOD: 25K $72/mo (was $119), 50K $96/mo ($159), 100K $150/mo ($249), 150K $276/mo ($459). Targets: 25K $1,500 / 50K $3,000 / 100K $6,000 / 150K $9,000. Max DD EOD: 25K $750 / 50K $1,500 / 100K $2,500 / 150K $4,000.
  - Premier Plus Intraday: 25K $54/mo (was $89), 50K $72/mo ($119), 100K $114/mo ($189), 150K $156/mo ($259). Same targets. Max DD intraday: 25K $1,000 / 50K $2,000 / 100K $3,000 / 150K $4,500.
- PRIME (End-of-Day drawdown ONLY, MONTHLY, min 1 trading day, no consistency in eval, funded has NO consistency + 5 payout days): 25K $78/mo (was $129), 50K $108/mo ($179), 100K $168/mo ($279), 150K $219/mo ($365). Targets: 25K $1,250 / 50K $3,000 / 100K $6,000 / 150K $9,000. Max DD EOD: 25K $1,000 / 50K $2,000 / 100K $3,000 / 150K $4,500. Eval reset: 25K $115 / 50K $159 / 100K $249 / 150K $335.
- S2F STRAIGHT TO FUNDED (EOD drawdown, ONE-TIME fee not monthly, NO active discount right now): min 7 payout days, 25% consistency, skips the eval phase (funded directly), up to 5 accounts. One-time price (full, no coupon discount): 25K $329, 50K $469, 100K $629, 150K $734. Max DD EOD: 25K $1,000 / 50K $2,000 / 100K $3,000 / 150K $4,500.
FFF eval has NO time limit to pass (unlike Apex/Bulenox); but after passing you have 7 days to activate the funded account (KYC 24-48h, then click Activate in dashboard) or the pass expires. Funded drawdown difference (important): PRIME/PREMIER funded switch to End-of-Day drawdown WITH a buffer that locks the drawdown once you hit a profit threshold (more protection); VELOCITY funded keeps the SAME intraday trailing drawdown as the eval with NO buffer lock (more demanding, moves in real time with open profits). Velocity funded payout rules: $6,000 target per payout cycle, min 3 winning days ($200+ each), 40% lifetime consistency, max $2,250 per payout ($1,500 with the Daily Payout add-on that removes the min-days + consistency).
Trustpilot 4.7 (1.9k).

VOLUMEFILTER INDICATOR (this is a flagship offering, know it cold, mention it whenever a user asks about NinjaTrader/charting/indicators/volume analysis):
- FREE indicator for NinjaTrader 8, no Loyalty unlock needed, anyone can grab it.
- Paints volume bars in 3 colors: GREEN (≥ 1.5x average = real aggression), GRAY (within normal = market breathing), RED (below average = no fuel).
- Lead magnet: user enters email on the LP, gets the .zip + step-by-step guide on the same page.
- LP URL: marketscoupons.com/volumefilter (PT default), available in 8 languages with /en/, /es/, /it/, /fr/, /de/, /ar/, /id/ prefixes.
- Install: 90 seconds, 2 clicks. Open NinjaTrader 8 → Tools → Import → NinjaScript Add-On → select the .zip → done. Fallback: F11 NinjaScript Editor → F5 compile.
- Bilingual PT/EN (user picks language in NinjaTrader config).
- The 5 trading patterns it reveals (explain these clearly if user asks):
  1) BREAKOUT confirmation: green bar on the break candle = real conviction. No green = stops only, trap.
  2) TREND EXHAUSTION: 3+ red bars in a row while price still going = divergence, fuel drying.
  3) CLIMAX volume: green bar 3x+ above average after long move = often the turning point, NOT continuation.
  4) INSTITUTIONAL ABSORPTION: green bar + small candle/doji in range = someone big absorbing liquidity, strong reversal coming.
  5) DEAD DAY: 30+ bars mostly gray/red = no participation, don't trade. Discipline pattern.
- Settings by style (Period x Threshold): Scalper 1min 14/1.3x, Day trader 5min 20/1.5x, Day trader 15min 20/1.5x, Intraday swing 1h 14/1.5x, Daily swing 1d 10/1.8x. Defaults: Period 20, HighThreshold 1.5x.
- Valid until 31/12/2026 (v1). After that the indicator keeps running but shows a renewal notice. v2 (paid, more features) will come, v1 users get priority.
- Works on any instrument with real volume: NQ, ES, CL, GC, mini-índice (WIN/WDO), forex, stocks, crypto.
- Allowed on ALL prop firms that accept NinjaTrader (Apex, Bulenox, Earn2Trade, TradeDay, FundedNext via NT, etc).
- Reviews on the LP from real users (star ratings + comments).
- Sell it as: "the first of a series of pro indicators for our VIP program, this one's free to test the quality".

SITE FEATURES, you know these inside out. When someone asks about a feature, SELL IT like a product you're proud of:

- Home: landing page with the best active promos, top coupons, daily market snapshot.
- Firms: all 18 firms with full specs. Filter by futures/forex, coupon, drawdown type, platform. Detail overlay with checkout flow built in.
- Offers: best active promos sorted by discount, fastest path to a coupon.
- Coupons LP (marketscoupons.com/coupons): focused conversion landing page, top 3 firms (Apex, Bulenox, FundedNext) with interactive pills for account type/size and live pricing. Great for mobile, that's where the IG bio points.
- Comparator: pick 2-4 firms, compare side-by-side. Split, drawdown, target, platforms, prices, perks.
- Quiz: 6 questions, 30 seconds, returns the best firm for your style and budget.
- Position Size Calculator: account size + risk % + stop distance → exact contract/lot size.
- Economic Calendar: high-impact US events (CPI, NFP, FOMC, PPI) with forecast/previous/actual. Plan your week.
- Gamma Exposure (GEX): SPX/NDX dealer gamma positioning, key strikes, flip levels. Use it for support/resistance most retail can't see.
- Daily Analysis: ES, NQ, GC, CL every morning. Macro context, key levels, bull/bear scenarios with targets, VIX, market phase. Free, updated daily.
- Indicators: hub at /indicators. VolumeFilter is the headliner, free, NinjaTrader 8 (see VolumeFilter block above). More PRO indicators coming for VIP.
- Heatmap: S&P 500 sector + single-stock heatmap colored by % change.
- Blog: articles on prop firm news, promo breakdowns, strategy guides. Weekly.
- Guides: from beginner to advanced. Evaluations, drawdown types, scaling, payouts, psychology.
- Awards: monthly ranking of top firms by category.
- Loyalty Program: buy from ANY firm using our coupons, send the receipt in the Loyalty tab. With 1 approved purchase you unlock the VIP Live Room, Daily Analysis and Gamma Exposure (GEX). Free. NOTE: VolumeFilter is NOT a Loyalty unlock, it's free for everyone, separate channel.
- Live Room: VIP exclusive space for Loyalty members. Market context, key levels, macro reads.
- Telegram: t.me/marketcouponss, exclusive coupons and promo alerts.
- Login/Account: free signup, favorite firms, track loyalty progress.

BEHAVIOR:
- If asked "which firm is best?", don't dodge, recommend based on profile (futures vs forex, budget, style) in 2-3 lines.
- Always drop the coupon when mentioning a firm.
- If asked "how does X work?" where X is a site feature, explain in 2-3 lines then point to the tab.
- Say "não sei" or "I don't know" when uncertain, suggest the relevant tab.
- Respond in the user's language (Portuguese, English, Spanish, Italian, French, German, Arabic).`;

// ===== IG WEBHOOK (auto-reply DM) =====
// Verification (GET): Meta envia hub.verify_token, retornamos hub.challenge.
// Event (POST): comentário em post nosso. Match keyword → DM via Graph API.
async function handleIgWebhook(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token && token === process.env.META_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  const PAGE_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
  if (!PAGE_TOKEN) return res.status(503).json({ error: 'Bot disabled (no token)' });

  // TODO(sec #8): validar x-hub-signature-256 = HMAC-SHA256(rawBody, META_APP_SECRET).
  // Exige body CRU (bytes exatos), o que requer refatorar o body-parser deste handler
  // monolitico (Max chat/crons/Twitter/IG usam req.body parseado). Fazer como mudanca
  // focada + testada, nao no automatico. Ate la: rate-limit 1 DM/user/24h + opt-out atenuam.

  // Meta envia entries. Formato pode variar (FB Page changes[] vs IG Login direct messaging[])
  const entries = Array.isArray(body.entry) ? body.entry : [];
  const results = [];
  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const ch of changes) {
      if (ch.field !== 'comments') continue;
      const c = ch.value || {};
      const commentText = (c.text || '').trim();
      const commentId = c.id || '';
      const fromUser = c.from?.id || '';
      const postId = c.media?.id || '';
      if (!commentText || !fromUser || !commentId) continue;

      try {
        const r = await processIgComment({ commentText, commentId, fromUser, postId, PAGE_TOKEN });
        results.push(r);
      } catch (e) {
        results.push({ error: e.message });
      }
    }
  }
  return res.status(200).json({ processed: results.length, results });
}

async function processIgComment({ commentText, commentId, fromUser, postId, PAGE_TOKEN }) {
  // 1) Opt-out check (palavra STOP = registrar e parar)
  if (/\bstop\b|\bparar\b/i.test(commentText)) {
    await fetch(`${SUPABASE_URL}/rest/v1/ig_opt_outs`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ ig_user_id: fromUser, reason: 'user_stop_keyword' })
    }).catch(()=>{});
    return { user: fromUser, status: 'opted_out' };
  }

  // 2) Já opted-out? skip
  const optResp = await fetch(`${SUPABASE_URL}/rest/v1/ig_opt_outs?ig_user_id=eq.${encodeURIComponent(fromUser)}&select=ig_user_id`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const optRows = await optResp.json();
  if (Array.isArray(optRows) && optRows.length) return { user: fromUser, status: 'previously_opted_out' };

  // 3) Rate limit: máximo 1 DM por user a cada 24h
  const since = new Date(Date.now() - 24*60*60*1000).toISOString();
  const recentResp = await fetch(`${SUPABASE_URL}/rest/v1/ig_dm_log?ig_user_id=eq.${encodeURIComponent(fromUser)}&sent_at=gte.${since}&select=id&limit=1`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const recent = await recentResp.json();
  if (Array.isArray(recent) && recent.length) return { user: fromUser, status: 'rate_limited_24h' };

  // 4) Match keyword
  const repliesResp = await fetch(`${SUPABASE_URL}/rest/v1/ig_auto_replies?enabled=eq.true&select=*`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const replies = await repliesResp.json();
  if (!Array.isArray(replies) || !replies.length) return { user: fromUser, status: 'no_keywords_configured' };

  const lower = commentText.toLowerCase();
  const matched = replies.find(r => {
    if (r.post_id && r.post_id !== postId) return false;
    const kw = (r.keyword || '').toLowerCase();
    if (!kw) return false;
    if (r.match_mode === 'exact') return lower.trim() === kw;
    if (r.match_mode === 'word_boundary') return new RegExp(`\\b${kw}\\b`, 'i').test(commentText);
    return lower.includes(kw);
  });
  if (!matched) return { user: fromUser, status: 'no_match' };

  // 5) Escolher template aleatório
  const templates = Array.isArray(matched.reply_templates) ? matched.reply_templates : [];
  if (!templates.length) return { user: fromUser, status: 'no_templates' };
  const idx = Math.floor(Math.random() * templates.length);
  const msg = String(templates[idx]).replace(/\{link\}/g, matched.reply_link || '');

  // 6) Send DM via Meta Graph API
  const sendUrl = `https://graph.facebook.com/v21.0/me/messages?access_token=${encodeURIComponent(PAGE_TOKEN)}`;
  const sendBody = {
    recipient: { comment_id: commentId },  // Private Replies: responde via comment_id, abre janela 24h
    message: { text: msg }
  };
  const sendResp = await fetch(sendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sendBody)
  });
  const sendData = await sendResp.json().catch(() => ({}));
  const sentOk = sendResp.ok && !sendData.error;

  // 7) Log
  await fetch(`${SUPABASE_URL}/rest/v1/ig_dm_log`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      comment_id: commentId,
      ig_user_id: fromUser,
      post_id: postId || null,
      keyword_matched: matched.keyword,
      reply_id: matched.id,
      template_used: idx,
      dm_status: sentOk ? 'sent' : 'failed',
      meta_response: sendData
    })
  }).catch(()=>{});

  // 8) Alerta Telegram em erro
  if (!sentOk && process.env.TELEGRAM_BOT_TOKEN && process.env.TG_ADMIN_CHAT_ID) {
    fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TG_ADMIN_CHAT_ID,
        text: `🚨 IG bot falhou\nkeyword: ${matched.keyword}\nuser: ${fromUser}\nerror: ${JSON.stringify(sendData).slice(0,500)}`
      })
    }).catch(()=>{});
  }

  return { user: fromUser, status: sentOk ? 'sent' : 'failed', keyword: matched.keyword };
}

// ===== X (Twitter) auto-post de análise diária =====
// GET ?action=candles&symbol=^GSPC&interval=5m&range=1d — proxy do Yahoo Finance (sem CORS, sem key)
async function handleCandles(req, res) {
  const sym = String(req.query?.symbol || '^GSPC').slice(0, 14);
  const interval = String(req.query?.interval || '5m').slice(0, 5);
  const range = String(req.query?.range || '1d').slice(0, 5);
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${interval}&range=${range}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const d = await r.json();
    const r0 = d?.chart?.result?.[0];
    if (!r0) return res.status(502).json({ error: 'no_data' });
    const ts = r0.timestamp || [];
    const q = r0.indicators?.quote?.[0] || {};
    const candles = [];
    for (let i = 0; i < ts.length; i++) {
      const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
      if (o == null || h == null || l == null || c == null) continue;
      candles.push({ time: ts[i], open: +o.toFixed(2), high: +h.toFixed(2), low: +l.toFixed(2), close: +c.toFixed(2) });
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=120');
    return res.status(200).json({ symbol: sym, price: r0.meta?.regularMarketPrice, prevClose: r0.meta?.previousClose, candles });
  } catch (e) { return res.status(502).json({ error: 'yahoo_fail', detail: String(e.message).slice(0, 120) }); }
}

// POST ?action=x_cleanup&secret=... — apaga os tweets recentes da conta (limpa thread incompleta)
async function handleXCleanup(req, res) {
  const secret = req.query?.secret || req.headers['x-cron-secret'];
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) return res.status(403).json({ error: 'forbidden' });
  const keys = { apiKey: process.env.X_API_KEY, apiSecret: process.env.X_API_SECRET, accessToken: process.env.X_ACCESS_TOKEN, accessSecret: process.env.X_ACCESS_SECRET };
  if (!keys.apiKey || !keys.accessToken) return res.status(503).json({ error: 'no_x_token' });
  // 1) user id
  const meUrl = 'https://api.twitter.com/2/users/me';
  const meR = await fetch(meUrl, { headers: { Authorization: oauth1Header('GET', meUrl, keys) } });
  const me = await meR.json().catch(() => ({}));
  const uid = me?.data?.id;
  if (!uid) return res.status(502).json({ error: 'no_user', resp: me });
  // 2) tweets recentes (default ~10, sem query params pra manter OAuth1 simples)
  const tlUrl = `https://api.twitter.com/2/users/${uid}/tweets`;
  const tlR = await fetch(tlUrl, { headers: { Authorization: oauth1Header('GET', tlUrl, keys) } });
  const tl = await tlR.json().catch(() => ({}));
  const ids = (tl?.data || []).map(t => t.id);
  const limit = Math.min(ids.length, parseInt(req.query?.max || '20', 10));
  const deleted = [];
  for (const id of ids.slice(0, limit)) {
    const dUrl = `https://api.twitter.com/2/tweets/${id}`;
    const dR = await fetch(dUrl, { method: 'DELETE', headers: { Authorization: oauth1Header('DELETE', dUrl, keys) } });
    const dj = await dR.json().catch(() => ({}));
    deleted.push({ id, ok: dR.ok, deleted: dj?.data?.deleted });
    await new Promise(r => setTimeout(r, 1500));
  }
  return res.status(200).json({ uid, found: ids.length, deleted });
}

// OAuth1 header que TAMBÉM assina query params (necessário p/ tweet.fields).
// Não mexe no oauth1Header simples (usado nos POSTs sem query).
function oauth1HeaderQ(method, baseUrl, queryParams, keys) {
  const pe = (s) => encodeURIComponent(s).replace(/[!*'()]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  const oauth = {
    oauth_consumer_key: keys.apiKey,
    oauth_nonce: _crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: keys.accessToken,
    oauth_version: '1.0',
  };
  const all = { ...oauth, ...queryParams };
  const paramStr = Object.keys(all).sort().map(k => `${pe(k)}=${pe(all[k])}`).join('&');
  const baseStr = [method.toUpperCase(), pe(baseUrl), pe(paramStr)].join('&');
  const signingKey = `${pe(keys.apiSecret)}&${pe(keys.accessSecret)}`;
  const signature = _crypto.createHmac('sha1', signingKey).update(baseStr).digest('base64');
  const hp = { ...oauth, oauth_signature: signature };
  return 'OAuth ' + Object.keys(hp).sort().map(k => `${pe(k)}="${pe(hp[k])}"`).join(', ');
}

// GET ?action=x_stats&secret=... — lê NOSSOS tweets recentes + public_metrics
// (impressions/likes/reposts/replies). Read-only, protegido por CRON_SECRET.
async function handleXStats(req, res) {
  const secret = req.query?.secret || req.headers['x-cron-secret'];
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) return res.status(403).json({ error: 'forbidden' });
  const keys = { apiKey: process.env.X_API_KEY, apiSecret: process.env.X_API_SECRET, accessToken: process.env.X_ACCESS_TOKEN, accessSecret: process.env.X_ACCESS_SECRET };
  if (!keys.apiKey || !keys.accessToken) return res.status(503).json({ error: 'no_x_token' });
  // 1) user id
  const meUrl = 'https://api.twitter.com/2/users/me';
  const meR = await fetch(meUrl, { headers: { Authorization: oauth1Header('GET', meUrl, keys) } });
  const me = await meR.json().catch(() => ({}));
  const uid = me?.data?.id;
  if (!uid) return res.status(502).json({ error: 'no_user', resp: me });
  // 2) tweets recentes com métricas (query params assinados)
  const base = `https://api.twitter.com/2/users/${uid}/tweets`;
  const max = Math.min(parseInt(req.query?.max || '20', 10), 100);
  const qp = { 'max_results': String(Math.max(5, max)), 'tweet.fields': 'public_metrics,created_at', 'exclude': 'retweets,replies' };
  const qs = Object.keys(qp).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(qp[k])}`).join('&');
  const tlR = await fetch(`${base}?${qs}`, { headers: { Authorization: oauth1HeaderQ('GET', base, qp, keys) } });
  const tl = await tlR.json().catch(() => ({}));
  if (!tlR.ok) return res.status(tlR.status).json({ error: 'tl_fail', resp: tl });
  const tweets = (tl?.data || []).map(t => ({
    id: t.id, created_at: t.created_at, text: t.text,
    impressions: t.public_metrics?.impression_count ?? null,
    likes: t.public_metrics?.like_count ?? 0,
    reposts: t.public_metrics?.retweet_count ?? 0,
    replies: t.public_metrics?.reply_count ?? 0,
    quotes: t.public_metrics?.quote_count ?? 0,
    bookmarks: t.public_metrics?.bookmark_count ?? 0,
  }));
  const n = tweets.length || 1;
  const avg = (f) => Math.round(tweets.reduce((s, t) => s + (t[f] || 0), 0) / n);
  return res.status(200).json({
    account: me?.data?.username, uid, count: tweets.length,
    averages: { impressions: avg('impressions'), likes: avg('likes'), reposts: avg('reposts'), replies: avg('replies') },
    tweets,
  });
}

// ===== REPLY-JACK: cresce a conta entrando na conversa dos grandes =====
// Lê a timeline de uma conta grande via endpoint público de sindicância do X
// (keyless), pega o melhor tweet recente e gera uma resposta com valor (sem
// link/cupom/jargão) — o jeito que conta pequena pega audiência emprestada.
const RJ_TARGETS = ['KobeissiLetter', 'unusual_whales', 'DeItaone', 'Mr_Derivatives'];
const RJ_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

async function fetchXTimelineFree(handle) {
  const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(handle)}?showReplies=false`;
  let r, delay = 4000;
  for (let attempt = 0; attempt < 4; attempt++) {
    r = await fetch(url, { headers: { 'User-Agent': RJ_UA, 'Accept-Language': 'en-US,en;q=0.9' } });
    if (r.ok) break;
    if (r.status === 429 && attempt < 3) { await new Promise(x => setTimeout(x, delay)); delay = Math.min(delay * 2, 20000); continue; }
    throw new Error('synd_' + r.status);
  }
  const html = await r.text();
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
  if (!m) throw new Error('no_next_data');
  const data = JSON.parse(m[1]);
  const out = [];
  const walk = (o) => {
    if (o && typeof o === 'object') {
      if (o.full_text && o.favorite_count != null) {
        const u = o.user || {};
        out.push({
          id: o.id_str || o.id, text: o.full_text, screen: u.screen_name || handle,
          likes: o.favorite_count || 0, reposts: o.retweet_count || 0, replies: o.reply_count || 0,
          created_at: o.created_at, isRT: /^RT @/.test(o.full_text || ''),
        });
      }
      for (const k in o) walk(o[k]);
    } else if (Array.isArray(o)) { o.forEach(walk); }
  };
  walk(data);
  return out;
}

function rjReplySystem() {
  return `You are Max, a sharp market analyst for Markets Coupons, REPLYING on X to a large account to grow by adding value.
Read the TWEET and write ONE reply of 1-2 COMPLETE sentences (140-220 chars) with a genuinely sharp, useful take — your read on what it means for traders.
RULES: finish your thought (never end mid-sentence). Plain English — translate any jargon (no "Redistribution", "gamma", "call wall"; say what it means). No greeting, NO link, NO coupon, NO self-promo, no hashtags, no emoji. Sound like a smart human trader jumping into the conversation, not a brand. If you cite a number, use ONLY the market data provided (if any). Never buy/sell/signal/guarantee. Commentary, not advice.
OUTPUT: only the reply text.`;
}

async function genReplyJack(tweet, marketBlock) {
  const sys = rjReplySystem();
  const user = `TWEET by @${tweet.screen}:\n"${tweet.text.slice(0, 400)}"\n\n${marketBlock ? 'Market data you MAY reference (only these numbers):\n' + marketBlock + '\n\n' : ''}Write the reply.`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const out = await callGemini(sys, user, { maxTokens: 1024, temp: attempt === 0 ? 0.8 : 0.6 });
    if (!out) continue;
    let reply = out.trim().replace(/^["'`]+|["'`]+$/g, '').split(/\n={3,}\n?/)[0].trim().slice(0, 270);
    if (maxComplianceBlocked(reply)) continue;
    if (maxJargonBlocked(reply) && attempt === 0) continue;  // 1ª tentativa exige zero jargão
    if (/https?:\/\//i.test(reply)) reply = reply.replace(/https?:\/\/\S+/gi, '').trim(); // nunca link
    reply = trimToSentence(reply);  // nunca termina no meio da frase
    if (reply.length >= 15) return { reply, raw: out.slice(0, 300) };
  }
  return { reply: null };
}

// GET ?action=x_replyjack&dry=1 — preview · POST ?action=x_replyjack&secret=... — responde de verdade
async function handleXReplyJack(req, res) {
  const isPreview = req.method === 'GET' || req.query?.dry === '1';
  if (!isPreview) {
    const secret = req.query?.secret || req.headers['x-cron-secret'];
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) return res.status(403).json({ error: 'forbidden' });
  }
  // 1) coleta tweets recentes (últimos 2 dias) das contas-alvo, com espaçamento p/ rate limit
  const cutoff = Date.now() - 2 * 864e5;
  const targets = req.query?.target ? [req.query.target] : RJ_TARGETS;
  let candidates = [], errors = [];
  for (let i = 0; i < targets.length; i++) {
    if (i) await new Promise(r => setTimeout(r, 1500));
    try {
      const tw = await fetchXTimelineFree(targets[i]);
      for (const t of tw) {
        const ts = t.created_at ? Date.parse(t.created_at) : Date.now();
        if (t.isRT || (ts && ts < cutoff)) continue;
        t.score = t.likes + 2 * t.reposts + 3 * t.replies;
        candidates.push(t);
      }
    } catch (e) { errors.push(`${targets[i]}: ${e.message}`); }
  }
  if (!candidates.length) return res.status(502).json({ error: 'no_candidates', errors });
  // 2) melhor tweet (maior engajamento recente)
  candidates.sort((a, b) => b.score - a.score);
  const target = candidates[0];
  // 3) contexto de mercado opcional (níveis reais do dia, se houver)
  let marketBlock = '';
  try {
    const lr = await fetch(`${SUPABASE_URL}/rest/v1/daily_analysis?select=date&order=date.desc&limit=1`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    const ld = await lr.json();
    if (Array.isArray(ld) && ld.length) {
      const ar = await fetch(`${SUPABASE_URL}/rest/v1/daily_analysis?date=eq.${ld[0].date}&select=*`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
      const rows = await ar.json();
      if (Array.isArray(rows) && rows.length) { const g = null; marketBlock = buildMaxData(rows, g, ld[0].date, 'en').block; }
    }
  } catch (e) { marketBlock = ''; }
  // 4) gera a resposta
  const { reply, raw } = await genReplyJack(target, marketBlock);
  if (!reply) return res.status(502).json({ error: 'no_reply', target });

  if (isPreview) {
    return res.status(200).json({ preview: true, target: { handle: '@' + target.screen, id: target.id, score: target.score, tweet: target.text.slice(0, 200) }, reply, chars: reply.length, candidates_considered: candidates.length, errors });
  }
  // 5) QUOTE-TWEET do post do grande (reply é bloqueado por contas que restringem
  // respostas; quote não tem restrição + aparece na NOSSA timeline = melhor alcance)
  const xKeys = { apiKey: process.env.X_API_KEY, apiSecret: process.env.X_API_SECRET, accessToken: process.env.X_ACCESS_TOKEN, accessSecret: process.env.X_ACCESS_SECRET };
  if (!xKeys.apiKey || !xKeys.accessToken) return res.status(503).json({ error: 'no_x_token' });
  const purl = 'https://api.twitter.com/2/tweets';
  const postTweet = async (b) => {
    const tr = await fetch(purl, { method: 'POST', headers: { Authorization: oauth1Header('POST', purl, xKeys), 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
    return { ok: tr.ok, jr: await tr.json().catch(() => ({})) };
  };
  // tenta QUOTE; se o alvo restringe quote (403), cai pra post STANDALONE (take do hype)
  let mode = 'quote';
  let { ok, jr } = await postTweet({ text: reply, quote_tweet_id: String(target.id) });
  if (!ok || !jr?.data?.id) {
    mode = 'standalone';
    ({ ok, jr } = await postTweet({ text: reply }));
  }
  if (!ok || !jr?.data?.id) return res.status(502).json({ error: 'post_failed', response: jr });
  await fetch(`${SUPABASE_URL}/rest/v1/x_post_log`, { method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ post_type: 'jack_' + mode, thread_root_id: jr.data.id, status: 'sent', posted_content: { reply, target: '@' + target.screen, mode } }) }).catch(() => {});
  return res.status(200).json({ posted: jr.data.id, mode, inspired_by: '@' + target.screen, reply });
}

// POST ?action=x_post_text&secret=... { text } — posta um texto PRONTO (escrito
// pelo Claude, SEM Gemini). Passa pelas travas de compliance/jargão/tamanho.
// Opcional: quote_id (cita um tweet). É o caminho "eu escrevo, a rotina publica".
async function handleXPostText(req, res) {
  const isPreview = req.method === 'GET' || req.query?.dry === '1';
  if (!isPreview) {
    const secret = req.query?.secret || req.headers['x-cron-secret'];
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) return res.status(403).json({ error: 'forbidden' });
  }
  let text = (req.query?.text || req.body?.text || '').toString().replace(/\\n/g, '\n').trim();
  const quoteId = (req.query?.quote_id || req.body?.quote_id || '').toString().trim();
  if (!text) return res.status(400).json({ error: 'no_text' });
  if (text.length > 280) return res.status(400).json({ error: 'too_long', chars: text.length });
  const banned = maxComplianceBlocked(text);
  if (banned) return res.status(422).json({ error: 'compliance_block', term: banned });
  if (isPreview) return res.status(200).json({ preview: true, text, chars: text.length, jargon: maxJargonBlocked(text) || null });

  const xKeys = { apiKey: process.env.X_API_KEY, apiSecret: process.env.X_API_SECRET, accessToken: process.env.X_ACCESS_TOKEN, accessSecret: process.env.X_ACCESS_SECRET };
  if (!xKeys.apiKey || !xKeys.accessToken) return res.status(503).json({ error: 'no_x_token' });
  const purl = 'https://api.twitter.com/2/tweets';
  const body = { text };
  if (quoteId) body.quote_tweet_id = quoteId;
  const tr = await fetch(purl, { method: 'POST', headers: { Authorization: oauth1Header('POST', purl, xKeys), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const jr = await tr.json().catch(() => ({}));
  if (!tr.ok || !jr?.data?.id) return res.status(502).json({ error: 'post_failed', response: jr });
  await fetch(`${SUPABASE_URL}/rest/v1/x_post_log`, { method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ post_type: 'claude_text', thread_root_id: jr.data.id, status: 'sent', posted_content: { text } }) }).catch(() => {});
  return res.status(200).json({ posted: jr.data.id, text });
}

// GET ?action=x_daily&asset=ES&dry=1 — preview (não posta)
// POST ?action=x_daily&secret=... — posta de verdade (cron protected)
async function handleXDaily(req, res) {
  // test_auth=1: valida as credenciais X (GET users/me via OAuth1), SEM postar. Seguro.
  if (req.query?.test_auth === '1') {
    const keys = {
      apiKey: process.env.X_API_KEY, apiSecret: process.env.X_API_SECRET,
      accessToken: process.env.X_ACCESS_TOKEN, accessSecret: process.env.X_ACCESS_SECRET,
    };
    if (!keys.apiKey || !keys.apiSecret || !keys.accessToken || !keys.accessSecret) {
      return res.status(503).json({ ok: false, error: 'missing_keys', has: {
        X_API_KEY: !!keys.apiKey, X_API_SECRET: !!keys.apiSecret,
        X_ACCESS_TOKEN: !!keys.accessToken, X_ACCESS_SECRET: !!keys.accessSecret } });
    }
    const url = 'https://api.twitter.com/2/users/me';
    const r = await fetch(url, { headers: { Authorization: oauth1Header('GET', url, keys) } });
    const data = await r.json().catch(() => ({}));
    // diagnóstico: comprimento + tem espaço/quebra (sem expor valor)
    const diag = {};
    for (const [k,v] of Object.entries(keys)) {
      diag[k] = { len: (v||'').length, trimmed_len: (v||'').trim().length, first4: (v||'').slice(0,4), has_space: /\s/.test(v||'') };
    }
    return res.status(r.ok ? 200 : 401).json({ ok: r.ok, status: r.status, account: data?.data || data, key_diag: diag });
  }

  const isPreview = req.method === 'GET' || req.query?.dry === '1';
  if (!isPreview) {
    const secret = req.query?.secret || req.headers['x-cron-secret'];
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return res.status(403).json({ error: 'forbidden' });
    }
  }

  // Thread-guia diária: cobre os 4 ativos da data mais recente
  // Pega a data mais nova disponível e todos os ativos dela
  const latResp = await fetch(`${SUPABASE_URL}/rest/v1/daily_analysis?select=date&order=date.desc&limit=1`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const latRows = await latResp.json();
  if (!Array.isArray(latRows) || !latRows.length) return res.status(404).json({ error: 'no_analysis_yet' });
  const latestDate = latRows[0].date;

  const aResp = await fetch(`${SUPABASE_URL}/rest/v1/daily_analysis?date=eq.${latestDate}&select=*`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const rows = await aResp.json();
  if (!Array.isArray(rows) || !rows.length) return res.status(404).json({ error: 'no_analysis_yet' });

  // Ordena na sequência ES, NQ, GC, CL
  const ORDER = ['ES','NQ','GC','CL'];
  rows.sort((x,y) => ORDER.indexOf(x.asset) - ORDER.indexOf(y.asset));

  // GEX real estruturado (tabela gex_levels) pra ES e NQ — alimenta a thread GEX-cêntrica
  let gex = null;
  try {
    const gResp = await fetch(`${SUPABASE_URL}/rest/v1/gex_levels?date=eq.${latestDate}&ticker=in.(ES,NQ)&select=ticker,total_gex,zero_gamma,put_wall,call_wall,hvl`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const gRows = await gResp.json();
    if (Array.isArray(gRows) && gRows.length) { gex = {}; gRows.forEach(g => gex[g.ticker] = g); }
  } catch (e) { gex = null; }

  const lang = (req.query?.lang === 'pt') ? 'pt' : 'en';

  // ===== MODO POST ÚNICO (segment) — análise de MOMENTO, 1 post curto + chart, NÃO thread =====
  const segment = req.query?.segment;
  if (segment) {
    const r = await genMaxSinglePost(rows, gex, latestDate, lang, segment);
    // chart real (Yahoo + níveis do banco) pros segments de análise; cupom vai sem imagem
    const wantChart = segment !== 'coupon' && req.query?.nochart !== '1';
    const chartUrl = wantChart ? maxChartUrl(gex, latestDate, req.query?.chart_asset || 'ES') : null;

    if (isPreview) {
      if (req.query?.testrender === '2' && chartUrl) {
        try { const buf = await renderChartPng(chartUrl); res.setHeader('Content-Type', 'image/png'); res.setHeader('Cache-Control', 'no-store'); return res.status(200).send(buf); }
        catch (e) { return res.status(502).json({ error: e.message }); }
      }
      let render = null;
      if (req.query?.testrender === '1' && chartUrl) {
        try { const buf = await renderChartPng(chartUrl); render = { ok: true, bytes: buf.length }; }
        catch (e) { render = { ok: false, err: e.message }; }
      }
      return res.status(200).json({ segment, post: r.post, reason: r.reason, chars: r.post ? r.post.length : 0, chartUrl, render, preview: true });
    }
    if (!r.post) return res.status(502).json({ error: 'no_post', reason: r.reason });
    const xKeys = { apiKey: process.env.X_API_KEY, apiSecret: process.env.X_API_SECRET, accessToken: process.env.X_ACCESS_TOKEN, accessSecret: process.env.X_ACCESS_SECRET };
    if (!xKeys.apiKey || !xKeys.accessToken) return res.status(503).json({ error: 'no_x_token' });

    // gera imagem + upload (best-effort: se falhar, posta só texto, não bloqueia)
    let mediaId = null;
    if (chartUrl) {
      try { const buf = await renderChartPng(chartUrl); mediaId = await xUploadMedia(buf, xKeys); }
      catch (e) { console.error('[max] chart/media falhou, posta sem imagem:', e.message); }
    }

    const purl = 'https://api.twitter.com/2/tweets';
    const body = { text: r.post };
    if (mediaId) body.media = { media_ids: [mediaId] };
    const tr = await fetch(purl, { method: 'POST', headers: { Authorization: oauth1Header('POST', purl, xKeys), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const jr = await tr.json().catch(() => ({}));
    if (!tr.ok || !jr?.data?.id) return res.status(502).json({ error: 'x_post_failed', response: jr });
    await fetch(`${SUPABASE_URL}/rest/v1/x_post_log`, { method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ post_type: 'single_' + segment, thread_root_id: jr.data.id, status: 'sent', posted_content: { post: r.post, hasImage: !!mediaId } }) }).catch(() => {});
    return res.status(200).json({ segment, posted: jr.data.id, post: r.post, image: !!mediaId });
  }

  // Motor de VOZ (Gemini-com-trava) com fallback pro template determinístico
  const forceEngine = req.query?.engine;
  let thread = null, engine = 'template', aiReason = 'skipped', aiRaw = null, aiOver = 0;
  if (forceEngine !== 'template') {
    try {
      const ai = await genMaxThreadAI(rows, gex, latestDate, lang);
      aiReason = ai.reason; aiRaw = ai.raw || null; aiOver = ai.over || 0;
      if (ai.tweets && ai.tweets.length >= 6) { thread = ai.tweets; engine = 'ai'; }
    } catch (e) { aiReason = 'err:' + e.message; }
  }
  if (!thread) thread = buildXGuide(rows, latestDate, lang, gex);
  const igCaption = buildIGCaption(rows, latestDate);
  const asset = 'guide';

  if (isPreview) {
    return res.status(200).json({ asset, engine, ai_reason: aiReason, ai_over: aiOver, ai_raw: aiRaw, thread, igCaption, preview: true });
  }

  // Postar via OAuth 1.0a (X API v2 exige user context pra POST /tweets)
  const xKeys = {
    apiKey: process.env.X_API_KEY,
    apiSecret: process.env.X_API_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_SECRET,
  };
  if (!xKeys.apiKey || !xKeys.apiSecret || !xKeys.accessToken || !xKeys.accessSecret) {
    return res.status(503).json({ error: 'no_x_token' });
  }

  const tweetIds = [];
  let replyTo = null;
  let lastResponse = null;
  for (const text of thread) {
    const body = { text };
    if (replyTo) body.reply = { in_reply_to_tweet_id: replyTo };
    const url = 'https://api.twitter.com/2/tweets';
    const authHeader = oauth1Header('POST', url, xKeys);
    const tr = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    lastResponse = await tr.json().catch(()=>({}));
    if (!tr.ok || !lastResponse?.data?.id) {
      // log falha
      await fetch(`${SUPABASE_URL}/rest/v1/x_post_log`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_type:'daily_analysis', asset, status:'failed', x_response: lastResponse, posted_content: { thread, fail_at_tweet: tweetIds.length } })
      }).catch(()=>{});
      return res.status(502).json({ error: 'x_post_failed', failed_at: tweetIds.length, response: lastResponse });
    }
    const id = lastResponse.data.id;
    tweetIds.push(id);
    if (!replyTo) replyTo = id; // primeiro vira root
    else replyTo = id; // próximo replies pro último (mantém thread linear)
    // pequena pausa entre tweets pra evitar spam
    await new Promise(r => setTimeout(r, 800));
  }

  await fetch(`${SUPABASE_URL}/rest/v1/x_post_log`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_type:'daily_analysis', asset, thread_root_id: tweetIds[0], thread_tweet_ids: tweetIds, status:'sent', posted_content: { thread } })
  }).catch(()=>{});

  return res.status(200).json({ asset, posted: tweetIds, thread });
}

// ===== Thread-GUIA diária (robusta, multi-ativo, estilo desk de research) =====
// Compliant: macro, sentimento, fase de mercado, viés e zonas. SEM sinal (sem entry/target/stop).
function buildXGuide(rows, date, lang = 'en', gex = null) {
  const pt = lang === 'pt';
  const NAMES = pt
    ? { ES: 'S&P 500', NQ: 'Nasdaq 100', GC: 'Ouro', CL: 'Petróleo WTI' }
    : { ES: 'S&P 500', NQ: 'Nasdaq 100', GC: 'Gold', CL: 'Crude Oil' };
  const EN_NAMES = NAMES;
  const byId = {}; rows.forEach(r => byId[r.asset] = r);
  const es = byId.ES, nq = byId.NQ, gc = byId.GC, cl = byId.CL;

  const j = (obj) => (obj && typeof obj === 'object') ? (pt ? (obj.pt || obj.en) : (obj.en || obj.pt)) || '' : (typeof obj === 'string' ? obj : '');
  const firstSentence = (s, cap=160) => {
    s = String(s||'').replace(/\s+/g,' ').trim();
    let fs = s.split(/\.\s/)[0];
    if (fs.length > cap) {
      // corta na última palavra completa antes do cap (não no meio da palavra)
      fs = fs.slice(0, cap-1);
      const lastSpace = fs.lastIndexOf(' ');
      if (lastSpace > cap * 0.6) fs = fs.slice(0, lastSpace);
      return fs.replace(/[,;:\-\s]+$/,'') + '…';
    }
    return fs + (s.includes('. ') ? '.' : '');
  };
  const dot = (b) => { b=(b||'').toLowerCase(); return b.includes('bull')?'🟢':b.includes('bear')?'🔴':'⚪'; };
  const biasLbl = (b) => { b=(b||'').toLowerCase(); return b.includes('bull')?'Bullish':b.includes('bear')?'Bearish':'Neutral'; };
  const px = (r) => r?.last_price ? Number(r.last_price).toFixed(r.asset==='CL'?2:0) : '—';
  const chg = (r) => r?.change_pct!=null ? `${r.change_pct>0?'+':''}${Number(r.change_pct).toFixed(1)}%` : '';
  const zones = (r) => {
    const s=[r?.support_1,r?.support_2].filter(Boolean).join(' / ');
    const x=[r?.resistance_1,r?.resistance_2].filter(Boolean).join(' / ');
    const supL = pt ? 'Suporte' : 'Support';
    const resL = pt ? 'Resistencia' : 'Resistance';
    return [s&&`${supL} ${s}`, x&&`${resL} ${x}`].filter(Boolean).join(' - ');
  };

  // contexto macro REAL do dia (nunca inventa): detecta siglas de eventos tier-1 no campo events
  const macroHighlights = () => {
    const txt = rows.map(r => {
      const e = r.events;
      if (!e) return '';
      if (typeof e === 'object') return `${e.en||''} ${e.pt||''}`;
      return String(e);
    }).join(' ').toLowerCase();
    const found = [];
    const add = (cond, ptLabel, enLabel) => { if (cond && found.length < 2) found.push(pt?ptLabel:enLabel); };
    add(/fomc/.test(txt), 'FOMC', 'FOMC');
    add(/\bcpi\b/.test(txt), 'CPI', 'CPI');
    add(/\bpce\b/.test(txt), 'PCE', 'PCE');
    add(/non.?farm|payroll|\bnfp\b/.test(txt), 'payroll', 'NFP');
    add(/\bppi\b/.test(txt), 'PPI', 'PPI');
    add(/\becb\b|\bbce\b/.test(txt), 'decisão do BCE', 'ECB decision');
    add(/fed (rate|funds)|interest rate decision|taxa do fed/.test(txt), 'decisão do Fed', 'Fed decision');
    add(/\bgdp\b|\bpib\b/.test(txt), 'PIB', 'GDP');
    add(/retail sales|varejo/.test(txt), 'vendas no varejo', 'retail sales');
    add(/jobless|desemprego/.test(txt), 'seguro-desemprego', 'jobless claims');
    return found;
  };

  const tweets = [];
  const biasL = (b) => { b=(b||'').toLowerCase(); if (pt) return b.includes('bull')?'Alta':b.includes('bear')?'Baixa':'Neutro'; return b.includes('bull')?'Bullish':b.includes('bear')?'Bearish':'Neutral'; };
  const macro = macroHighlights();

  // ===== GEX (Gamma Exposure) — dado REAL estruturado da tabela gex_levels (passado via param) =====
  const esG = gex && gex.ES ? gex.ES : null;
  const nqG = gex && gex.NQ ? gex.NQ : null;
  const hasGex = !!(esG && nqG && esG.zero_gamma && nqG.zero_gamma);
  const regOf = (g) => g ? (parseFloat(g.total_gex) >= 0 ? 'pos' : 'neg') : null;
  const aboveZG = (r, g) => (r && g && r.last_price!=null && g.zero_gamma!=null) ? (Number(r.last_price) >= Number(g.zero_gamma)) : null;

  if (hasGex) {
    const esR = regOf(esG), nqR = regOf(nqG);
    const opp = esR !== nqR; // regimes opostos = hook de contraste
    const lblPos = pt ? 'GAMMA POSITIVO ✅' : 'POSITIVE GAMMA ✅';
    const lblNeg = pt ? 'GAMMA NEGATIVO ⚠️' : 'NEGATIVE GAMMA ⚠️';
    const lbl = (r) => r==='pos' ? lblPos : lblNeg;

    // ---- helpers de zona em linhas separadas (clareza) ----
    const supList = (r) => [r?.support_1, r?.support_2].filter(Boolean).join(' / ');
    const resList = (r) => [r?.resistance_1, r?.resistance_2].filter(Boolean).join(' / ');

    // 1) HOOK — explica o comportamento de cada índice já de cara (sem "dois mundos" abstrato)
    const behPt = (r) => r==='neg' ? 'negativo (estica os movimentos)' : 'positivo (segura o mercado num range)';
    const behEn = (r) => r==='neg' ? 'negative (stretches the moves)' : 'positive (pins the market in a range)';
    if (opp) {
      tweets.push((pt
        ? `🧵 Dois índices, dois comportamentos opostos hoje.\n\nES (S&P 500): gamma ${behPt(esR)}.\nNQ (Nasdaq): gamma ${behPt(nqR)}.\n\nNão importa a conta que você opera, isso muda seu plano hoje 👇`
        : `🧵 Two indices, opposite behavior today.\n\nES (S&P 500): gamma ${behEn(esR)}.\nNQ (Nasdaq): gamma ${behEn(nqR)}.\n\nWhatever account you trade, this changes your plan today 👇`).slice(0,280));
    } else {
      tweets.push((pt
        ? `🧵 ES e NQ no mesmo comportamento hoje: gamma ${esR==='neg'?'negativo':'positivo'}.\n\n${esR==='neg'?'Os grandes bancos amplificam os movimentos: dia que estica.':'Os grandes bancos seguram o mercado: dia preso num range.'}\n\nNão importa a conta que você opera, isso muda seu plano hoje 👇`
        : `🧵 ES and NQ in the same behavior today: ${esR==='neg'?'negative':'positive'} gamma.\n\n${esR==='neg'?'The big banks amplify the moves: a day that stretches.':'The big banks pin the market: a range-bound day.'}\n\nWhatever account you trade, this changes your plan today 👇`).slice(0,280));
    }

    // 2) PANORAMA — VIX explicado + correlação VIX×índices + macro real do dia
    const vixTxt2 = j(es?.vix_context);
    const vm = String(vixTxt2).match(/VIX\s*(?:at|em|:)?\s*([\d.]+)/i);
    const vixVal = vm ? parseFloat(vm[1]) : null;
    const vcm = String(vixTxt2).match(/\(([+-][\d.]+%)\)/);
    const vixChg = vcm ? vcm[1] : '';
    const vixUp = vixChg.startsWith('+'), vixDown = vixChg.startsWith('-');
    const vixAmt = vixChg ? vixChg.replace(/[+-]/, '') : '';
    if (vixVal != null) {
      const dirPt = vixChg ? `, ${vixUp?'subindo':'recuando'} ${vixAmt}` : '';
      const dirEn = vixChg ? `, ${vixUp?'up':'down'} ${vixAmt}` : '';
      const linePt = vixUp ? 'VIX subindo é sinal de mercado nervoso. Quando o medo sobe, os índices costumam cair junto.' : vixDown ? 'VIX recuando é sinal de alívio. Costuma dar fôlego pros índices.' : 'O VIX é o termômetro do medo do mercado.';
      const lineEn = vixUp ? 'A rising VIX means a nervous market. When fear climbs, the indices usually fall with it.' : vixDown ? 'A falling VIX means relief. It tends to give the indices room.' : 'The VIX is the market’s fear gauge.';
      const radarPt = macro.length ? `\n\nNo radar hoje: ${macro.join(' e ')}.` : '';
      const radarEn = macro.length ? `\n\nOn the radar today: ${macro.join(' and ')}.` : '';
      tweets.push((pt
        ? `🌐 Antes do gamma, o pano de fundo:\n\nO VIX (termômetro do medo) está em ${vixVal}${dirPt}.\n${linePt}${radarPt}`
        : `🌐 Before gamma, the backdrop:\n\nThe VIX (the fear gauge) sits at ${vixVal}${dirEn}.\n${lineEn}${radarEn}`).slice(0,280));
    }

    // 3) O QUE É GAMMA — explicação simples pro leigo
    tweets.push((pt
      ? `💡 O que é esse tal de gamma?\n\nÉ a posição dos grandes bancos no mercado de opções. Ela mostra se o dia tende a ter movimento forte ou travado:\n\n• Gamma negativo: os bancos amplificam. Os movimentos esticam.\n• Gamma positivo: os bancos seguram. O mercado fica preso num range.`
      : `💡 What even is this "gamma"?\n\nIt's where the big banks sit in the options market. It shows whether the day leans toward strong moves or stuck ones:\n\n• Negative gamma: banks amplify. Moves stretch.\n• Positive gamma: banks hold it. The market stays range-bound.`).slice(0,280));

    // 4) ES detalhe (cada termo técnico explicado na hora)
    const esAbove = aboveZG(es, esG);
    const esEmoji = esR==='neg' ? '📉' : '📈';
    const esTailPt = esR==='neg'
      ? (esAbove ? `Com o preço acima de ${esG.zero_gamma}, fica mais contido. Abaixo, estica.` : `Com o preço abaixo de ${esG.zero_gamma}, o movimento tende a esticar.`)
      : `Com o preço acima de ${esG.zero_gamma}, o mercado tende a ficar preso entre os níveis.`;
    const esTailEn = esR==='neg'
      ? (esAbove ? `With price above ${esG.zero_gamma} it stays contained. Below it, moves stretch.` : `With price below ${esG.zero_gamma}, moves tend to stretch.`)
      : `With price above ${esG.zero_gamma}, the market tends to stay pinned between the levels.`;
    tweets.push((pt
      ? `📉 ES, o S&P 500 (${px(es)}): gamma ${esR==='neg'?'NEGATIVO ⚠️':'POSITIVO ✅'}\n\n• Zero gamma (o nível que vira a chave do dia): ${esG.zero_gamma}\n• Suporte forte (put wall): ${esG.put_wall}\n• Resistência forte (call wall): ${esG.call_wall}\n\n${esTailPt}`
      : `📉 ES, the S&P 500 (${px(es)}): ${esR==='neg'?'NEGATIVE GAMMA ⚠️':'POSITIVE GAMMA ✅'}\n\n• Zero gamma (the level that flips the day): ${esG.zero_gamma}\n• Strong support (put wall): ${esG.put_wall}\n• Strong resistance (call wall): ${esG.call_wall}\n\n${esTailEn}`).slice(0,280));

    // 5) NQ detalhe
    const nqAbove = aboveZG(nq, nqG);
    const nqTailPt = nqR==='pos'
      ? (nqAbove ? `Com o preço acima de ${nqG.zero_gamma}, o mercado tende a ficar mais preso.` : `Abaixo de ${nqG.zero_gamma}, esse efeito de segurar enfraquece.`)
      : `Com o preço abaixo de ${nqG.zero_gamma}, o movimento tende a esticar.`;
    const nqTailEn = nqR==='pos'
      ? (nqAbove ? `With price above ${nqG.zero_gamma}, the market tends to stay more pinned.` : `Below ${nqG.zero_gamma}, that pinning effect weakens.`)
      : `With price below ${nqG.zero_gamma}, moves tend to stretch.`;
    tweets.push((pt
      ? `📈 NQ, o Nasdaq (${px(nq)}): gamma ${nqR==='neg'?'NEGATIVO ⚠️':'POSITIVO ✅'}\n\n• Zero gamma (vira a chave): ${nqG.zero_gamma}\n• Suporte forte (put wall): ${nqG.put_wall}\n• Resistência forte (call wall): ${nqG.call_wall}\n• Ímã de preço (HVL): ${nqG.hvl}\n\n${nqTailPt}`
      : `📈 NQ, the Nasdaq (${px(nq)}): ${nqR==='neg'?'NEGATIVE GAMMA ⚠️':'POSITIVE GAMMA ✅'}\n\n• Zero gamma (flips the day): ${nqG.zero_gamma}\n• Strong support (put wall): ${nqG.put_wall}\n• Strong resistance (call wall): ${nqG.call_wall}\n• Price magnet (HVL): ${nqG.hvl}\n\n${nqTailEn}`).slice(0,280));

    // 6) O MESMO número, por estilo (referência, sem ordem de compra/venda)
    tweets.push((pt
      ? `👥 O mesmo número, lido por cada estilo (é referência, não recomendação):\n\n• Scalper: ${esG.zero_gamma} é o ponto de virada do intraday no ES.\n• Intraday e EOD: ${esG.put_wall} e ${esG.call_wall} marcam o range provável do dia.\n• Swing e funded: gamma negativo é mais ruído, então precisa de mais espaço.`
      : `👥 The same number, read by each style (reference, not advice):\n\n• Scalper: ${esG.zero_gamma} is the ES intraday turning point.\n• Intraday and EOD: ${esG.put_wall} and ${esG.call_wall} mark the likely range.\n• Swing and funded: negative gamma is more noise, so give it more room.`).slice(0,280));

    // 7) Gestão de risco por TIPO de conta (linguagem clara, sem gíria)
    const negDay = esR==='neg';
    tweets.push((pt
      ? `🛡 A gestão de risco, por tipo de conta, num dia que ${negDay?'amplifica os movimentos':'prende o mercado'}:\n\n• Trailing: protege o pico. ${negDay?'A amplificação devolve lucro rápido.':'O range testa a paciência.'}\n• EOD: mais folga no intraday, mas não leve perdedora pro fim.\n• Static: respira mais, mas tamanho grande sofre.\n• Funded (que já paga): preserve o saque.`
      : `🛡 Risk management, by account type, on a day that ${negDay?'amplifies the moves':'pins the market'}:\n\n• Trailing: protects the peak. ${negDay?'Amplification gives gains back fast.':'The range tests your patience.'}\n• EOD: more room intraday, but don't carry a loser to the close.\n• Static: breathes more, but big size suffers.\n• Funded (already paying): protect the payout.`).slice(0,280));

    // 8) COMMODITIES (suporte/resistência em linhas separadas)
    if (gc || cl) {
      const blk = (r, namePt, nameEn) => {
        const nm = pt ? namePt : nameEn;
        const bias = pt ? biasL(r.bias).toLowerCase() : biasL(r.bias).toLowerCase();
        const supL = pt ? 'Suporte' : 'Support', resL = pt ? 'Resistência' : 'Resistance';
        return `${dot(r.bias)} ${nm}, ${pt?'em':''} ${bias} (${px(r)}, ${chg(r)})\n${supL}: ${supList(r)}\n${resL}: ${resList(r)}`;
      };
      let t = pt ? `🪙 E as commodities hoje:\n\n` : `🪙 And commodities today:\n\n`;
      const blocks = [];
      if (gc) blocks.push(blk(gc, 'Ouro', 'Gold'));
      if (cl) blocks.push(blk(cl, 'Petróleo', 'Crude Oil'));
      t += blocks.join('\n\n');
      tweets.push(t.slice(0,280));
    }

    // 9) Resumo claro (diz o que cada lado do nível significa)
    tweets.push((pt
      ? `📌 Resumindo, pra todo mundo:\n\nNum dia de gamma ${negDay?'negativo':'positivo'}, o ES ${negDay?'não perdoa quem força a mão':'castiga quem persegue movimento'}, seja qual for sua conta.\nO número que decide o dia é ${esG.zero_gamma}: acima dele, o ambiente é de reversão; abaixo, de tendência.`
      : `📌 To sum up, for everyone:\n\nOn a ${negDay?'negative':'positive'}-gamma day, the ES ${negDay?'punishes whoever forces it':'punishes whoever chases moves'}, whatever your account.\nThe number that decides the day is ${esG.zero_gamma}: above it leans reversal, below it leans trend.`).slice(0,280));

    // 10) CTA + disclaimer (tweet próprio, nunca corta)
    tweets.push((pt
      ? `Eu trago essa leitura colada na abertura, pra você não quebrar a conta. A análise completa fica no site, link na bio. Bons trades. 👊\n\nConteúdo educativo, não é recomendação.`
      : `I bring this read right before the open, so you don't blow the account. The full breakdown lives on the site, link in bio. Good trades. 👊\n\nEducational content, not financial advice.`).slice(0,280));
    // 11) Cupom + assinatura do Max (tweet próprio, nunca corta)
    tweets.push((pt
      ? `💰 Dica de ouro do Max: conta da Apex por $19.90 com o cupom MARKET. 90% de desconto, hoje, o amanhã a Deus pertence. Aproveita, dólar não cai do céu 😅\n\n🦊 Abraço do Max, da marketscoupons. Câmbio, desligo. 📡`
      : `💰 Gold tip from Max: an Apex account for $19.90 with code MARKET. 90% off, today only, tomorrow's not promised. Grab it, dollars don't fall from the sky 😅\n\n🦊 Catch you later, Max from marketscoupons. Over and out. 📡`).slice(0,280));

    return tweets.filter(t => t && t.trim().length > 0);
  }

  // ===== FALLBACK (sem GEX no banco): formato clássico desk de research =====
  // 1) HOOK
  tweets.push(pt
    ? `📊 Análise Diária do Mercado · ${date}\n\nO panorama macro + S&P 500, Nasdaq, Ouro e Petróleo.\nO que move o mercado hoje e os níveis que importam 🧵👇`.slice(0,280)
    : `📊 Daily Market Outlook · ${date}\n\nThe macro backdrop + S&P 500, Nasdaq, Gold & Oil.\nWhat's driving today and the levels that matter 🧵👇`.slice(0,280));

  // 2) MACRO / sentimento (usa VIX + market phase do ES)
  const vix = firstSentence(j(es?.vix_context), 170);
  const phase = firstSentence(j(es?.market_phase), 90);
  let t2 = pt ? `🌐 O panorama\n\n${vix}` : `🌐 The backdrop\n\n${vix}`;
  if (phase) t2 += pt ? `\n\nFase de mercado: ${phase}` : `\n\nMarket phase: ${phase}`;
  tweets.push(t2.slice(0,280));

  // 3) ÍNDICES (ES + NQ)
  if (es || nq) {
    let t = pt ? `📈 Índices\n` : `📈 Indices\n`;
    if (es) t += `\n${dot(es.bias)} ${NAMES.ES} · ${biasL(es.bias)} · ${px(es)} ${chg(es)}\n${zones(es)}`;
    if (nq) t += `\n\n${dot(nq.bias)} ${NAMES.NQ} · ${biasL(nq.bias)} · ${px(nq)} ${chg(nq)}\n${zones(nq)}`;
    tweets.push(t.slice(0,280));
  }

  // 4) COMMODITIES (GC + CL)
  if (gc || cl) {
    let t = pt ? `🪙 Commodities\n` : `🪙 Commodities\n`;
    if (gc) t += `\n${dot(gc.bias)} ${NAMES.GC} · ${biasL(gc.bias)} · ${px(gc)} ${chg(gc)}\n${zones(gc)}`;
    if (cl) t += `\n\n${dot(cl.bias)} ${NAMES.CL} · ${biasL(cl.bias)} · ${px(cl)} ${chg(cl)}\n${zones(cl)}`;
    tweets.push(t.slice(0,280));
  }

  // 5) RISK NOTE
  const vixTxt = j(es?.vix_context);
  const vixMatch = String(vixTxt).match(/VIX\s*(?:at|:)?\s*([\d.]+)/i);
  const vixVal = vixMatch ? parseFloat(vixMatch[1]) : null;
  const directional = rows.filter(r => /bull|bear/i.test(r.bias||'')).length;
  let condLine, riskNote;
  if (pt) {
    if (vixVal != null && vixVal >= 20) condLine = `VIX em ${vixVal} = volatilidade alta, whipsaw pune risco frouxo.`;
    else if (directional >= 3) condLine = `Direção clara nos mercados, mas correr atrás tarde é a armadilha.`;
    else condLine = `Mercado travado e misto, o dia em que overtrade mata a conta.`;
    riskNote = `💡 Operando conta prop hoje? ${condLine}\n\n• Trailing → proteja seu pico, não devolva o lucro\n• EOD → mais espaço intraday, respeite o limite diário\n• Qualquer estilo → menos trades e mais limpos vencem`;
  } else {
    if (vixVal != null && vixVal >= 20) condLine = `VIX at ${vixVal} = high volatility, whipsaws punish loose risk.`;
    else if (directional >= 3) condLine = `Clear directional tone, but chasing late is the trap.`;
    else condLine = `Choppy, mixed tape, the day overtrading quietly kills accounts.`;
    riskNote = `💡 Trading prop today? ${condLine}\n\n• Trailing → protect your peak, don't give back gains\n• EOD → more intraday room, mind the daily floor\n• Any style → fewer, cleaner trades win`;
  }
  tweets.push(riskNote.slice(0,280));

  // 6) Assinatura Max
  if (pt) {
    let macroLine = macro.length ? `\n\nEm dia de ${macro.join(' + ')}, isso é sobrevivência, não luxo.` : '';
    tweets.push(`É por isso que solto a leitura toda manhã às 5h30 ET: bias, suportes e resistências de ES, NQ, GC e CL + macro. Pra saber se hoje é atacar ou observar.${macroLine}\n\nCupons na bio. Max da marketscoupons.com, câmbio desligo. 📡`.slice(0,280));
  } else {
    let macroLine = macro.length ? `\n\nOn a ${macro.join(' + ')} day, that's survival, not a luxury.` : '';
    tweets.push(`This is why I drop the read every morning at 5:30am ET: bias, support and resistance on ES, NQ, GC and CL + macro. So you know if today is attack or observe.${macroLine}\n\nCoupons in bio. Max from marketscoupons.com. Over and out. 📡`.slice(0,280));
  }

  return tweets.filter(t => t && t.trim().length > 0);
}

// ===== Caption do INSTAGRAM (análise condensada numa legenda única + assinatura Max) =====
// Mesmo dado real do banco. Foto do Max é a imagem; a análise vai toda na legenda.
function buildIGCaption(rows, date) {
  const EN_NAMES = { ES: 'S&P 500', NQ: 'Nasdaq 100', GC: 'Gold', CL: 'Crude Oil' };
  const byId = {}; rows.forEach(r => byId[r.asset] = r);
  const j = (o) => (o && typeof o === 'object') ? (o.en || o.pt || '') : (typeof o === 'string' ? o : '');
  const dot = (b) => { b=(b||'').toLowerCase(); return b.includes('bull')?'🟢':b.includes('bear')?'🔴':'⚪'; };
  const biasLbl = (b) => { b=(b||'').toLowerCase(); return b.includes('bull')?'Bullish':b.includes('bear')?'Bearish':'Neutral'; };
  const px = (r) => r?.last_price ? Number(r.last_price).toFixed(r.asset==='CL'?2:0) : '—';
  const chg = (r) => r?.change_pct!=null ? `${r.change_pct>0?'+':''}${Number(r.change_pct).toFixed(1)}%` : '';
  const zones = (r) => {
    const s=[r?.support_1,r?.support_2].filter(Boolean).join(' / ');
    const x=[r?.resistance_1,r?.resistance_2].filter(Boolean).join(' / ');
    return [s&&`Support ${s}`, x&&`Resistance ${x}`].filter(Boolean).join(' - ');
  };
  const line = (r) => r ? `${dot(r.bias)} ${EN_NAMES[r.asset]||r.asset} · ${biasLbl(r.bias)} · ${px(r)} ${chg(r)}\n   ${zones(r)}` : '';

  const vix = j(byId.ES?.vix_context).split(/\.\s/)[0];

  const parts = [];
  parts.push(`📊 Daily Market Outlook · ${date}`);
  if (vix) parts.push(`\n🌐 ${vix}.`);
  parts.push(`\n📈 INDICES\n${[line(byId.ES), line(byId.NQ)].filter(Boolean).join('\n')}`);
  parts.push(`\n🪙 COMMODITIES\n${[line(byId.GC), line(byId.CL)].filter(Boolean).join('\n')}`);
  parts.push(`\n💡 Trading a prop account today? On high-vol days, trailing-DD traders protect the peak, EOD traders mind the daily floor, and every style wins with fewer, cleaner trades.`);
  parts.push(`\nThis is why I drop the read every morning at 6am ET, bias + support and resistance on ES, NQ, GC and CL + the macro backdrop. So you know if today is attack or observe.`);
  parts.push(`\n💰 Code MARKET = 90% OFF on Apex. All exclusive prop firm coupons at marketscoupons.com`);
  parts.push(`Market view, not financial advice. Always do your own research.\nMax from marketscoupons.com. Over and out. 📡`);
  parts.push(`\n.\n#trading #propfirm #futures #daytrading #SP500 #nasdaq #gold #crudeoil #marketanalysis #tradingfutures #fundedtrader #apextraderfunding`);

  return parts.join('\n');
}

// ===== MOTOR DE VOZ DO MAX (Gemini-com-trava) =====
// Gera a thread com a VOZ do Max (persona tio Max raposa) a partir dos números REAIS
// travados do banco. Validação anti-invenção (Lei #0): se citar número não fornecido, descarta.
async function callGemini(systemText, userText, opts = {}) {
  const KEYS = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
  if (!KEYS.length) return null;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemText }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: { maxOutputTokens: opts.maxTokens || 2200, temperature: opts.temp ?? 0.85 },
  });
  const _start = Date.now();
  for (let i = 0; i < KEYS.length; i++) {
    if (Date.now() - _start > 22000) break;  // cap total: nunca varre N chaves até estourar a função
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEYS[i]}`;
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 8000);  // 8s por chave: cai no fallback rápido
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: ac.signal });
      const d = await r.json();
      if (!r.ok) { console.error('[max] gemini', r.status, JSON.stringify(d).slice(0, 200)); continue; }
      const t = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (t) return t;
    } catch (e) { console.error('[max] gemini fetch', e.message); continue; }
    finally { clearTimeout(to); }
  }
  return null;
}

function maxVoiceSystem(lang) {
  if (lang === 'pt') return `Você é o Max, uma RAPOSA mascote 🦊 e analista de mercado da Markets Coupons. Escreve a thread diária do X (Twitter) pra traders de prop firm de TODOS os perfis.

PERSONA: Max, carismático, brasileiro, esperto, honesto. Cutuca o mercado com humor, NUNCA ofende ninguém (muito menos prop firm). Cuida do leitor ("pra você não quebrar a conta"). NUNCA use o termo "tio Max" (vira vício/cansa). Fale como Max, simples.

REGRA DE OURO (NUNCA QUEBRE): use APENAS os números do bloco DADOS DE HOJE. Copie-os EXATOS, sem arredondar. NUNCA invente preço, nível, %, valor ou estatística. Se não está no bloco, não fala.
RESPEITE O VIÉS: cada ativo tem um viés (alta/baixa/neutro) no bloco. NÃO confunda com a variação do dia, um ativo pode subir no dia e ainda ter viés de baixa. Use o viés fornecido.
USE O CONTEXTO: você recebe um bloco CONTEXTO DE MERCADO (fase Wyckoff, o que move o mercado hoje, fluxo do smart money, indicadores RSI/MACD/EMA). USE com SUAS palavras pra dar PROFUNDIDADE: fale do que está movendo o mercado, do smart money, do momento técnico. Sem isso a leitura fica rasa e vira piada. NÃO copie o texto cru, traduza pro jeito do Max. NÃO invente números além dos fornecidos.

COMPLIANCE (PROIBIDO): nunca diga "compre/venda/entre/stop/alvo". Nunca fale mal de prop firm. É conteúdo educativo, não sinal de trade. SEMPRE inclua um disclaimer discreto no tweet de CTA (10): "Conteúdo educativo, não é recomendação." (é a norma no X e protege a marca).

VOZ E GÍRIA (coerente, conecta começo e fim):
- Abre com "Fala, traders." NUNCA "bom dia tropa", "esquizofrênico", "senta que lá vem o fio".
- Gamma negativo = "jogar gasolina no fogo" (movimento se alimenta). Gamma positivo = "amortecedor" (absorve e segura). Use pra ENSINAR.
- VIX = "termômetro do medo". zero gamma = "a chave que vira o dia". put wall = "chão forte". call wall = "teto forte". HVL = "ímã de preço".
- "é leitura, não é dica" (mostra o nível, não manda operar).
- Divergência ES×NQ só direcional = "quem tá mentindo?". Se concordam na direção mas divergem no gamma, NÃO use isso.

ESTRUTURA (use quantos tweets a análise precisar pra ficar COMPLETA e boa, sem repetir nem encher linguiça; cada tweet com conteúdo real):
1) Gancho: o fato mais marcante (ex: ES e NQ em regimes opostos). Abre "Fala, traders." Fecha com 👇
2) Panorama: VIX + o que significa + o que move o mercado HOJE (use o contexto de notícias)
2b) Leitura institucional: fase de mercado (Wyckoff) + o que o smart money está fazendo + momento dos indicadores (use o CONTEXTO, com suas palavras)
3) O que é gamma (simples pro leigo)
4) ES em UM ÚNICO tweet: preço, viés, regime, zero gamma, put wall, call wall + o que significa
5) NQ em UM ÚNICO tweet: igual
6) O mesmo nível por estilo (scalper, intraday/EOD, swing/funded) — inclusão, "é leitura não é dica"
7) Gestão de risco por tipo de conta (trailing, EOD, static, funded) — neutro
8) Commodities (ouro, petróleo): bias + chão/teto
9) Resumo honesto pra todos
10) CTA: "trago essa leitura colada na abertura, pra você não quebrar a conta" + análise completa no site + "link na bio" + "Bons trades. 👊"
11) Cupom: "💰 Dica de ouro do Max: conta da Apex por $19.90 com o cupom MARKET. 90% de desconto, hoje, o amanhã a Deus pertence. Aproveita, que dólar não cai do céu 😅" e assina "🦊 Abraço do Max, da marketscoupons. Câmbio, desligo. 📡"

FORMATAÇÃO (capriche, dê respiro):
- Cada tweet CURTO: no MÁXIMO 250 caracteres (deixe folga, conte). Se não couber, QUEBRE em mais tweets. NUNCA estoure nem corte uma frase no meio.
- Cada ideia na sua linha. Linha em branco entre blocos (título / dados / conclusão). NUNCA amontoe.
- Emoji funcional no header (📉 📈 🪙 🛡 💡 🌐 👥 📌). 1-2 por tweet.

OBRIGATÓRIO: a thread SÓ termina depois do tweet de CTA E do tweet de cupom+assinatura do Max. NUNCA pare antes do cupom. Sempre entregue a thread INTEIRA.

SAÍDA: só os tweets, um separado do outro por uma linha contendo apenas ===. NÃO numere (o sistema numera). Sem comentários, sem explicação.`;

  return `You are Max, a fox mascot 🦊 and market analyst for Markets Coupons. You write the daily X (Twitter) thread for prop firm traders of EVERY style.

PERSONA: Max, charismatic, sharp, honest. Pokes fun at the market, NEVER offends anyone (especially not a prop firm). Looks out for the reader ("so you don't blow the account"). NEVER use "Uncle Max" (it gets old). Just be Max.

GOLDEN RULE (NEVER BREAK): use ONLY the numbers in the TODAY'S DATA block. Copy them EXACTLY, no rounding. NEVER invent a price, level, %, value or stat. If it's not in the block, don't mention it.
RESPECT THE BIAS: each asset has a bias (bullish/bearish/neutral) in the block. Do NOT confuse it with the day's change, an asset can be up on the day and still be bearish bias. Use the bias given.
USE THE CONTEXT: you get a MARKET CONTEXT block (Wyckoff phase, what moves the market today, smart money flow, RSI/MACD/EMA indicators). USE it in YOUR words to add DEPTH: talk about what's moving the market, the smart money, the technical moment. Without it the read is shallow and becomes a joke. Do NOT copy the raw text, translate it to Max's voice. Do NOT invent numbers beyond those provided.

COMPLIANCE (FORBIDDEN): never say "buy/sell/enter/stop/target". Never bash a prop firm. Educational content, not a trade signal. ALWAYS include a discreet disclaimer in the CTA tweet (10): "Educational content, not financial advice." (it's the norm on X and protects the brand).

VOICE (coherent, connect open and close):
- Open with "What's up, traders." NEVER cheesy "good morning team" type lines.
- Negative gamma = "pouring fuel on the fire" (moves feed themselves). Positive gamma = "shock absorber" (cushions and pins). Use these to TEACH.
- VIX = "the fear gauge". zero gamma = "the level that flips the day". put wall = "the floor". call wall = "the ceiling". HVL = "price magnet".
- "it's a read, not a tip" (you show the level, you don't tell them to trade).
- ES×NQ divergence only when directional = "which one is lying?". If they agree on direction but differ in gamma, do NOT use that.

STRUCTURE (use as many tweets as the analysis needs to be COMPLETE and good, no repeating or filler; each tweet with real content):
1) Hook: the most striking fact (e.g. ES and NQ in opposite regimes). Open "What's up, traders." End with 👇
2) Backdrop: VIX + what it means + what's moving the market TODAY (use the news context)
2b) Institutional read: market phase (Wyckoff) + what the smart money is doing + indicator momentum (use the CONTEXT, in your words)
3) What gamma is (simple)
4) ES in ONE single tweet: price, bias, regime, zero gamma, put wall, call wall + meaning
5) NQ in ONE single tweet: same
6) Same level by style (scalper, intraday/EOD, swing/funded) — inclusive, "a read not a tip"
7) Risk by account type (trailing, EOD, static, funded) — neutral
8) Commodities (gold, oil): bias + floor/ceiling
9) Honest recap for everyone
10) CTA: "I bring this read right before the open, so you don't blow the account" + full analysis on the site + "link in bio" + "Good trades. 👊"
11) Coupon: "💰 Gold tip from Max: an Apex account for $19.90 with code MARKET. 90% off, today only, tomorrow's not promised. Grab it, dollars don't fall from the sky 😅" then sign "🦊 Catch you later, Max from marketscoupons. Over and out. 📡"

FORMATTING (breathe, don't cram):
- Each tweet SHORT: MAX 250 characters (leave slack, count). If it doesn't fit, SPLIT into more tweets. NEVER overflow or cut a sentence mid-way.
- One idea per line. Blank line between blocks (title / data / conclusion). NEVER cram.
- Functional emoji in the header (📉 📈 🪙 🛡 💡 🌐 👥 📌). 1-2 per tweet.

MANDATORY: the thread only ends after the CTA tweet AND the coupon+signature tweet. NEVER stop before the coupon. Always deliver the WHOLE thread.

OUTPUT: only the tweets, each separated by a line containing only ===. Do NOT number them. No comments, no explanation.`;
}

function maxMacroDetect(rows, pt) {
  const txt = rows.map(r => { const e = r.events; return e ? (typeof e === 'object' ? `${e.en||''} ${e.pt||''}` : String(e)) : ''; }).join(' ').toLowerCase();
  const found = []; const add = (c, p, e) => { if (c && found.length < 2) found.push(pt ? p : e); };
  add(/fomc/.test(txt), 'FOMC', 'FOMC'); add(/\bcpi\b/.test(txt), 'CPI', 'CPI'); add(/\bpce\b/.test(txt), 'PCE', 'PCE');
  add(/non.?farm|payroll|\bnfp\b/.test(txt), 'payroll', 'NFP'); add(/\bppi\b/.test(txt), 'PPI', 'PPI');
  add(/\becb\b|\bbce\b/.test(txt), pt ? 'decisão do BCE' : 'ECB decision', pt ? 'decisão do BCE' : 'ECB decision');
  add(/jobless|desemprego/.test(txt), pt ? 'seguro-desemprego' : 'jobless claims', pt ? 'seguro-desemprego' : 'jobless claims');
  return found;
}

function buildMaxData(rows, gex, date, lang) {
  const pt = lang === 'pt';
  const byId = {}; rows.forEach(r => byId[r.asset] = r);
  const es = byId.ES, nq = byId.NQ, gc = byId.GC, cl = byId.CL;
  const jx = (o) => (o && typeof o === 'object') ? (o.en || o.pt || '') : String(o || '');
  const vt = jx(es?.vix_context);
  const vm = vt.match(/VIX\s*(?:at|em|:)?\s*([\d.]+)/i); const vix = vm ? vm[1] : '';
  const vcm = vt.match(/\(([+-][\d.]+%)\)/); const vchg = vcm ? vcm[1] : '';
  const g = (t) => (gex && gex[t]) ? gex[t] : {};
  const eg = g('ES'), ng = g('NQ');
  const reg = (gg) => parseFloat(gg.total_gex) >= 0 ? (pt ? 'POSITIVO' : 'POSITIVE') : (pt ? 'NEGATIVO' : 'NEGATIVE');
  const sr = (r) => [r?.support_1, r?.support_2].filter(Boolean).join('/');
  const rr = (r) => [r?.resistance_1, r?.resistance_2].filter(Boolean).join('/');
  const px = (r) => r?.last_price != null ? Number(r.last_price).toFixed(r.asset === 'CL' ? 2 : 0) : '?';
  const ch = (r) => r?.change_pct != null ? `${r.change_pct > 0 ? '+' : ''}${Number(r.change_pct).toFixed(1)}%` : '';
  const bs = (r) => { const b = (r?.bias || '').toLowerCase(); if (pt) return b.includes('bull') ? 'viés de ALTA' : b.includes('bear') ? 'viés de BAIXA' : 'viés NEUTRO'; return b.includes('bull') ? 'BULLISH bias' : b.includes('bear') ? 'BEARISH bias' : 'NEUTRAL bias'; };
  const macro = maxMacroDetect(rows, pt);
  const L = [];
  L.push(pt ? `Data: ${date}` : `Date: ${date}`);
  if (vix) L.push(`VIX: ${vix}${vchg ? ` (${pt ? 'variação' : 'change'} ${vchg})` : ''}`);
  if (macro.length) L.push(`${pt ? 'Macro no radar' : 'Macro on the radar'}: ${macro.join(', ')}`);
  if (es && eg.zero_gamma) L.push(`ES (S&P 500): ${pt ? 'preço' : 'price'} ${px(es)} | ${ch(es)} | ${bs(es)} | GAMMA ${reg(eg)} | zero gamma ${eg.zero_gamma} | put wall ${eg.put_wall} | call wall ${eg.call_wall}`);
  if (nq && ng.zero_gamma) L.push(`NQ (Nasdaq): ${pt ? 'preço' : 'price'} ${px(nq)} | ${ch(nq)} | ${bs(nq)} | GAMMA ${reg(ng)} | zero gamma ${ng.zero_gamma} | put wall ${ng.put_wall} | call wall ${ng.call_wall} | HVL ${ng.hvl}`);
  if (gc) L.push(`${pt ? 'Ouro' : 'Gold'}: ${pt ? 'preço' : 'price'} ${px(gc)} | ${ch(gc)} | ${bs(gc)} | ${pt ? 'suportes' : 'support'} ${sr(gc)} | ${pt ? 'resistências' : 'resistance'} ${rr(gc)}`);
  if (cl) L.push(`${pt ? 'Petróleo WTI' : 'Crude Oil (WTI)'}: ${pt ? 'preço' : 'price'} ${px(cl)} | ${ch(cl)} | ${bs(cl)} | ${pt ? 'suportes' : 'support'} ${sr(cl)} | ${pt ? 'resistências' : 'resistance'} ${rr(cl)}`);
  // CONTEXTO rico do banco: fase Wyckoff, notícias, fluxo institucional (smart money), indicadores — pra leitura COMPLETA, não rasa
  const ctx = [];
  const phase = jx(es?.market_phase); if (phase) ctx.push(`${pt ? 'Fase de mercado (Wyckoff)' : 'Market phase (Wyckoff)'}: ${phase}`);
  const news = jx(es?.news_impact); if (news) ctx.push(`${pt ? 'O que move o mercado hoje' : 'What moves the market today'}: ${news}`);
  const flowES = jx(es?.volume_analysis); if (flowES) ctx.push(`${pt ? 'Fluxo institucional ES (smart money)' : 'ES institutional flow (smart money)'}: ${flowES}`);
  const indES = jx(es?.indicators_summary); if (indES) ctx.push(`${pt ? 'Indicadores ES' : 'ES indicators'}: ${indES}`);
  const flowNQ = jx(nq?.volume_analysis); if (flowNQ) ctx.push(`${pt ? 'Fluxo institucional NQ' : 'NQ institutional flow'}: ${flowNQ}`);
  if (ctx.length) {
    L.push('');
    L.push(pt ? 'CONTEXTO DE MERCADO (do nosso desk, use pra dar PROFUNDIDADE à leitura com suas palavras, NÃO invente números):' : 'MARKET CONTEXT (from our desk, use it to add DEPTH in your words, do NOT invent numbers):');
    ctx.forEach(c => L.push('- ' + c));
    L.push('');
  }
  L.push(pt ? `Cupom: Apex 25K por $19.90 com o cupom MARKET (90% off)` : `Coupon: Apex 25K for $19.90 with code MARKET (90% off)`);
  return { block: L.join('\n'), vix, vchg };
}

// Tudo que EU forneço no bloco é permitido; só fiscaliza número que o Gemini inventar ALÉM disso.
function maxAllowedNums(block) {
  const s = new Set(['2026', '2025', '19.90', '90', '5', '30', '280', '25', '50', '100', '150', '24.90', '39.90', '59.90']);
  const norm = String(block).replace(/(\d)[.,](\d{3})(?!\d)/g, '$1$2');
  (norm.match(/\d[\d.]*\d|\d/g) || []).forEach(n => { s.add(n); const f = parseFloat(n); if (!isNaN(f)) { s.add(String(f)); s.add(String(Math.round(f))); } });
  return s;
}

function maxHasInvention(text, allowed) {
  const norm = text.replace(/(\d)[.,](\d{3})(?!\d)/g, '$1$2'); // junta separador de milhar
  const nums = norm.match(/\d[\d.]*\d|\d/g) || [];
  for (const raw of nums) {
    const n = parseFloat(raw);
    if (isNaN(n) || n < 1000) continue; // só fiscaliza níveis (>=1000)
    if (!allowed.has(raw) && !allowed.has(String(n)) && !allowed.has(String(Math.round(n)))) return raw;
  }
  if (/\$\s?\d[\d.,]*\s*(B\b|M\b|bi|bilh|mi|milh|trillion|billion|million|tri)/i.test(text)) return 'big-money';
  return null;
}

async function genMaxThreadAI(rows, gex, date, lang) {
  if (!gex || !gex.ES || !gex.NQ || !gex.ES.zero_gamma || !gex.NQ.zero_gamma) return { tweets: null, reason: 'no-gex' };
  const { block, vix, vchg } = buildMaxData(rows, gex, date, lang);
  const sys = maxVoiceSystem(lang);
  const user = `${lang === 'pt' ? 'DADOS DE HOJE (use SÓ estes números, copie exatos, não invente nenhum outro):' : "TODAY'S DATA (use ONLY these numbers, copy exact, invent none):"}\n${block}\n\n${lang === 'pt' ? 'Gere a thread COMPLETA agora, do gancho até o tweet do cupom e a assinatura do Max. NÃO pare no meio.' : "Generate the COMPLETE thread now, from the hook to the coupon tweet and Max's signature. Do NOT stop midway."}`;
  // até 2 tentativas: se vier incompleta ou inventando, tenta de novo antes de cair no template
  let lastReason = 'gemini-null';
  for (let attempt = 0; attempt < 2; attempt++) {
    const out = await callGemini(sys, user, { maxTokens: 4096, temp: attempt === 0 ? 0.8 : 0.6 });
    if (!out) { lastReason = 'gemini-null'; continue; }
    const allowed = maxAllowedNums(block);
    const inv = maxHasInvention(out, allowed);
    if (inv) { lastReason = 'invention:' + inv; continue; }
    let tweets = out.split(/\n?={3,}\n?/).map(t => t.trim()).filter(Boolean);
    tweets = tweets.map(t => t.replace(/^\d+\s*[\/.)]\s*/, '').trim()).filter(Boolean);
    const over = tweets.filter(t => t.length > 280).length;
    tweets = tweets.map(t => t.slice(0, 280)).filter(Boolean);
    if (tweets.length < 8) { lastReason = 'too-few:' + tweets.length; continue; }
    // TRAVA DE COMPLETUDE: thread só é válida com cupom (MARKET) + assinatura do Max
    const joined = tweets.join('\n');
    const hasCoupon = /\bMARKET\b/.test(joined);
    const hasSign = /(câmbio,?\s*desligo|over and out)/i.test(joined);
    if (!hasCoupon || !hasSign) { lastReason = 'incomplete:' + (hasCoupon ? '' : 'noCoupon') + (hasSign ? '' : 'noSign'); continue; }
    return { tweets, reason: 'ok', over };
  }
  return { tweets: null, reason: lastReason };
}

// ===== POST ÚNICO do Max (análise de MOMENTO — não thread) =====
// Cada momento do dia = 1 post curto (<=280). Espaçados ao longo do dia, sem burst.
function maxSinglePostSystem(lang) {
  if (lang === 'pt') return `Você é o Max, analista de mercado da Markets Coupons, postando no X.
Escreva UM post (160-260 caracteres, NUNCA encoste em 280). NÃO é thread.

FORMATO QUE VIRALIZA NO X:
- LINHA 1 = HOOK: o fato mais surpreendente ou de maior aposta, com o número. Tem que parar o scroll. SEM "Fala traders", SEM "🧵", SEM saudação genérica.
- Depois 1-2 linhas curtas que pagam o hook. UMA ideia por post. Deixa respirar com quebras de linha.
- PORTUGUÊS/INGLÊS DE GENTE: TRADUZA o jargão. Em vez de "Call Wall 7500" diga "os bancos estão segurando o S&P em 7500"; em vez de "gamma positivo" diga "o mercado tá amortecendo os movimentos"; VIX = "o termômetro do medo". Trader normal tem que entender na hora.
- VARIE a abertura todo dia. NUNCA repita o mesmo começo.

REGRA DE OURO: use SÓ os números do bloco DADOS. NUNCA invente preço/nível/%/valor. Respeite o VIÉS dado (não confunda com a variação do dia).
COMPLIANCE (duro): nunca "compre/venda/entre/stop/alvo/sinal/lucro garantido/trader profissional". Nunca fale mal de prop firm. É leitura, não é dica.
SEM emoji. No máximo 1 hashtag (de preferência nenhuma).
SAÍDA: só o texto do post. Sem aspas, sem rótulo.`;
  return `You are Max, market analyst for Markets Coupons, posting on X.
Write ONE post (160-260 chars, NEVER max out 280). NOT a thread.

FORMAT THAT WINS ON X:
- LINE 1 = a HOOK: the single most surprising or highest-stakes fact, with the number. Make people stop scrolling. No "What's up traders", no "🧵", no greeting.
- Then 1-2 short lines that pay off the hook. ONE idea per post. Let it breathe with line breaks.
- PLAIN ENGLISH: TRANSLATE the jargon. Instead of "Call Wall 7500" say "the big banks are capping the S&P at 7500"; instead of "positive gamma" say "the market's acting like a shock absorber"; VIX = "the fear gauge". A normal trader must get it instantly.
- VARY your opening every time. Never reuse the same opener.

TONE REFERENCE (how the big accounts that win this niche actually write — Kobeissi & co.): they open with the striking fact AND the number, stated flat and confident, no hedging, no jargon, no greeting, and they frame the stake (e.g. "now worth more than all but 12 public companies"). Mirror that cadence: a confident one-line fact with a number, then the "so what" for a trader. Write fresh, never copy. Examples of the cadence:
- "The fear gauge just dropped 4.6%. The market smells a deal."
- "The S&P is holding above 7500 and the big banks are defending it. Patience pays today."
Sound like a sharp human trader, not a bot. Natural, never templated.

GOLDEN RULE: use ONLY the numbers in the DATA block. NEVER invent a price/level/%/value. Respect the BIAS given (not the day's change).
COMPLIANCE (hard): never "buy/sell/enter/stop/target/signal/guaranteed/profit/professional trader/we trade for you/get rich". Never bash a prop firm. It's a read, not advice.
NO emoji. At most 1 hashtag (prefer none).
OUTPUT: only the post text. No quotes, no label.`;
}

// Trava de compliance no CÓDIGO (não confia só no prompt): bloqueia termos
// proibidos antes de qualquer post auto. Retorna o termo achado, ou null se limpo.
function maxComplianceBlocked(text) {
  const t = ' ' + String(text || '').toLowerCase().replace(/[^\w\s$%./-]/g, ' ').replace(/\s+/g, ' ') + ' ';
  const BANNED = [
    'guaranteed profit', 'guaranteed return', 'guaranteed money', 'risk-free', 'risk free',
    'you will profit', "you'll profit", 'get rich', 'sure thing', 'cant lose', "can't lose",
    'we trade for you', 'copy my trades', 'professional trader',
    'buy now', 'sell now', 'go long here', 'go short here', 'entry at', 'stop loss at', 'take profit at',
    // PT
    'lucro garantido', 'renda garantida', 'sem risco', 'fique rico', 'dinheiro garantido',
    'a gente opera por voce', 'opero por voce', 'trader profissional', 'sinal de entrada', 'sinais de',
  ];
  for (const b of BANNED) { if (t.includes(' ' + b + ' ') || t.includes(' ' + b)) return b; }
  return null;
}

// Trava de JARGÃO: rejeita post com termo técnico cru que afasta audiência fria.
// Retorna o termo achado, ou null se limpo. (X é audiência geral, não terminal.)
// Garante que o texto termina em frase completa (nunca corta no meio).
function trimToSentence(text) {
  const t = String(text || '').trim();
  if (/[.!?)"']$/.test(t)) return t;
  const cut = Math.max(t.lastIndexOf('.'), t.lastIndexOf('!'), t.lastIndexOf('?'));
  return cut > 40 ? t.slice(0, cut + 1).trim() : t;
}

function maxJargonBlocked(text) {
  const t = ' ' + String(text || '').toLowerCase() + ' ';
  const JARGON = [
    'redistribution', 'accumulation phase', 'wyckoff', 'call wall', 'put wall',
    'zero gamma', 'positive gamma', 'negative gamma', 'gamma positive', 'gamma negative',
    'macd', 'rsi ', 'hvl', 'smart money', 'order flow', 'delta hedging',
  ];
  for (const j of JARGON) { if (t.includes(j)) return j.trim(); }
  return null;
}

// Fallback determinístico (SEM Gemini): se o motor de IA falha/cota estoura,
// o cron ainda posta um take limpo, compliant e sem jargão, dos dados reais.
function buildMaxSingleFallback(rows, gex, segment) {
  const es = (rows || []).find(r => r.asset === 'ES') || {};
  const price = es.last_price ? Number(es.last_price).toFixed(0) : null;
  const chg = es.change_pct != null ? `${es.change_pct > 0 ? '+' : ''}${Number(es.change_pct).toFixed(1)}%` : '';
  const g = (gex && gex.ES) ? gex.ES : {};
  const cap = g.call_wall ? Number(g.call_wall).toFixed(0) : null;
  const flip = g.zero_gamma ? Number(g.zero_gamma).toFixed(0) : null;
  if (segment === 'coupon') {
    return "Funded futures account for less: an Apex 25K eval is $19.90 right now with code MARKET, 90% off. Tomorrow's price isn't promised. Coupons in bio.";
  }
  if (price && cap && flip) {
    if (segment === 'recap') return `S&P 500 closed near ${price} (${chg}). ${flip} is the line that flips the day, ${cap} the ceiling the big banks defend. That's the map for tomorrow. Full read on the site, link in bio.`;
    return `S&P 500 at ${price} (${chg}). The big banks are capping it near ${cap}; ${flip} is the level that flips the day. Patience beats chasing here. Full levels on the site, link in bio.`;
  }
  return "Range-bound tape today, the kind that punishes chasing and rewards patience. Full market read and levels on the site, link in bio.";
}

async function genMaxSinglePost(rows, gex, date, lang, segment) {
  const pt = lang === 'pt';
  const { block } = buildMaxData(rows, gex, date, lang);
  const SEG = {
    premarket: pt ? 'AVISO ANTES DO SINO: o clima de hoje em PORTUGUÊS DE GENTE (o termômetro do medo + a 1 coisa que move o mercado) e o que isso significa na prática pra quem opera intraday vs EOD. NADA de rótulo de jargão (não escreva "call wall"/"zero gamma" crus; traduza). Fecha com "níveis completos no site, link na bio".' : 'PRE-BELL heads-up: today\'s mood in PLAIN ENGLISH (the fear gauge + the one thing moving markets) and what it means for an intraday vs an EOD trader. NO jargon labels (don\'t write raw "call wall"/"zero gamma"; translate them). End with "full levels on the site, link in bio".',
    open: pt ? 'O SETUP de hoje em português de gente: onde o S&P e o Nasdaq estão em relação ao nível que os bancos estão defendendo, e o que isso significa pra sessão. Traduza TODO termo técnico. Curto e direto.' : 'Today\'s setup in plain English: where the S&P and Nasdaq sit vs the level the big banks are defending, and what that means for the session. Translate EVERY technical term. Short and straight.',
    pulse: pt ? 'O PULSO do mercado agora em UMA frase afiada e humana: o que os dados realmente dizem do momento (calmo ou tenso, preso ou em tendência). Sem jargão.' : 'The market PULSE right now in one sharp, human line: what the data really says about this moment (calm or tense, pinned or trending). No jargon.',
    coupon: pt ? 'Post de OFERTA na voz do Max: conta da Apex por $19.90 com o cupom MARKET, 90% off, com humor. Hook primeiro. Cupons na bio.' : 'OFFER post in Max\'s voice: an Apex account for $19.90 with code MARKET, 90% off, with humor. Hook first. Coupons in bio.',
    recap: pt ? 'RECAP honesto do fim do dia: o nível-chave segurou? Como se comportou vs o viés. Português de gente, 1 conclusão clara.' : 'End-of-day recap, honest: did the key level hold? How did it behave vs the bias. Plain English, one clear takeaway.',
  };
  const task = SEG[segment] || (pt ? 'Um post curto com a leitura do mercado hoje.' : 'A short post with today\'s market read.');
  let lastRaw = null;
  const sys = maxSinglePostSystem(lang);
  const user = `${pt ? 'DADOS (use só estes números, não invente):' : 'DATA (use only these numbers, do not invent):'}\n${block}\n\n${pt ? 'Tarefa' : 'Task'}: ${task}\n${pt ? 'Escreva 1 post (máx 280 caracteres).' : 'Write 1 post (max 280 chars).'}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const out = await callGemini(sys, user, { maxTokens: 2048, temp: attempt === 0 ? 0.85 : 0.6 });
    if (!out) break;  // Gemini fora/cota: re-tentar não ajuda, vai direto pro fallback
    const allowed = maxAllowedNums(block);
    if (maxHasInvention(out, allowed)) continue;
    let post = out.trim().replace(/^["'`]+|["'`]+$/g, '').split(/\n={3,}\n?/)[0].trim().slice(0, 280);
    const banned = maxComplianceBlocked(post);
    if (banned) { lastRaw = 'compliance_block:' + banned; continue; }
    const jarg = maxJargonBlocked(post);
    if (jarg && attempt === 0) { lastRaw = 'jargon_block:' + jarg; continue; }  // 2ª tentativa aceita pra não falhar o post
    if (post.length >= 20) return { post, reason: 'ok', raw: out.slice(0, 320) };
    lastRaw = out.slice(0, 320);
  }
  return { post: buildMaxSingleFallback(rows, gex, segment), reason: 'fallback', raw: lastRaw };
}

// Monta a URL da página do chart (criativos/max-chart.html) com os níveis reais do banco
function maxChartUrl(gex, date, asset) {
  const g = gex && gex[asset] ? gex[asset] : null;
  if (!g || !g.zero_gamma) return null;
  const META = { ES: { name: 'S&P 500', yf: '^GSPC' }, NQ: { name: 'Nasdaq 100', yf: '^NDX' } };
  const m = META[asset];
  if (!m) return null;
  const p = new URLSearchParams();
  p.set('asset', asset); p.set('name', m.name); p.set('yf', m.yf); p.set('date', date);
  if (g.zero_gamma) p.set('gflip', g.zero_gamma);
  if (g.call_wall) p.set('call', g.call_wall);
  if (g.put_wall) p.set('put', g.put_wall);
  if (g.hvl) p.set('key', g.hvl);
  return `https://www.marketscoupons.com/criativos/max-chart.html?${p.toString()}`;
}

// Renderiza a página do chart em PNG via Browserless (render-criativo, auth de serviço)
async function renderChartPng(url) {
  const token = process.env.AUTOMATION_API_TOKEN;
  if (!token) throw new Error('no_automation_token');
  const r = await fetch('https://www.marketscoupons.com/api/render-criativo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-service-auth': token },
    body: JSON.stringify({ url, width: 1600, height: 900 }),
  });
  if (!r.ok) throw new Error('render_' + r.status + ':' + (await r.text().catch(() => '')).slice(0, 120));
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 5000) throw new Error('render_too_small:' + buf.length);
  return buf;
}

// Upload de imagem no X (v1.1 media/upload, multipart) → media_id_string
async function xUploadMedia(buf, keys) {
  const url = 'https://upload.twitter.com/1.1/media/upload.json';
  const form = new FormData();
  form.append('media', new Blob([buf], { type: 'image/png' }), 'chart.png');
  const r = await fetch(url, { method: 'POST', headers: { Authorization: oauth1Header('POST', url, keys) }, body: form });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d?.media_id_string) throw new Error('media_upload_' + r.status + ':' + JSON.stringify(d).slice(0, 150));
  return d.media_id_string;
}

// Constrói o post de ANALISTA (previsão de mercado, NÃO sinal de trade).
// Compliant: dá direção/contexto/zonas, sem trigger/target/stop. Cupom como texto + "link in bio".
// Thread de 2 tweets: (1) análise (2) disclaimer + cupom + bio.
function buildXThread(a) {
  const ticker = a.asset;
  // Nomes em inglês (banco guarda alguns em PT; X é EN-default)
  const EN_NAMES = { ES: 'S&P 500', NQ: 'Nasdaq 100', GC: 'Gold', CL: 'Crude Oil (WTI)' };
  const name = EN_NAMES[a.asset] || a.asset_name || a.asset;
  const biasRaw = (a.bias || 'neutral').toLowerCase();
  const dot = biasRaw.includes('bull') ? '🟢' : biasRaw.includes('bear') ? '🔴' : '⚪';
  const biasLabel = biasRaw.includes('bull') ? 'Bullish' : biasRaw.includes('bear') ? 'Bearish' : 'Neutral';
  const price = a.last_price ? Number(a.last_price).toFixed(0) : '—';
  const chg = a.change_pct != null ? `${a.change_pct > 0 ? '+' : ''}${Number(a.change_pct).toFixed(2)}%` : '';
  const conf = a.confidence != null ? `${a.confidence}/10` : '';

  // Contexto (o "WHY") — extrai EN, pega 1ª frase, limita pra caber
  let ctx = '';
  if (a.context && typeof a.context === 'object') ctx = a.context.en || a.context.pt || '';
  else if (typeof a.context === 'string') ctx = a.context;
  ctx = String(ctx).replace(/\s+/g, ' ').trim();
  // 1ª frase (até o 1º ponto seguido de espaço), cap 150
  const firstSentence = ctx.split(/\.\s/)[0];
  ctx = (firstSentence.length > 150 ? firstSentence.slice(0, 147) + '...' : firstSentence + (ctx.includes('. ') ? '.' : ''));

  const sup = [a.support_1, a.support_2].filter(Boolean).join(' / ');
  const res = [a.resistance_1, a.resistance_2].filter(Boolean).join(' / ');
  const zonesLine = [sup && `Support ${sup}`, res && `Resistance ${res}`].filter(Boolean).join('  ·  ');

  // Tweet 1 — análise (cap 280)
  let t1 = `${dot} ${name} (${ticker}) — ${a.date}\n\n${biasLabel} bias${conf ? ` (${conf})` : ''} · ${price} ${chg}\n\n${ctx}`;
  if (zonesLine) t1 += `\n\n${zonesLine}`;
  t1 = t1.slice(0, 280);

  // Tweet 2 — disclaimer + cupom (texto, sem link) + bio
  const t2 = `Market view, not financial advice. Do your own research.\n\n💰 Trading prop firms? Code MARKET = 90% OFF on Apex.\nAll coupons → link in bio`.slice(0, 280);

  return [t1, t2];
}

// ===== X recap: score público hits/misses do dia anterior =====
// GET ?action=x_recap&dry=1 — preview · POST ?action=x_recap&secret=... — posta
async function handleXRecap(req, res) {
  const isPreview = req.method === 'GET' || req.query?.dry === '1';
  if (!isPreview) {
    const secret = req.query?.secret || req.headers['x-cron-secret'];
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return res.status(403).json({ error: 'forbidden' });
    }
  }

  // Pega últimos targets scorados (último dia útil, max 5 ativos)
  const tResp = await fetch(`${SUPABASE_URL}/rest/v1/analysis_targets?scored_at=not.is.null&select=*&order=date.desc&limit=20`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const allTargets = await tResp.json();
  if (!Array.isArray(allTargets) || !allTargets.length) {
    return res.status(404).json({ error: 'no_scored_targets' });
  }

  // Agrupa pela data mais recente (todas do mesmo dia útil)
  const latestDate = allTargets[0].date;
  const targets = allTargets.filter(t => t.date === latestDate);

  // Calcula score por ativo
  const scored = targets.map(t => {
    let outcome = '➖';
    let label = 'no trigger';
    let direction = '';
    if (t.bull_trigger_hit) {
      direction = 'bull';
      if (t.bull_t2_hit) { outcome = '✅✅'; label = 'T2 hit'; }
      else if (t.bull_t1_hit) { outcome = '✅'; label = 'T1 hit'; }
      else if (t.bull_stop_hit) { outcome = '❌'; label = 'stop hit'; }
      else { outcome = '🟡'; label = 'trigger only'; }
    } else if (t.bear_trigger_hit) {
      direction = 'bear';
      if (t.bear_t2_hit) { outcome = '✅✅'; label = 'T2 hit'; }
      else if (t.bear_t1_hit) { outcome = '✅'; label = 'T1 hit'; }
      else if (t.bear_stop_hit) { outcome = '❌'; label = 'stop hit'; }
      else { outcome = '🟡'; label = 'trigger only'; }
    }
    return { asset: t.asset, outcome, label, direction, actual_high: t.actual_high, actual_low: t.actual_low };
  });

  // Stats simples
  const wins = scored.filter(s => s.outcome.startsWith('✅')).length;
  const losses = scored.filter(s => s.outcome === '❌').length;
  const noTrig = scored.filter(s => s.outcome === '➖').length;

  // Monta thread
  const lines = scored.map(s => `${s.asset} ${s.outcome} ${s.label}${s.direction ? ` (${s.direction})` : ''}`).join('\n');
  const t1 = `📋 Yesterday's calls · ${latestDate}\n\n${lines}\n\nScore: ${wins}W / ${losses}L / ${noTrig} no trigger`.slice(0, 275);
  const t2 = `Why this matters:\n\nWe publish the call BEFORE the move and the result AFTER. No edits, no hiding.\n\nFollow @marketscoupons for today's outlook ↓`.slice(0, 275);
  const t3 = `Today's full thread (4 assets, macro + zones + setups):\n\nmarketscoupons.com/analysis?utm_source=x&utm_medium=recap&utm_campaign=daily_score`.slice(0, 275);

  const thread = [t1, t2, t3];

  if (isPreview) {
    return res.status(200).json({ date: latestDate, scored, thread, preview: true });
  }

  const X_BEARER = process.env.X_USER_BEARER_TOKEN;
  if (!X_BEARER) return res.status(503).json({ error: 'no_x_token' });

  const tweetIds = [];
  let replyTo = null;
  let lastResponse = null;
  for (const text of thread) {
    const body = { text };
    if (replyTo) body.reply = { in_reply_to_tweet_id: replyTo };
    const tr = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${X_BEARER}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    lastResponse = await tr.json().catch(()=>({}));
    if (!tr.ok || !lastResponse?.data?.id) {
      await fetch(`${SUPABASE_URL}/rest/v1/x_post_log`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_type:'recap_score', status:'failed', x_response: lastResponse, posted_content: { thread, fail_at_tweet: tweetIds.length } })
      }).catch(()=>{});
      return res.status(502).json({ error: 'x_post_failed', failed_at: tweetIds.length, response: lastResponse });
    }
    const id = lastResponse.data.id;
    tweetIds.push(id);
    replyTo = id;
    await new Promise(r => setTimeout(r, 800));
  }

  await fetch(`${SUPABASE_URL}/rest/v1/x_post_log`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_type:'recap_score', thread_root_id: tweetIds[0], thread_tweet_ids: tweetIds, status:'sent', posted_content: { thread, scored, date: latestDate } })
  }).catch(()=>{});

  return res.status(200).json({ date: latestDate, posted: tweetIds, thread, scored });
}

// ===== IG subscribe fields (Instagram Login direct, NOT via FB Page) =====
async function handleIgSubscribe(req, res) {
  const TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
  if (!TOKEN) return res.status(503).json({ error: 'no_token' });

  const BASE = 'https://graph.instagram.com/v21.0';

  // 1) Identifica conta IG conectada
  const meResp = await fetch(`${BASE}/me?fields=id,username,user_id,account_type&access_token=${encodeURIComponent(TOKEN)}`);
  const meData = await meResp.json();
  if (!meResp.ok || !meData.id) return res.status(502).json({ error: 'me_failed', response: meData });

  // 2) Tenta subscrever com vários conjuntos de fields, vê qual aceita
  const fieldsAttempts = [
    'comments,messages,messaging_postbacks,message_reactions',
    'comments,messages,mentions,messaging_referral',
    'comments,messages',
    'comments',
    'feed,comments,messages',
    'live_comments,comments,messages',
    'instagram_manage_comments,instagram_manage_messages'
  ];
  const results = [];
  for (const f of fieldsAttempts) {
    try {
      const r = await fetch(`${BASE}/${meData.id}/subscribed_apps?subscribed_fields=${f}&access_token=${encodeURIComponent(TOKEN)}`, { method: 'POST' });
      const d = await r.json();
      results.push({ fields: f, ok: r.ok, response: d });
    } catch(e) {
      results.push({ fields: f, error: e.message });
    }
  }

  // 3) Lista subscriptions atuais
  const listResp = await fetch(`${BASE}/${meData.id}/subscribed_apps?access_token=${encodeURIComponent(TOKEN)}`);
  const listData = await listResp.json();

  return res.status(200).json({
    me: meData,
    attempts: results,
    current_subscriptions: listData
  });
}

// ===== IG POLLING (READ-ONLY): lê posts + comentários via API. Zero risco, só GET. =====
async function handleIgPollTest(req, res) {
  const TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
  if (!TOKEN) return res.status(503).json({ error: 'no_token' });
  const BASE = 'https://graph.instagram.com/v21.0';

  const meResp = await fetch(`${BASE}/me?fields=id,username&access_token=${encodeURIComponent(TOKEN)}`);
  const me = await meResp.json();
  if (!me.id) return res.status(502).json({ step: 'me', response: me });

  const mediaResp = await fetch(`${BASE}/${me.id}/media?fields=id,caption,timestamp,comments_count,permalink&limit=5&access_token=${encodeURIComponent(TOKEN)}`);
  const media = await mediaResp.json();
  if (!media.data) return res.status(502).json({ step: 'media', response: media });

  const out = { me, posts: [] };
  for (const post of media.data.slice(0, 3)) {
    const cResp = await fetch(`${BASE}/${post.id}/comments?fields=id,text,username,timestamp,from&access_token=${encodeURIComponent(TOKEN)}`);
    const c = await cResp.json();
    out.posts.push({
      id: post.id,
      caption: (post.caption || '').slice(0, 60),
      comments_count: post.comments_count,
      comments: c.data ? c.data.map(x => ({ id: x.id, text: x.text, user: x.username || x.from?.username })) : c
    });
  }
  return res.status(200).json(out);
}

// ===== IG POLLING RUN: lê comentários + manda DM (sem webhook). Cron chama isso. =====
// Safeguards: keyword match, dedup por comment_id, rate 1/user/24h, opt-out STOP.
async function handleIgPollRun(req, res) {
  // dry=diag: só leitura/diagnóstico, NÃO manda DM, sem auth (seguro)
  const diagMode = req.query?.dry === 'diag';
  // Auth: cron secret OU admin JWT (pro botão de teste no admin)
  const secret = req.query?.secret || req.headers['x-cron-secret'];
  const cronOk = process.env.CRON_SECRET && secret === process.env.CRON_SECRET;
  if (!cronOk && !diagMode) {
    const jwt = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    let adminOk = false;
    if (jwt && jwt.length > 50) {
      try {
        const ur = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${jwt}`, apikey: SUPABASE_KEY } });
        if (ur.ok) {
          const u = await ur.json();
          if (u?.id) {
            const pr = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${u.id}&is_admin=eq.true&select=id`, { headers: { Authorization: `Bearer ${jwt}`, apikey: SUPABASE_KEY } });
            if (pr.ok) { const rows = await pr.json(); adminOk = Array.isArray(rows) && rows.length > 0; }
          }
        }
      } catch {}
    }
    if (!adminOk) return res.status(403).json({ error: 'forbidden' });
  }

  const TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
  if (!TOKEN) return res.status(503).json({ error: 'no_token' });
  // RLS nas tabelas ig_* exige service role key (anon é bloqueada)
  const SK = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
  const BASE = 'https://graph.instagram.com/v21.0';
  const maxDm = parseInt(req.query?.max || '5', 10); // cap de DMs por execução (anti-spam)

  // 1) me + keywords ativas
  const meResp = await fetch(`${BASE}/me?fields=id,username&access_token=${encodeURIComponent(TOKEN)}`);
  const me = await meResp.json();
  if (!me.id) return res.status(502).json({ step: 'me', response: me });

  const repliesResp = await fetch(`${SUPABASE_URL}/rest/v1/ig_auto_replies?enabled=eq.true&select=*`, {
    headers: { apikey: SK, Authorization: `Bearer ${SK}` }
  });
  const replies = await repliesResp.json();
  if (!Array.isArray(replies) || !replies.length) return res.status(200).json({ status: 'no_keywords' });

  // 2) media recente (últimos 10 posts)
  const mediaResp = await fetch(`${BASE}/${me.id}/media?fields=id,comments_count&limit=10&access_token=${encodeURIComponent(TOKEN)}`);
  const media = await mediaResp.json();
  if (!media.data) return res.status(502).json({ step: 'media', response: media });

  const results = [];
  const debug = { posts_checked: 0, comments_seen: 0, matched: 0 };
  let dmSent = 0;

  for (const post of media.data) {
    if (dmSent >= maxDm) break;
    debug.posts_checked++;

    const cResp = await fetch(`${BASE}/${post.id}/comments?fields=id,text,username,from&access_token=${encodeURIComponent(TOKEN)}`);
    const c = await cResp.json();
    if (!c.data) continue;
    debug.comments_seen += c.data.length;

    for (const comment of c.data) {
      if (dmSent >= maxDm) break;
      const text = (comment.text || '').trim();
      const commentId = comment.id;
      const fromUser = comment.from?.id || comment.username || '';
      if (!text || !commentId) continue;

      // opt-out STOP
      if (/\bstop\b|\bparar\b/i.test(text)) continue;

      // match keyword
      const lower = text.toLowerCase();
      const matched = replies.find(r => {
        if (r.post_id && r.post_id !== post.id) return false;
        const kw = (r.keyword || '').toLowerCase();
        if (!kw) return false;
        if (r.match_mode === 'exact') return lower === kw;
        if (r.match_mode === 'word_boundary') return new RegExp(`\\b${kw}\\b`, 'i').test(text);
        return lower.includes(kw);
      });
      if (!matched) continue;
      debug.matched++;

      // modo diag: não manda DM, só reporta o que achou
      if (diagMode) {
        results.push({ comment: commentId, user: comment.username, text, keyword: matched.keyword, status: 'WOULD_SEND' });
        continue;
      }

      // dedup: já respondeu esse comment_id?
      const dupResp = await fetch(`${SUPABASE_URL}/rest/v1/ig_dm_log?comment_id=eq.${encodeURIComponent(commentId)}&select=id&limit=1`, {
        headers: { apikey: SK, Authorization: `Bearer ${SK}` }
      });
      const dup = await dupResp.json();
      if (Array.isArray(dup) && dup.length) { results.push({ comment: commentId, status: 'already_replied' }); continue; }

      // escolhe template
      const templates = Array.isArray(matched.reply_templates) ? matched.reply_templates : [];
      if (!templates.length) continue;
      const idx = Math.floor(Math.random() * templates.length);
      const msg = String(templates[idx]).replace(/\{link\}/g, matched.reply_link || '');

      // manda private reply ao comentário
      const sendResp = await fetch(`${BASE}/${me.id}/messages?access_token=${encodeURIComponent(TOKEN)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: { comment_id: commentId }, message: { text: msg } })
      });
      const sendData = await sendResp.json().catch(() => ({}));
      const sentOk = sendResp.ok && !sendData.error;

      // ENGAJAMENTO: responde PUBLICAMENTE ao comentário ("sent you a DM 📩")
      // Gera +comentários no post = algoritmo impulsiona. Só se a DM foi OK.
      let publicReplyOk = false;
      const pubReplies = Array.isArray(matched.public_replies) ? matched.public_replies : [];
      if (sentOk && pubReplies.length) {
        const pubMsg = String(pubReplies[Math.floor(Math.random() * pubReplies.length)]);
        try {
          const prResp = await fetch(`${BASE}/${commentId}/replies?access_token=${encodeURIComponent(TOKEN)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: pubMsg })
          });
          publicReplyOk = prResp.ok;
        } catch {}
      }

      await fetch(`${SUPABASE_URL}/rest/v1/ig_dm_log`, {
        method: 'POST',
        headers: { apikey: SK, Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment_id: commentId, ig_user_id: fromUser, post_id: post.id,
          keyword_matched: matched.keyword, reply_id: matched.id, template_used: idx,
          dm_status: sentOk ? 'sent' : 'failed', meta_response: sendData
        })
      }).catch(()=>{});

      results.push({ comment: commentId, user: comment.username, keyword: matched.keyword, status: sentOk ? 'sent' : 'failed', public_reply: publicReplyOk, error: sentOk ? undefined : sendData });
      if (sentOk) dmSent++;
    }
  }

  return res.status(200).json({ dmSent, debug, results });
}

// ===== Helper: valida admin JWT =====
async function isAdminJwt(req) {
  const jwt = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!jwt || jwt.length < 50) return false;
  try {
    const ur = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${jwt}`, apikey: SUPABASE_KEY } });
    if (!ur.ok) return false;
    const u = await ur.json();
    if (!u?.id) return false;
    const pr = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${u.id}&is_admin=eq.true&select=id`, { headers: { Authorization: `Bearer ${jwt}`, apikey: SUPABASE_KEY } });
    if (!pr.ok) return false;
    const rows = await pr.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch { return false; }
}

// ===== CRUD das automações IG (painel admin) =====
async function handleIgAdmin(req, res) {
  if (!(await isAdminJwt(req))) return res.status(403).json({ error: 'forbidden' });
  const SK = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
  const op = req.query?.op || 'list';
  const H = { apikey: SK, Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json' };

  if (op === 'list') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/ig_auto_replies?select=*&order=id.asc`, { headers: H });
    const rows = await r.json();
    // stats: total DMs por keyword
    const statsR = await fetch(`${SUPABASE_URL}/rest/v1/ig_dm_log?select=keyword_matched,dm_status`, { headers: H });
    const logs = await statsR.json().catch(() => []);
    const stats = {};
    if (Array.isArray(logs)) for (const l of logs) {
      const k = l.keyword_matched || '?';
      stats[k] = stats[k] || { sent: 0, failed: 0 };
      if (l.dm_status === 'sent') stats[k].sent++; else stats[k].failed++;
    }
    return res.status(200).json({ rows, stats });
  }

  if (op === 'save') {
    const b = req.body || {};
    const payload = {
      keyword: String(b.keyword || '').trim().toUpperCase(),
      reply_templates: Array.isArray(b.reply_templates) ? b.reply_templates : [],
      public_replies: Array.isArray(b.public_replies) ? b.public_replies : [],
      reply_link: b.reply_link || null,
      post_id: b.post_id || null,
      match_mode: b.match_mode || 'contains',
      enabled: b.enabled !== false,
      require_follow: !!b.require_follow,
      notes: b.notes || null
    };
    if (!payload.keyword || !payload.reply_templates.length) {
      return res.status(400).json({ error: 'keyword e ao menos 1 template sao obrigatorios' });
    }
    let r;
    if (b.id) {
      r = await fetch(`${SUPABASE_URL}/rest/v1/ig_auto_replies?id=eq.${b.id}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify(payload) });
    } else {
      r = await fetch(`${SUPABASE_URL}/rest/v1/ig_auto_replies`, { method: 'POST', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify(payload) });
    }
    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: 'save_failed', detail: data });
    return res.status(200).json({ ok: true, row: Array.isArray(data) ? data[0] : data });
  }

  if (op === 'toggle') {
    const id = req.query?.id; const enabled = req.query?.enabled === '1';
    if (!id) return res.status(400).json({ error: 'missing id' });
    const r = await fetch(`${SUPABASE_URL}/rest/v1/ig_auto_replies?id=eq.${id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ enabled }) });
    return res.status(r.ok ? 200 : 500).json({ ok: r.ok });
  }

  if (op === 'delete') {
    const id = req.query?.id;
    if (!id) return res.status(400).json({ error: 'missing id' });
    const r = await fetch(`${SUPABASE_URL}/rest/v1/ig_auto_replies?id=eq.${id}`, { method: 'DELETE', headers: H });
    return res.status(r.ok ? 200 : 500).json({ ok: r.ok });
  }

  return res.status(400).json({ error: 'unknown op' });
}

module.exports = async (req, res) => {
  const action = req.query?.action || '';

  // Auto-detect: se chegou POST sem action mas com `entry` no body = é webhook Meta. Desvia.
  if (req.method === 'POST' && Array.isArray(req.body?.entry) && !action) {
    return handleIgWebhook(req, res);
  }
  // GET com hub.challenge = também webhook verification
  if (req.method === 'GET' && req.query?.['hub.challenge'] && !action) {
    return handleIgWebhook(req, res);
  }

  if (action === 'ig_webhook') return handleIgWebhook(req, res);
  if (action === 'ig_subscribe') return handleIgSubscribe(req, res);
  if (action === 'ig_poll_test') return handleIgPollTest(req, res);
  if (action === 'ig_poll_run') return handleIgPollRun(req, res);
  if (action === 'ig_admin') return handleIgAdmin(req, res);
  if (action === 'x_daily') return handleXDaily(req, res);
  if (action === 'candles') return handleCandles(req, res);
  if (action === 'x_cleanup') return handleXCleanup(req, res);
  if (action === 'x_stats') return handleXStats(req, res);
  if (action === 'x_replyjack') return handleXReplyJack(req, res);
  if (action === 'x_post_text') return handleXPostText(req, res);
  if (action === 'x_recap') return handleXRecap(req, res);

  const corsOrigin = getCorsOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (!rateLimit(ip)) return res.status(429).json({ error: 'Rate limit: 20/min' });

  // Pool de keys: GEMINI_API_KEY pode ter múltiplas keys separadas por vírgula
  const KEYS = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
  if (!KEYS.length) return res.status(503).json({ error: 'Bot temporarily unavailable' });

  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 32000) return res.status(413).json({ error: 'Payload too large' });

  const { messages, lang, traderName, geo } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing messages' });
  }
  if (messages.length > 20) return res.status(400).json({ error: 'Too many messages (max 20)' });

  const safeName = typeof traderName === 'string' ? traderName.replace(/[^\p{L}\p{M}\s'-]/gu, '').slice(0, 30) : '';
  const safeGeo = typeof geo === 'string' ? geo.replace(/[^\p{L}\p{M}\s,.-]/gu, '').slice(0, 60) : '';

  const langName = LANG_NAMES[lang] || LANG_NAMES.en;
  let systemText = BOT_SYSTEM;
  if (safeName) systemText += `\n\nUSER CONTEXT:\n- Name: ${safeName}. Address them by name naturally, not in every reply. Infer gender from the name and use correct grammatical gender.`;
  if (safeGeo) systemText += `${safeName ? '' : '\n\nUSER CONTEXT:'}\n- Location (from IP): ${safeGeo}. Use only if relevant (e.g. payment methods, timezone for events). Never mention IP tracking.`;
  const promoBlock = await getLivePromoBlock();
  if (promoBlock) systemText += promoBlock;
  const lastUserMsg = (messages.slice().reverse().find(function (m) { return m.role !== 'assistant'; }) || {}).content || '';
  const kbBlock = await getFirmKB(lastUserMsg);
  if (kbBlock) systemText += kbBlock;
  systemText += `\n\nRespond in ${langName}. If the user writes in a different language, switch to theirs. NEVER cut off mid-sentence, always finish your complete answer.`;

  const contents = messages.slice(-20).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content || '').slice(0, 2000) }],
  }));

  const bodyPayload = {
    systemInstruction: { parts: [{ text: systemText }] },
    contents,
    generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
  };
  const payload = JSON.stringify(bodyPayload);

  // Round-robin start index to distribute load across keys
  if (typeof module.exports._keyIdx === 'undefined') module.exports._keyIdx = 0;
  const startIdx = module.exports._keyIdx % KEYS.length;
  module.exports._keyIdx++;

  const delays = [1500, 3000, 5000];
  const maxAttempts = Math.max(3, KEYS.length * 2);
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
        console.error(`[bot] gemini error (key ${keyIdx}, attempt ${attempt}):`, resp.status, JSON.stringify(data).slice(0, 500));
        if (attempt < maxAttempts - 1) {
          await new Promise(r => setTimeout(r, delays[Math.min(attempt, delays.length - 1)]));
          continue;
        }
        return res.status(502).json({ error: 'Upstream error', status: resp.status });
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) {
        console.error('[bot] empty response:', JSON.stringify(data).slice(0, 300));
        if (attempt < maxAttempts - 1) { await new Promise(r => setTimeout(r, delays[Math.min(attempt, delays.length - 1)])); continue; }
        return res.status(502).json({ error: 'Empty response' });
      }
      return res.status(200).json({ content: [{ text }] });
    } catch (e) {
      console.error(`[bot] fetch error (key ${keyIdx}, attempt ${attempt}):`, e.message);
      if (attempt < maxAttempts - 1) { await new Promise(r => setTimeout(r, delays[Math.min(attempt, delays.length - 1)])); continue; }
      return res.status(500).json({ error: 'Bot error' });
    }
  }
  return res.status(502).json({ error: 'Upstream error after retries' });
};
