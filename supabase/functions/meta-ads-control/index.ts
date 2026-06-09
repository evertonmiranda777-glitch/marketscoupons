// Meta Ads Control — lista campanhas ativas + pausa/reativa + breakdown FB/IG
// GET  ?action=active                       → [{id,name,status,effective_status,daily_budget}]
// GET  ?action=breakdown&since=&until=      → split por publisher_platform (FB/IG/AN) por campanha
// POST ?action=pause body={id}              → set status=PAUSED
// POST ?action=resume body={id}             → set status=ACTIVE
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
  const errors: any[] = [];
  for (const acct of ACCOUNT_IDS) {
    let next: string | null =
      `https://graph.facebook.com/v21.0/${acct}/campaigns` +
      `?fields=id,name,status,effective_status,daily_budget,lifetime_budget,objective` +
      `&effective_status=["ACTIVE","IN_PROCESS"]` +
      `&limit=200&access_token=${META_TOKEN}`;
    let skipped = false;
    while (next && !skipped) {
      try {
        const r = await fetch(next);
        const j = await r.json();
        if (!r.ok) {
          errors.push({ account: acct, error: j?.error?.message || "meta_api_error", code: j?.error?.code });
          skipped = true;
          break;
        }
        (j.data || []).forEach((c: any) => out.push({ ...c, account_id: acct }));
        next = j.paging?.next || null;
        if (out.length > 1000) break;
      } catch (e) {
        errors.push({ account: acct, error: String(e) });
        skipped = true;
      }
    }
  }
  return { ok: true, count: out.length, campaigns: out, errors: errors.length ? errors : undefined };
}

// Insights agregados por campanha × publisher_platform (FB/IG) no periodo.
// Periodo aceita: ?since=YYYY-MM-DD&until=YYYY-MM-DD (default: ultimos 30d).
async function breakdownByPlatform(since: string, until: string) {
  if (!META_TOKEN || !ACCOUNT_IDS.length) return { error: "missing_secrets" };
  const fields = ["campaign_id","campaign_name","spend","impressions","clicks","actions","action_values"].join(",");
  const PURCHASE_TYPES = new Set(["purchase","offsite_conversion.fb_pixel_purchase"]);
  const LEAD_TYPES = new Set(["lead","offsite_conversion.fb_pixel_lead","complete_registration","offsite_conversion.fb_pixel_complete_registration"]);

  // mapa campaign_id -> { name, platforms: { facebook:{...}, instagram:{...}, audience_network:{...} } }
  const agg = new Map<string, any>();
  const errors: any[] = [];

  for (const acct of ACCOUNT_IDS) {
    const api = `https://graph.facebook.com/v21.0/${acct}/insights` +
      `?fields=${fields}` +
      `&level=campaign` +
      `&breakdowns=publisher_platform` +
      `&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}` +
      `&limit=500&access_token=${META_TOKEN}`;

    let next: string | null = api;
    let safety = 0;
    let skipped = false;
    while (next && safety < 20 && !skipped) {
      safety++;
      const r = await fetch(next);
      const j = await r.json();
      if (!r.ok) {
        errors.push({ account: acct, error: j?.error?.message || "meta_api_error", code: j?.error?.code });
        skipped = true;
        break;
      }
      for (const row of (j.data || [])) {
        const cid = row.campaign_id;
        if (!cid) continue;
        const plat = row.publisher_platform || "other";
        const sumByTypes = (set: Set<string>) => (row.actions || [])
          .filter((a: any) => set.has(a.action_type))
          .reduce((acc: number, a: any) => acc + (Number(a.value) || 0), 0);
        const purchases = sumByTypes(PURCHASE_TYPES);
        const leads = sumByTypes(LEAD_TYPES);
        const purchVal = (row.action_values || []).find((a: any) => PURCHASE_TYPES.has(a.action_type));

        if (!agg.has(cid)) {
          agg.set(cid, { campaign_id: cid, campaign_name: row.campaign_name || cid, platforms: {} });
        }
        const c = agg.get(cid);
        c.platforms[plat] = {
          spend: Number(row.spend) || 0,
          impressions: Number(row.impressions) || 0,
          clicks: Number(row.clicks) || 0,
          purchases,
          leads,
          purchase_value: purchVal ? Number(purchVal.value) : 0
        };
      }
      next = j.paging?.next || null;
    }
  }

  return { ok: true, since, until, campaigns: Array.from(agg.values()), errors: errors.length ? errors : undefined };
}

