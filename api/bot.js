// Vercel Serverless, Google Gemini 2.5 Flash proxy pro chatbot do site
// POST /api/bot { messages, lang, traderName?, geo? }

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

let _promoCache = { at: 0, text: '' };
async function getLivePromoBlock() {
  const now = Date.now();
  if (now - _promoCache.at < 60_000 && _promoCache.text) return _promoCache.text;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/cms_firms?active=eq.true&select=short_name,name,coupon,discount,discount_type,promo_ends_at,promo_label`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!r.ok) return _promoCache.text || '';
    const firms = await r.json();
    const lines = [];
    for (const f of firms) {
      const name = f.short_name || f.name;
      if (!f.coupon && !f.discount) continue;
      const coupon = f.coupon ? ` coupon ${f.coupon}` : '';
      const pct = f.discount ? ` ${f.discount}% OFF` : '';
      let when = '';
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
          // Promo expirou e não é lifetime, skip pra não vazar info confusa
          continue;
        }
      } else if (f.discount_type) {
        when = `, ${f.discount_type}`;
      }
      lines.push(`- ${name}${coupon}${pct}${when}${f.promo_label ? ` (${f.promo_label})` : ''}`);
    }
    const text = lines.length
      ? `\n\nACTIVE PROMOS (live data, as of ${new Date().toISOString().slice(0,16).replace('T',' ')} UTC, TRUST THIS over any hardcoded info above):\n${lines.join('\n')}\n\nWhen user asks if a promo expires, ALWAYS check this list. If "ENDS IN Xd Xh", say it honestly. If "LIFETIME", say it doesn't expire. Never guess.`
      : '';
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

APEX (Futures), coupon MARKET, 90% OFF LIFETIME. Split 100% up to $25K then 90%. Trailing DD. Target 8%. Min 1 day, eval 30 days. 4 pricing dimensions: Type (Intraday Trail vs EOD Trail) × Size (25K/50K/100K/150K) × Variant (Standard with activation fee vs No Activation Fee) × Pack (1 account vs 5-pack). Platforms: Rithmic, Tradovate, NinjaTrader, WealthCharts. Intraday Standard 1-pack with coupon: 25K $19.90 (was $199), 50K $24.90 ($249), 100K $39.90 ($399), 150K $59.90 ($599). EOD Standard 1-pack with coupon: 25K $39 (was $390), 50K $45 ($450), 100K $59 ($590), 150K $109 ($1090). Intraday No-Activation 1-pack: 25K $69 ($690), 50K $79 ($790), 100K $109 ($1090), 150K $169 ($1690). EOD No-Activation 1-pack: 25K $89 ($890), 50K $109 ($1090). EOD No-Activation 100K and 150K not available. 5-pack discounts available (e.g. Intraday Std 5-pack 100K $175 = $35/account). Perks: no daily loss limit, payout in 5 days, up to 20 accounts, news trading ok, day-1 payout, no recurring fees, no scaling rules, no consistency rule. Trustpilot 4.3 (19.4k).

BULENOX (Futures), coupon MARKET89, 89% OFF LIFETIME. 90% split. Trailing DD AND EOD DD options. Pass in 1 day. No consistency. Platforms: Rithmic, NinjaTrader. Prices with coupon: 25K $15.95, 50K $19.25, 100K $23.65, 150K $35.75, 250K $58.85. Weekly payouts, scaling to $400K, news trading ok. Free 14-day Rithmic trial. Trustpilot 4.7 (1.6k).

FTMO (Forex), no coupon (19% lifetime discount applied via affiliate link). 90% split. Fixed DD -3% daily / -10% total. Target 10%. MT4/MT5/cTrader. 1-step and 2-step challenges. Scaling to $2M. Since 2015, $500M+ paid, 3.5M clients. News trading NOT allowed. Trustpilot 4.8 (43.5k).

FUNDEDNEXT (Forex + Futures), coupon FLEXJU, 40% OFF LIFETIME. 80% split. Stellar 2-Step and Futures Flex programs. MT4/MT5/cTrader/Match-Trader/Rithmic. Guaranteed 24h payout. Scaling to $4M. Trustpilot 4.5 (69.7k).

EARN2TRADE / E2T (Futures), coupon MARKETSCOUPONS, 50% OFF LIFETIME. 80% split. Platforms: Rithmic, NinjaTrader, Finamark, Tradovate, TradingView. Free NinjaTrader/Journalytix license. Scaling to $400K. Min 10 days. 2 programs: TCP (Trader Career Path) and Gauntlet Mini. Trustpilot 4.7 (4.8k).

THE5ERS (Forex + Futures), coupon MARKET, 5% OFF LIFETIME. 100% split. Static DD. Scaling to $4M. MT5/TradingView/Rithmic. 6 programs (Hyper, Pro, High Stakes, Bootcamp, Futures Basecamp, Futures Rebate). Since 2016. Payout avg 16h. Trustpilot 4.7 (28.4k). Min 3 days.

FUNDINGPIPS / FPips (Forex), coupon HELLO, 20% OFF. 100% split. Static DD -3%/-5%. MT5, Match-Trader, cTrader. 4 programs: Zero, 1-Step, 2-Step, Pro. On-demand payouts. Leverage 1:100. Trustpilot 4.5 (57.2k).

BRIGHTFUNDED (Forex), coupon CLNLTPXTT4SOK0PZHARIIQ (yes, that long, copy-paste in checkout), 30% OFF LIFETIME. 100% split. Static DD. Target 8%/5%. MT5/DXtrade/cTrader. Guaranteed 24h payout. Scaling to $400K. Trustpilot status pending. Trustpilot 545 reviews.

E8 MARKETS (Forex/Futures/Crypto), coupon MARKET, 10% OFF. 80% split. DD -3% daily / -6% total. MT5, Match-Trader. 2 products: Signature (EOD DD, from $99) and E8 One (dynamic DD, up to 100% split, from $54). Pass in 1 day. Scaling up to $1M. Trustpilot 4.3 (3.3k).

CITY TRADERS IMPERIUM / CTI (Forex), coupon ADHA30, 30% OFF (1 purchase). 100% split. Static/EOD DD. Match-Trader. 5 programs (1-Step, 2-Step, 3-Step, Instant, Instant Pro). CTI Academy included. Min 3 days. Leverage 1:30. Trustpilot 4.3 (1.7k).

TRADEDAY (Futures), coupon MARKETS, 50% OFF (1 challenge). 80-95% progressive split. 3 account types: Intraday Trailing DD, EOD Trailing DD, Static DD. QuickPay and FastPass programs. Platforms: NinjaTrader, Tradovate, TradingView, Jigsaw. Markets: CME, CBOT, NYMEX, COMEX. Day 1 Payout, no consistency rule, no scaling rules. Based in Chicago. Trustpilot 4.6 (1.3k).

GOAT FUNDED FUTURES (Futures), coupon MARKET, 50% OFF. 80% split (90% with add-on). 4 account types: EOD, Sprint, Instant, Pro. Newer firm. Trustpilot 164 reviews.

TOP ONE FUTURES (Futures), coupon MARKET, 60% OFF. 90% split. Elite Daily program. Trustpilot 4.8 (4.1k).

BLUE GUARDIAN (Forex/Futures), coupon MARKET, 45% OFF. 90% split. Pro Futures program. Trustpilot 3.8 (683).

AQUA FUTURES (Futures), coupon AQUA, 60% OFF. Split 100% up to $15K then 90%. Standard program. Trustpilot 3.2 (157).

BLUEBERRY FUTURES (Futures), coupon MARKET-7652C, 60% OFF. 90% split. Elite program. Newer firm with few reviews (5).

ALPHA FUTURES (Futures), coupon MARKETS026158, 25% OFF. 90% split. Elite program. Trustpilot 4.9 (4.6k).

FUTURES ELITE / FE (Futures), coupon JUNE30, 30% OFF via link. 90% split. Elite program. Trustpilot 4.6 (297).

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

  // Meta envia entries com changes (comment) ou messaging (DM)
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
    message: { text: msg + '\n\n— Reply STOP to opt out.' }
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
// GET ?action=x_daily&asset=ES&dry=1 — preview (não posta)
// POST ?action=x_daily&secret=... — posta de verdade (cron protected)
async function handleXDaily(req, res) {
  const isPreview = req.method === 'GET' || req.query?.dry === '1';
  if (!isPreview) {
    const secret = req.query?.secret || req.headers['x-cron-secret'];
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return res.status(403).json({ error: 'forbidden' });
    }
  }

  // Rotação semanal: seg ES, ter NQ, qua GC, qui CL, sex resumo (ES)
  const WEEK_ASSETS = { 1:'ES', 2:'NQ', 3:'GC', 4:'CL', 5:'ES' };
  const dow = new Date().getDay();
  const asset = (req.query?.asset || WEEK_ASSETS[dow] || 'ES').toUpperCase();
  if (![0,6].includes(dow) === false && !req.query?.asset) {
    // sábado/domingo: skip silencioso
    return res.status(200).json({ skip: 'weekend', dow });
  }

  // Pega análise mais recente do asset (não exige date=today; usa o mais novo)
  const aResp = await fetch(`${SUPABASE_URL}/rest/v1/daily_analysis?asset=eq.${asset}&select=*&order=date.desc&limit=1`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const rows = await aResp.json();
  if (!Array.isArray(rows) || !rows.length) {
    return res.status(404).json({ error: 'no_analysis_yet', asset });
  }
  const a = rows[0];

  // Formata thread (max 280 chars por tweet)
  const thread = buildXThread(a);

  if (isPreview) {
    return res.status(200).json({ asset, thread, preview: true });
  }

  // Postar (precisa OAuth1.0a ou OAuth2 user context — X API exige user token)
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

function buildXThread(a) {
  const arrow = (a.bias||'').toLowerCase().includes('bull') ? '↗' : (a.bias||'').toLowerCase().includes('bear') ? '↘' : '➡';
  const price = a.last_price ? Number(a.last_price).toFixed(2) : '—';
  const chg = a.change_pct != null ? `${a.change_pct > 0 ? '+' : ''}${Number(a.change_pct).toFixed(2)}%` : '';
  const conf = a.confidence != null ? `${a.confidence}/10` : '';

  const t1 = `📊 ${a.asset_name || a.asset} Outlook · ${a.date}\n\n${arrow} ${a.bias || 'Neutral'} ${conf ? `(${conf})` : ''}\nLast: ${price} ${chg}\n\nFull thread ↓`.slice(0, 275);

  const ctx = a.context && typeof a.context === 'object' ? (a.context.macro || a.context.summary || JSON.stringify(a.context).slice(0,200)) : '';
  const t2 = `🌐 Macro\n\n${String(ctx).slice(0, 260)}`.slice(0, 275);

  const zones = [
    a.support_1 && `S1: ${a.support_1}`,
    a.support_2 && `S2: ${a.support_2}`,
    a.resistance_1 && `R1: ${a.resistance_1}`,
    a.resistance_2 && `R2: ${a.resistance_2}`,
  ].filter(Boolean).join('\n');
  const t3 = `🎯 Key zones\n\n${zones || '—'}`.slice(0, 275);

  const bull = a.scenario_bull && typeof a.scenario_bull === 'object' ? (a.scenario_bull.summary || a.scenario_bull.text || '') : '';
  const bear = a.scenario_bear && typeof a.scenario_bear === 'object' ? (a.scenario_bear.summary || a.scenario_bear.text || '') : '';
  const t4parts = [];
  if (bull) t4parts.push(`📈 ${String(bull).slice(0,90)}`);
  if (bear) t4parts.push(`📉 ${String(bear).slice(0,90)}`);
  const t4 = `${t4parts.join('\n\n') || 'See full analysis →'}\n\n→ marketscoupons.com/analysis?utm_source=x&utm_medium=daily&utm_campaign=${a.asset}`.slice(0, 275);

  return [t1, t2, t3, t4].filter(t => t && t.trim().length > 0);
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

module.exports = async (req, res) => {
  const action = req.query?.action || '';
  if (action === 'ig_webhook') return handleIgWebhook(req, res);
  if (action === 'x_daily') return handleXDaily(req, res);
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
