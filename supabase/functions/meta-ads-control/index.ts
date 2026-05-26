// Meta Ads Control — lista campanhas ativas + pausa/reativa
// GET  ?action=active            → [{id,name,status,effective_status,daily_budget}]
// POST ?action=pause body={id}   → set status=PAUSED
// POST ?action=resume body={id}  → set status=ACTIVE
//
// Acao destrutiva (pause/resume) exige Authorization: Bearer <admin_jwt>.
// Verifica via Supabase Auth user_metadata.is_admin OU email allowlist.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_TOKEN = Deno.env.get("META_ADS_TOKEN")!;
const RAW_IDS =
  Deno.env.get("META_AD_ACCOUNT_IDS") ||
  Deno.env.get("META_AD_ACCOUNT_ID") ||
  "";
const ACCOUNT_IDS = RAW_IDS
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((id) => (id.startsWith("act_") ? id : `act_${id}`));

const ADMIN_EMAILS = new Set(["evertonmiranda777@gmail.com"]);

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" }
  });
}

async function verifyAdmin(authHeader: string | null): Promise<{ ok: boolean; email?: string; debug?: any }> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return { ok: false, debug: "no_auth_header" };
  const jwt = authHeader.slice(7);
  try {
    // Decoda JWT payload localmente pra pegar email (sem chamar auth API)
    const parts = jwt.split(".");
    if (parts.length !== 3) return { ok: false, debug: "bad_jwt_shape" };
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    const email = payload?.email || "";
    const role = payload?.role || "";
    const isAdminMeta = payload?.user_metadata?.is_admin || payload?.app_metadata?.role === "admin";
    if (isAdminMeta) return { ok: true, email };
    if (email && ADMIN_EMAILS.has(email)) return { ok: true, email };
    return { ok: false, email, debug: { role, isAdminMeta } };
  } catch (e) { return { ok: false, debug: String(e) }; }
}

async function listActiveCampaigns() {
  if (!META_TOKEN || !ACCOUNT_IDS.length) {
    return { error: "missing_secrets" };
  }
  const out: any[] = [];
  for (const acct of ACCOUNT_IDS) {
    let next: string | null =
      `https://graph.facebook.com/v21.0/${acct}/campaigns` +
      `?fields=id,name,status,effective_status,daily_budget,lifetime_budget,objective` +
      `&effective_status=["ACTIVE","IN_PROCESS"]` +
      `&limit=200&access_token=${META_TOKEN}`;
    while (next) {
      const r = await fetch(next);
      const j = await r.json();
      if (!r.ok) return { error: "meta_api_error", account: acct, details: j };
      (j.data || []).forEach((c: any) => out.push({ ...c, account_id: acct }));
      next = j.paging?.next || null;
      if (out.length > 1000) break;
    }
  }
  // So as efetivamente ATIVAS no feed
  return { ok: true, count: out.length, campaigns: out };
}

async function setCampaignStatus(campaign_id: string, status: "ACTIVE" | "PAUSED") {
  const r = await fetch(`https://graph.facebook.com/v21.0/${campaign_id}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `status=${status}&access_token=${encodeURIComponent(META_TOKEN)}`
  });
  const j = await r.json();
  if (!r.ok) return { ok: false, error: "meta_api_error", details: j };
  return { ok: true, result: j };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "";

  if (req.method === "GET" && action === "active") {
    const r = await listActiveCampaigns();
    return json(r);
  }

  if (req.method === "POST" && (action === "pause" || action === "resume")) {
    const adm = await verifyAdmin(req.headers.get("authorization"));
    if (!adm.ok) return json({ error: "admin_only", debug: adm.debug, email: adm.email }, 403);
    let body: any = {};
    try { body = await req.json(); } catch {}
    const id = String(body.campaign_id || "").trim();
    if (!id) return json({ error: "missing_campaign_id" }, 400);
    const status = action === "pause" ? "PAUSED" : "ACTIVE";
    const r = await setCampaignStatus(id, status);
    return json({ ...r, by: adm.email }, r.ok ? 200 : 500);
  }

  return json({ error: "unknown_action", hint: "GET ?action=active | POST ?action=pause|resume {campaign_id}" }, 400);
});
