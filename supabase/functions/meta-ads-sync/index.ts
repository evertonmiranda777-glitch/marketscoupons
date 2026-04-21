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
const META_ACCOUNT_ID = Deno.env.get("META_AD_ACCOUNT_ID")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const days = Math.min(parseInt(url.searchParams.get("days") || "7"), 90);

  if (!META_TOKEN || !META_ACCOUNT_ID) {
    return json({ error: "missing_secrets" }, 500);
  }

  const acct = META_ACCOUNT_ID.startsWith("act_") ? META_ACCOUNT_ID : `act_${META_ACCOUNT_ID}`;
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
  try {
    while (next) {
      const r = await fetch(next);
      const j = await r.json();
      if (!r.ok) return json({ error: "meta_api_error", details: j }, 500);
      all = all.concat(j.data || []);
      next = j.paging?.next || null;
      if (all.length > 5000) break; // safety
    }
  } catch (e) {
    return json({ error: "fetch_failed", message: String(e) }, 500);
  }

  if (!all.length) return json({ ok: true, rows: 0, note: "no_insights_returned" });

  const rows = all.map((r: any) => {
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

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { error } = await sb
    .from("ad_spend_daily")
    .upsert(rows, { onConflict: "date,platform,campaign_id,adset_id" });

  if (error) return json({ error: "upsert_failed", details: error.message }, 500);

  const totalSpend = rows.reduce((a, r) => a + r.spend, 0);
  return json({ ok: true, rows: rows.length, days, total_spend: totalSpend });
});

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" }
  });
}
