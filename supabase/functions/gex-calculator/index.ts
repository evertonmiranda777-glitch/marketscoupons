import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TICKERS = [
  { cboe: "_SPX", name: "SPX", site: "ES" },
  { cboe: "_NDX", name: "NDX", site: "NQ" },
  { cboe: "SPY",  name: "SPY", site: "SPY" },
  { cboe: "QQQ",  name: "QQQ", site: "QQQ" },
  { cboe: "AAPL", name: "AAPL", site: "AAPL" },
  { cboe: "TSLA", name: "TSLA", site: "TSLA" },
  { cboe: "NVDA", name: "NVDA", site: "NVDA" },
  { cboe: "MSFT", name: "MSFT", site: "MSFT" },
  { cboe: "AMZN", name: "AMZN", site: "AMZN" },
  { cboe: "META", name: "META", site: "META" },
  { cboe: "GOOGL", name: "GOOGL", site: "GOOGL" },
  { cboe: "GLD",  name: "GLD", site: "GLD" },
];

const CONTRACT_SIZE = 100;

interface OptionRecord {
  option: string;
  gamma: number;
  open_interest: number;
  strike: number;
  type: "C" | "P";
  expiration: string;
  iv: number;
  delta: number;
}

// Standard normal PDF and CDF
function normPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}
function normCDF(x: number): number {
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);
  return 0.5 * (1.0 + sign * y);
}

function calcD1(S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0 || sigma <= 0) return 0;
  return (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
}

// Vanna = dDelta/dVol = (d1 * d2 * normPDF(d1)) / (S * sigma * sqrt(T)) ... simplified
// per strike: vanna_exposure = vanna * OI * CONTRACT_SIZE * spot
function calcVanna(S: number, K: number, T: number, sigma: number, oi: number, type: "C"|"P"): number {
  if (T <= 0 || sigma <= 0) return 0;
  const r = 0.045;
  const sqrtT = Math.sqrt(T);
  const d1 = calcD1(S, K, T, r, sigma);
  const d2 = d1 - sigma * sqrtT;
  const vanna = -normPDF(d1) * d2 / (S * sigma * sqrtT);
  const sign = type === "P" ? -1 : 1;
  return sign * vanna * oi * CONTRACT_SIZE * S;
}

// Charm = dDelta/dTime (theta of delta)
// charm = -normPDF(d1) * (2*r*T - d2*sigma*sqrt(T)) / (2*T*sigma*sqrt(T))
function calcCharm(S: number, K: number, T: number, sigma: number, oi: number, type: "C"|"P"): number {
  if (T <= 0 || sigma <= 0) return 0;
  const r = 0.045;
  const sqrtT = Math.sqrt(T);
  const d1 = calcD1(S, K, T, r, sigma);
  const d2 = d1 - sigma * sqrtT;
  const charm = -normPDF(d1) * (2 * r * T - d2 * sigma * sqrtT) / (2 * T * sigma * sqrtT);
  const sign = type === "P" ? -1 : 1;
  return sign * charm * oi * CONTRACT_SIZE;
}

async function fetchCBOE(cboeSymbol: string): Promise<{ spot: number; options: OptionRecord[] } | null> {
  try {
    const url = `https://cdn.cboe.com/api/global/delayed_quotes/options/${cboeSymbol}.json`;
    console.log("Fetching: " + url);
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
    });
    if (!res.ok) { console.log(cboeSymbol + " HTTP " + res.status); return null; }
    const json = await res.json();
    const data = json?.data;
    if (!data) return null;

    const spot = parseFloat(data.current_price) || 0;
    if (!spot) return null;

    const rawOptions = data.options || [];
    const options: OptionRecord[] = [];

    for (const opt of rawOptions) {
      const g = parseFloat(opt.gamma);
      const oi = parseInt(opt.open_interest);
      if (!g || !oi || oi < 100) continue;

      const sym = opt.option || "";
      let type: "C" | "P" = "C";
      let strike = 0;

      if (sym.includes("C")) {
        type = "C";
        const parts = sym.split("C");
        strike = parseFloat(parts[parts.length - 1]) / 1000;
      } else if (sym.includes("P")) {
        type = "P";
        const parts = sym.split("P");
        strike = parseFloat(parts[parts.length - 1]) / 1000;
      }

      if (!strike || strike <= 0) continue;

      const iv = parseFloat(opt.iv) || 0;
      const delta = parseFloat(opt.delta) || 0;

      let expiration = "";
      const dateMatch = sym.match(/(\d{6})[CP]/);
      if (dateMatch) {
        const d = dateMatch[1];
        expiration = `20${d.slice(0,2)}-${d.slice(2,4)}-${d.slice(4,6)}`;
      }

      options.push({ option: sym, gamma: g, open_interest: oi, strike, type, expiration, iv, delta });
    }

    console.log(cboeSymbol + ": spot=" + spot + " options=" + options.length);
    return { spot, options };
  } catch (e: any) {
    console.error(cboeSymbol + " fetch error: " + e.message);
    return null;
  }
}

