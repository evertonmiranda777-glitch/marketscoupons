// Score daily analysis targets vs actual market data
// Runs after market close (e.g. 18:00 ET via GitHub Actions)
// Fetches real candle from Yahoo Finance, compares with predicted targets

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ASSETS = [
  { ticker: 'ES', futSym: 'ES=F' },
  { ticker: 'NQ', futSym: 'NQ=F' },
  { ticker: 'GC', futSym: 'GC=F' },
  { ticker: 'CL', futSym: 'CL=F' },
];

async function fetchDayCandle(futSym) {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(futSym)}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!r.ok) return null;
    const d = await r.json();
    const result = d?.chart?.result?.[0];
    if (!result) return null;
    const q = result.indicators?.quote?.[0];
    if (!q) return null;
    return {
      high: q.high?.[0] || null,
      low: q.low?.[0] || null,
      close: q.close?.[0] || null,
    };
  } catch (e) {
    console.error(`fetchDayCandle ${futSym}: ${e.message}`);
    return null;
  }
}

async function sbQuery(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'PATCH' ? 'return=minimal' : 'return=representation',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts);
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Supabase ${method} ${path}: ${r.status} ${txt.slice(0, 200)}`);
  }
  if (method === 'PATCH') return null;
  return r.json();
}

async function main() {
  if (!SUPABASE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

  const today = new Date().toISOString().slice(0, 10);
  console.log(`=== score-targets ${today} ===`);

  // Get unscored targets for today
  const targets = await sbQuery(`analysis_targets?date=eq.${today}&scored_at=is.null&select=*`);
  if (!targets || !targets.length) {
    console.log('No unscored targets for today.');
    return;
  }

  let scored = 0;
  for (const t of targets) {
    const asset = ASSETS.find(a => a.ticker === t.asset);
    if (!asset) continue;

    const candle = await fetchDayCandle(asset.futSym);
    if (!candle || !candle.high || !candle.low) {
      console.log(`${t.asset}: no candle data, skipping`);
      continue;
    }

    const h = candle.high;
    const l = candle.low;
    const c = candle.close;

    const scoring = {
      actual_high: h,
      actual_low: l,
      actual_close: c,
      bull_trigger_hit: t.bull_trigger ? h >= t.bull_trigger : null,
      bull_t1_hit: t.bull_target_1 ? h >= t.bull_target_1 : null,
      bull_t2_hit: t.bull_target_2 ? h >= t.bull_target_2 : null,
      bull_stop_hit: t.bull_stop ? l <= t.bull_stop : null,
      bear_trigger_hit: t.bear_trigger ? l <= t.bear_trigger : null,
      bear_t1_hit: t.bear_target_1 ? l <= t.bear_target_1 : null,
      bear_t2_hit: t.bear_target_2 ? l <= t.bear_target_2 : null,
      bear_stop_hit: t.bear_stop ? h >= t.bear_stop : null,
      scored_at: new Date().toISOString(),
    };

    await sbQuery(`analysis_targets?date=eq.${today}&asset=eq.${t.asset}`, 'PATCH', scoring);

    const bullHits = [scoring.bull_t1_hit, scoring.bull_t2_hit].filter(x => x === true).length;
    const bearHits = [scoring.bear_t1_hit, scoring.bear_t2_hit].filter(x => x === true).length;
    console.log(`${t.asset}: H=${h.toFixed(2)} L=${l.toFixed(2)} C=${c.toFixed(2)} | Bull targets: ${bullHits}/2 | Bear targets: ${bearHits}/2 | Bull stop hit: ${scoring.bull_stop_hit} | Bear stop hit: ${scoring.bear_stop_hit}`);
    scored++;
  }

  console.log(`Scored ${scored}/${targets.length} assets.`);
}

main().catch(e => { console.error(e); process.exit(1); });
