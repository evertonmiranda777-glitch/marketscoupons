// Meta Ads insights sync → ad_spend_daily
// GET/POST ?days=7  (default 7; cron diario)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_TOKEN = Deno.env.get("META_ADS_TOKEN")!;

// Suporta multiplas contas via META_AD_ACCOUNT_IDS (CSV) com fallback pra
// META_AD_ACCOUNT_ID (legado single).
const RAW_IDS =
  Deno.env.get("META_AD_ACCOUNT_IDS") ||
  Deno.env.get("META_AD_ACCOUNT_ID") ||
  "";
const ACCOUNT_IDS = RAW_IDS
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((id) => (id.startsWith("act_") ? id : `act_${id}`));

async function syncAccount(acct: string, days: number) {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const until = new Date().toISOString().slice(0, 10);

  // Busca moeda da conta
  let accountCurrency = "USD";
  try {
    const accRes = await fetch(`https://graph.facebook.com/v21.0/${acct}?fields=currency&access_token=${META_TOKEN}`);
    const accJson = await accRes.json();
    if (accJson.currency) accountCurrency = accJson.currency;
  } catch {}

  const fields = [
    "date_start","campaign_id","campaign_name","adset_id","adset_name",
    "spend","impressions","clicks","actions","action_values"
  ].join(",");

  const api = `https://graph.facebook.com/v21.0/${acct}/insights` +
    `?fields=${fields}` +
    `&level=adset` +
    `&time_increment=1` +
    `&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}` +
    `&limit=500` +
    `&access_token=${META_TOKEN}`;

  let all: any[] = [];
  let next: string | null = api;
  while (next) {
    const r = await fetch(next);
    const j = await r.json();
    if (!r.ok) throw new Error(`meta_api_error account=${acct} ${JSON.stringify(j)}`);
    all = all.concat(j.data || []);
    next = j.paging?.next || null;
    if (all.length > 5000) break; // safety
  }

  return all.map((r: any) => {
    const convs = (r.actions || []).find((a: any) =>
      ["purchase","offsite_conversion.fb_pixel_purchase","complete_registration"].includes(a.action_type)
    );
    const convVal = (r.action_values || []).find((a: any) => a.action_type === "purchase");
    return {
      date: r.date_start,
      platform: "meta",
      account_id: acct,
      campaign_id: r.campaign_id || null,
      campaign_name: r.campaign_name || null,
      adset_id: r.adset_id || null,
      adset_name: r.adset_name || null,
      spend: Number(r.spend) || 0,
      impressions: Number(r.impressions) || 0,
      clicks: Number(r.clicks) || 0,
      conversions: convs ? Number(convs.value) : 0,
      conversion_value: convVal ? Number(convVal.value) : 0,
      currency: accountCurrency,
      firm_id: null,
      source: "meta_insights_v1",
      raw: r
    };
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const days = Math.min(parseInt(url.searchParams.get("days") || "7"), 90);

  if (!META_TOKEN || !ACCOUNT_IDS.length) {
    return json({ error: "missing_secrets", note: "Set META_ADS_TOKEN and META_AD_ACCOUNT_IDS" }, 500);
  }

  const perAccount: Record<string, { rows: number; spend: number; error?: string }> = {};
  let allRows: any[] = [];

  for (const acct of ACCOUNT_IDS) {
    try {
      const rows = await syncAccount(acct, days);
      allRows = allRows.concat(rows);
      perAccount[acct] = { rows: rows.length, spend: rows.reduce((a, r) => a + r.spend, 0) };
    } catch (e) {
      perAccount[acct] = { rows: 0, spend: 0, error: String(e) };
    }
  }

  if (!allRows.length) {
    return json({ ok: true, rows: 0, accounts: ACCOUNT_IDS, perAccount, note: "no_insights_returned" });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { error } = await sb
    .from("ad_spend_daily")
    .upsert(allRows, { onConflict: "date,platform,campaign_id,adset_id" });

  if (error) return json({ error: "upsert_failed", details: error.message }, 500);

  const totalSpend = allRows.reduce((a, r) => a + r.spend, 0);
  return json({ ok: true, rows: allRows.length, days, accounts: ACCOUNT_IDS, total_spend: totalSpend, perAccount });
});

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" }
  });
}