function calculateGEX(spot: number, options: OptionRecord[], filterExp?: string) {
  const minS = spot * 0.90;
  const maxS = spot * 1.10;

  const filtered = filterExp
    ? options.filter(o => o.expiration === filterExp)
    : options;

  const gexMap: Record<number, number> = {};
  const callGexMap: Record<number, number> = {};
  const putGexMap: Record<number, number> = {};
  const callOI: Record<number, number> = {};
  const putOI: Record<number, number> = {};
  const totalGammaMap: Record<number, number> = {};

  for (const opt of filtered) {
    if (opt.strike < minS || opt.strike > maxS) continue;
    const gex = opt.gamma * opt.open_interest * CONTRACT_SIZE * spot * spot * 0.01;
    const k = Math.round(opt.strike);

    if (!gexMap[k]) gexMap[k] = 0;
    if (!callGexMap[k]) callGexMap[k] = 0;
    if (!putGexMap[k]) putGexMap[k] = 0;
    if (!callOI[k]) callOI[k] = 0;
    if (!putOI[k]) putOI[k] = 0;
    if (!totalGammaMap[k]) totalGammaMap[k] = 0;

    totalGammaMap[k] += Math.abs(gex);

    if (opt.type === "C") {
      gexMap[k] += gex;
      callGexMap[k] += gex;
      callOI[k] += opt.open_interest;
    } else {
      gexMap[k] -= gex;
      putGexMap[k] += gex;
      putOI[k] += opt.open_interest;
    }
  }

  const strikes = Object.keys(gexMap).map(Number).sort((a, b) => a - b);
  const gexValues = strikes.map(k => gexMap[k]);
  const totalGex = gexValues.reduce((a, b) => a + b, 0);

  // Zero Gamma / Gamma Flip — where net GEX crosses zero, closest to spot
  let zeroGamma = spot;
  let bestDist = Infinity;
  for (let i = 0; i < strikes.length - 1; i++) {
    if ((gexValues[i] >= 0 && gexValues[i + 1] < 0) || (gexValues[i] < 0 && gexValues[i + 1] >= 0)) {
      const s1 = strikes[i], s2 = strikes[i + 1];
      const g1 = gexValues[i], g2 = gexValues[i + 1];
      if (g1 !== g2) {
        const cross = s1 + (0 - g1) * (s2 - s1) / (g2 - g1);
        const dist = Math.abs(cross - spot);
        if (dist < bestDist) { bestDist = dist; zeroGamma = cross; }
      }
    }
  }

  // Call Wall = strike with highest CALL gamma exposure above spot
  let callWall = spot, callWallGex = 0;
  for (const k of strikes) {
    if (k >= spot && callGexMap[k] > callWallGex) {
      callWallGex = callGexMap[k]; callWall = k;
    }
  }

  // Put Wall = strike with highest PUT gamma exposure below spot
  let putWall = spot, putWallGex = 0;
  for (const k of strikes) {
    if (k <= spot && putGexMap[k] > putWallGex) {
      putWallGex = putGexMap[k]; putWall = k;
    }
  }

  // HVL = Highest Volume Level (strike with highest total OI)
  let hvl = spot, hvlOI = 0;
  for (const k of strikes) {
    const totalOI = (callOI[k] || 0) + (putOI[k] || 0);
    if (totalOI > hvlOI) { hvlOI = totalOI; hvl = k; }
  }

  // Vol Trigger = strike with highest total absolute gamma
  let volTrigger = spot, vtGamma = 0;
  for (const k of strikes) {
    if (totalGammaMap[k] > vtGamma) { vtGamma = totalGammaMap[k]; volTrigger = k; }
  }

  // Max Pain = strike where total intrinsic value of all options is minimized
  let maxPain = spot, minPain = Infinity;
  for (const testStrike of strikes) {
    let pain = 0;
    for (const k of strikes) {
      if (testStrike > k && callOI[k]) {
        pain += (testStrike - k) * callOI[k] * CONTRACT_SIZE;
      }
      if (testStrike < k && putOI[k]) {
        pain += (k - testStrike) * putOI[k] * CONTRACT_SIZE;
      }
    }
    if (pain < minPain) { minPain = pain; maxPain = testStrike; }
  }

  // Top 50 strikes by absolute GEX for chart
  const topStrikes = strikes
    .map(k => ({ strike: k, gex: Math.round(gexMap[k] / 1e6), type: gexMap[k] >= 0 ? "positive" : "negative" }))
    .sort((a, b) => Math.abs(b.gex) - Math.abs(a.gex))
    .slice(0, 50)
    .sort((a, b) => a.strike - b.strike);

  return {
    zeroGamma: Math.round(zeroGamma),
    putWall, callWall, hvl,
    volTrigger, maxPain,
    totalGex: Math.round(totalGex / 1e6),
    topStrikes,
  };
}

function getExpirations(options: OptionRecord[]): string[] {
  const exps = new Set<string>();
  for (const o of options) {
    if (o.expiration) exps.add(o.expiration);
  }
  return Array.from(exps).sort();
}