// Insights por campanha × publisher_platform × platform_position no periodo.
// Devolve cada linha de placement (ex: Instagram Reels, Facebook Feed) com gasto/compras/valor.
async function breakdownByPlacement(since: string, until: string) {
  if (!META_TOKEN || !ACCOUNT_IDS.length) return { error: "missing_secrets" };
  const fields = ["campaign_id","campaign_name","spend","impressions","clicks","actions","action_values"].join(",");
  const PURCHASE_TYPES = new Set(["purchase","offsite_conversion.fb_pixel_purchase"]);
  const LEAD_TYPES = new Set(["lead","offsite_conversion.fb_pixel_lead","complete_registration","offsite_conversion.fb_pixel_complete_registration"]);
  const rows: any[] = [];
  const errors: any[] = [];

  for (const acct of ACCOUNT_IDS) {
    const api = `https://graph.facebook.com/v21.0/${acct}/insights` +
      `?fields=${fields}` +
      `&level=campaign` +
      `&breakdowns=publisher_platform,platform_position` +
      `&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}` +
      `&limit=500&access_token=${META_TOKEN}`;
    let next: string | null = api;
    let safety = 0;
    let skipped = false;
    while (next && safety < 30 && !skipped) {
      safety++;
      const r = await fetch(next);
      const j = await r.json();
      if (!r.ok) {
        errors.push({ account: acct, error: j?.error?.message || "meta_api_error", code: j?.error?.code });
        skipped = true;
        break;
      }
      for (const row of (j.data || [])) {
        const sumByTypes = (set: Set<string>) => (row.actions || [])
          .filter((a: any) => set.has(a.action_type))
          .reduce((acc: number, a: any) => acc + (Number(a.value) || 0), 0);
        const purchases = sumByTypes(PURCHASE_TYPES);
        const leads = sumByTypes(LEAD_TYPES);
        const purchVal = (row.action_values || []).find((a: any) => PURCHASE_TYPES.has(a.action_type));
        rows.push({
          campaign_id: row.campaign_id,
          campaign_name: row.campaign_name || row.campaign_id,
          publisher_platform: row.publisher_platform || "other",
          platform_position: row.platform_position || "other",
          spend: Number(row.spend) || 0,
          impressions: Number(row.impressions) || 0,
          clicks: Number(row.clicks) || 0,
          purchases,
          leads,
          purchase_value: purchVal ? Number(purchVal.value) : 0
        });
      }
      next = j.paging?.next || null;
    }
  }
  return { ok: true, since, until, rows, errors: errors.length ? errors : undefined };
}

// Lista TODAS as contas de anuncio que o token tem acesso (via /me/adaccounts).
// Util pra descobrir contas que existem no BM mas nao estao na env META_AD_ACCOUNT_IDS.
async function listAllAccessibleAccounts() {
  if (!META_TOKEN) return { error: "missing_token" };
  const out: any[] = [];
  let next: string | null = `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,account_id,name,account_status,currency&limit=200&access_token=${META_TOKEN}`;
  while (next) {
    const r = await fetch(next);
    const j = await r.json();
    if (!r.ok) return { error: "meta_api_error", details: j };
    (j.data || []).forEach((a: any) => out.push(a));
    next = j.paging?.next || null;
    if (out.length > 1000) break;
  }
  const configured = new Set(ACCOUNT_IDS);
  const annotated = out.map(a => ({
    id: a.id,
    name: a.name,
    status: a.account_status,
    currency: a.currency,
    configured: configured.has(a.id)
  }));
  return { ok: true, total: annotated.length, configured: ACCOUNT_IDS, accounts: annotated };
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

  if (req.method === "GET" && action === "breakdown") {
    const today = new Date().toISOString().slice(0,10);
    const def = new Date(Date.now() - 30*86400000).toISOString().slice(0,10);
    const since = url.searchParams.get("since") || def;
    const until = url.searchParams.get("until") || today;
    const r = await breakdownByPlatform(since, until);
    return json(r);
  }

  if (req.method === "GET" && action === "all_accounts") {
    return json(await listAllAccessibleAccounts());
  }

  if (req.method === "GET" && action === "placements") {
    const today = new Date().toISOString().slice(0,10);
    const def = new Date(Date.now() - 30*86400000).toISOString().slice(0,10);
    const since = url.searchParams.get("since") || def;
    const until = url.searchParams.get("until") || today;
    const r = await breakdownByPlacement(since, until);
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
