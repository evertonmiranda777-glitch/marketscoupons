// Backfill scoring for past analysis_targets that never got scored.
// Pulls 90d of daily candles from Yahoo per asset, scores every unscored target.
// Usage: SUPABASE_SERVICE_ROLE_KEY=... node scripts/score-targets-backfill.js

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ASSETS = [
  { ticker: 'ES', futSym: 'ES=F' },
  { ticker: 'NQ', futSym: 'NQ=F' },
  { ticker: 'GC', futSym: 'GC=F' },
  { ticker: 'CL', futSym: 'CL=F' },
];

async function fetchHistorical(futSym, rangeDays = 90) {
  const r = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(futSym)}?interval=1d&range=${rangeDays}d`,
    { headers: { 'User-Agent': 'Mozilla/5.0' } }
  );
  if (!r.ok) return null;
  const d = await r.json();
  const result = d?.chart?.result?.[0];
  if (!result) return null;
  const ts = result.timestamp || [];
  const q = result.indicators?.quote?.[0];
  if (!q) return null;
  const map = {};
  ts.forEach((t, i) => {
    const date = new Date(t * 1000).toISOString().slice(0, 10);
    map[date] = {
      high: q.high?.[i] ?? null,
      low: q.low?.[i] ?? null,
      close: q.close?.[i] ?? null,
    };
  });
  return map;
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

  const targets = await sbQuery(`analysis_targets?scored_at=is.null&select=*&order=date.desc&limit=500`);
  if (!targets || !targets.length) { console.log('Nothing to backfill.'); return; }

  console.log(`${targets.length} unscored targets found.`);

  const candles = {};
  for (const a of ASSETS) {
    candles[a.ticker] = await fetchHistorical(a.futSym, 90);
    const n = candles[a.ticker] ? Object.keys(candles[a.ticker]).length : 0;
    console.log(`${a.ticker}: fetched ${n} daily candles`);
  }

  let scored = 0, skipped = 0;
  for (const t of targets) {
    const map = candles[t.asset];
    const candle = map?.[t.date];
    if (!candle || candle.high == null || candle.low == null) { skipped++; continue; }

    const h = candle.high, l = candle.low, c = candle.close;
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

    await sbQuery(`analysis_targets?date=eq.${t.date}&asset=eq.${t.asset}`, 'PATCH', scoring);
    scored++;
    const bullHits = [scoring.bull_t1_hit, scoring.bull_t2_hit].filter(x => x === true).length;
    console.log(`${t.date} ${t.asset}: H=${h.toFixed(2)} L=${l.toFixed(2)} | Bull T ${bullHits}/2 | Stop ${scoring.bull_stop_hit ? 'HIT' : 'ok'}`);
  }
  console.log(`\nBackfilled ${scored}/${targets.length} (skipped ${skipped} — no candle data).`);
}

main().catch(e => { console.error(e); process.exit(1); });