// Build per-expiration GEX breakdown for heatmap-like data
function buildExpirationBreakdown(spot: number, options: OptionRecord[], expirations: string[]) {
  const minS = spot * 0.92;
  const maxS = spot * 1.08;
  const breakdown: Array<{ expiration: string; zeroGamma: number; callWall: number; putWall: number; totalGex: number; topStrikes: Array<{strike:number;gex:number;type:string}> }> = [];

  for (const exp of expirations.slice(0, 8)) {
    const result = calculateGEX(spot, options, exp);
    if (result.topStrikes.length < 3) continue;
    breakdown.push({
      expiration: exp,
      zeroGamma: result.zeroGamma,
      callWall: result.callWall,
      putWall: result.putWall,
      totalGex: result.totalGex,
      topStrikes: result.topStrikes.slice(0, 20),
    });
  }
  return breakdown;
}

function calculateVannaCharm(spot: number, options: OptionRecord[], today: string) {
  const minS = spot * 0.90;
  const maxS = spot * 1.10;
  const nowMs = new Date(today + "T16:00:00Z").getTime();

  const vannaMap: Record<number, number> = {};
  const charmMap: Record<number, number> = {};
  let totalVanna = 0, totalCharm = 0;

  for (const opt of options) {
    if (opt.strike < minS || opt.strike > maxS || !opt.iv || !opt.expiration) continue;
    const expMs = new Date(opt.expiration + "T16:00:00Z").getTime();
    const T = (expMs - nowMs) / (365.25 * 24 * 3600 * 1000);
    if (T <= 0.001) continue;

    const v = calcVanna(spot, opt.strike, T, opt.iv, opt.open_interest, opt.type);
    const c = calcCharm(spot, opt.strike, T, opt.iv, opt.open_interest, opt.type);
    const k = Math.round(opt.strike);

    if (!vannaMap[k]) vannaMap[k] = 0;
    if (!charmMap[k]) charmMap[k] = 0;
    vannaMap[k] += v;
    charmMap[k] += c;
    totalVanna += v;
    totalCharm += c;
  }

  const strikes = [...new Set([...Object.keys(vannaMap), ...Object.keys(charmMap)])].map(Number).sort((a, b) => a - b);
  const maxAbsVanna = Math.max(...strikes.map(k => Math.abs(vannaMap[k] || 0)), 1);
  const maxAbsCharm = Math.max(...strikes.map(k => Math.abs(charmMap[k] || 0)), 1);

  const topStrikes = strikes
    .map(k => ({
      strike: k,
      vanna: Math.round((vannaMap[k] || 0) / 1e6),
      charm: Math.round((charmMap[k] || 0) / 1e6),
    }))
    .filter(s => Math.abs(s.vanna) > 0 || Math.abs(s.charm) > 0)
    .sort((a, b) => Math.abs(b.vanna) + Math.abs(b.charm) - Math.abs(a.vanna) - Math.abs(a.charm))
    .slice(0, 40)
    .sort((a, b) => a.strike - b.strike);

  return {
    totalVanna: Math.round(totalVanna / 1e6),
    totalCharm: Math.round(totalCharm / 1e6),
    topStrikes,
  };
}

async function processTicker(t: typeof TICKERS[0], today: string): Promise<string> {
  const data = await fetchCBOE(t.cboe);
  if (!data) return t.site + ": no data";

  const result = calculateGEX(data.spot, data.options);
  const expirations = getExpirations(data.options);
  const expBreakdown = buildExpirationBreakdown(data.spot, data.options, expirations);

  // Vanna & Charm per strike
  const vannaCharm = calculateVannaCharm(data.spot, data.options, today);

  const row = {
    date: today,
    ticker: t.site,
    spot_price: data.spot,
    zero_gamma: result.zeroGamma,
    put_wall: result.putWall,
    call_wall: result.callWall,
    hvl: result.hvl,
    vol_trigger: result.volTrigger,
    max_pain: result.maxPain,
    total_gex: result.totalGex,
    top_strikes: result.topStrikes,
    expirations: expirations.slice(0, 12),
    exp_breakdown: expBreakdown,
    vanna_charm: vannaCharm,
    updated_at: new Date().toISOString(),
  };

  const { error } = await db.from("gex_levels").upsert(row, { onConflict: "date,ticker" });
  if (error) return t.site + ": DB error " + error.message;

  console.log(t.site + ": spot=" + data.spot + " zero=" + result.zeroGamma + " put=" + result.putWall + " call=" + result.callWall + " GEX=" + result.totalGex + "M exps=" + expirations.length);
  return t.site + ": OK";
}

Deno.serve(async function (req: Request) {
  const today = new Date().toISOString().slice(0, 10);
  console.log("=== GEX Calculator v6 " + today + " ===");

  const results: string[] = [];
  for (const t of TICKERS) {
    try {
      const r = await processTicker(t, today);
      results.push(r);
    } catch (e: any) {
      results.push(t.site + ": error " + e.message);
    }
  }

  console.log("Done: " + results.join(" | "));
  return new Response(
    JSON.stringify({ success: true, date: today, results }, null, 2),
    { headers: { "Content-Type": "application/json", "Connection": "keep-alive" } }
  );
});
