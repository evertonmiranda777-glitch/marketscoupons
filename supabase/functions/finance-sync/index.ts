// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FIRM_WHITELIST = new Set([
  "apex","bulenox","ftmo","tpt","fn","e2t","the5ers","fundingpips","brightfunded","e8","cti"
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const firm = String(body.firm || "").toLowerCase();
  if (!FIRM_WHITELIST.has(firm)) return json({ error: "firm_not_allowed" }, 400);

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Rows padronizados (Apex/Bulenox): [{date, transactions, commission, clicks_all, clicks_unique, granularity?}]
  const rows: any[] = Array.isArray(body.rows) ? body.rows : [];

  // FTMO snapshot/leads
  const snapshot = body.snapshot || null;
  const leads: any[] = Array.isArray(body.leads) ? body.leads : [];

  const out: any = { ok: true, firm };

  if (rows.length) {
    const normalized = rows
      .filter(r => r && r.date)
      .map(r => ({
        firm_id: firm,
        date: r.date,
        transactions: Number(r.transactions) || 0,
        commission: Number(r.commission) || 0,
        currency: r.currency || (firm === 'ftmo' ? 'EUR' : 'USD'),
        clicks_all: Number(r.clicks_all) || 0,
        clicks_unique: Number(r.clicks_unique) || 0,
        source: String(body.source || 'ext'),
        raw: { granularity: r.granularity || 'day', affiliate_id: body.affiliate_id || null, ...r }
      }));

    if (normalized.length) {
      const { error, count } = await sb
        .from("affiliate_daily_stats")
        .upsert(normalized, { onConflict: "firm_id,date", count: "exact" });
      if (error) return json({ error: "upsert_failed", details: error.message }, 500);
      out.rows_saved = normalized.length;
    }
  }

  if (leads.length) {
    const txs = leads
      .filter(l => l && (l.order_id || l.lead))
      .map(l => ({
        firm_id: firm,
        event_type: "sale",
        transaction_id: l.order_id ? `${firm}:${l.order_id}` : null,
        amount: Number(l.amount) || 0,
        currency: firm === 'ftmo' ? 'EUR' : 'USD',
        status: (l.status || 'pending').toLowerCase(),
        raw_payload: l
      }));

    if (txs.length) {
      const { error } = await sb
        .from("affiliate_conversions")
        .upsert(txs, { onConflict: "firm_id,transaction_id", ignoreDuplicates: false });
      if (error) return json({ error: "upsert_leads_failed", details: error.message }, 500);
      out.leads_saved = txs.length;
    }
  }

  if (snapshot) {
    const today = new Date().toISOString().slice(0, 10);
    const snapRow = {
      firm_id: firm,
      date: today,
      transactions: Number(snapshot.clients_registered) || 0,
      commission: Number(snapshot.ready_for_payout) || 0,
      currency: firm === 'ftmo' ? 'EUR' : 'USD',
      clicks_all: Number(snapshot.clicks) || 0,
      clicks_unique: 0,
      source: String(body.source || 'ext_snapshot'),
      raw: { snapshot }
    };
    const { error } = await sb
      .from("affiliate_daily_stats")
      .upsert([snapRow], { onConflict: "firm_id,date" });
    if (error) return json({ error: "upsert_snap_failed", details: error.message }, 500);
    out.snapshot_saved = true;
  }

  return json(out);
});

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" }
  });
}
