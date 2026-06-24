// sale-instant-attrib v16 (2026-06-10) — debug Telegram + retorno explicito do status
// v15 -> v16: tg() retorna { ok, status, body } pra debugar 'Bulenox $7.10 nao chegou no Telegram'.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const TG_CHAT  = "1284593409";
const FB_CAPI_URL = `${SUPABASE_URL}/functions/v1/facebook-capi`;

function brtDayString(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 3 * 3600000);
  return d.toISOString().slice(0, 10);
}

async function tg(text: string): Promise<{ok:boolean; status:number|null; body:any; reason?:string}> {
  if (!TG_TOKEN) return { ok:false, status:null, body:null, reason:"TG_TOKEN_MISSING" };
  try {
    const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    const body = await r.json().catch(() => null);
    return { ok: r.ok && body?.ok === true, status: r.status, body };
  } catch (e) { return { ok:false, status:null, body:null, reason:String(e) }; }
}

serve(async (req) => {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  let conv_id = "";
  try {
    const body = await req.json();
    conv_id = body.conversion_id || body.record?.id || "";
  } catch {}
  if (!conv_id) return new Response(JSON.stringify({ error: "missing conversion_id" }), { status: 400 });

  const { data: conv } = await sb.from("affiliate_conversions").select("*").eq("id", conv_id).single();
  if (!conv) return new Response(JSON.stringify({ error: "conv not found" }), { status: 404 });

  const saleTs = new Date(conv.created_at).getTime();
  const windowStart = new Date(saleTs - 7 * 86400000).toISOString();
  const windowEnd = new Date(saleTs + 2 * 3600000).toISOString();

  const { data: clicks } = await sb.from("coupon_clicks")
    .select("*").eq("firm_id", conv.firm_id)
    .gte("ts", windowStart).lte("ts", windowEnd)
    .order("ts", { ascending: false }).limit(50);

  let bestClick: any = null;
  if (clicks?.length) {
    const scored = clicks.map((c: any) => {
      let score = 50;
      if (c.fbclid || c.gclid || c.ttclid) score += 30;
      if (c.utm_campaign) score += 20;
      if (c.utm_term) score += 15;
      const dt = Math.abs(saleTs - new Date(c.ts).getTime()) / 86400000;
      score -= dt * 2;
      return { c, score };
    }).sort((a: any, b: any) => b.score - a.score);
    bestClick = scored[0].c;
  }

  let subId: string | null = null;
  if (bestClick) {
    subId = bestClick.utm_term || bestClick.utm_campaign || bestClick.utm_content || bestClick.fbclid || null;
    if (subId) {
      await sb.from("affiliate_conversions").update({ sub_id: subId }).eq("id", conv_id);
    }
    await sb.from("coupon_attributions").upsert({
      click_id: bestClick.id,
      conversion_id: conv_id,
      firm_id: conv.firm_id,
      coupon_code: bestClick.coupon_code || null,
      utm_campaign: bestClick.utm_campaign || null,
      utm_source: bestClick.utm_source || null,
      utm_medium: bestClick.utm_medium || null,
      utm_content: bestClick.utm_content || null,
      fbclid: bestClick.fbclid || null,
      amount: Number(conv.amount) || 0,
      currency: conv.currency || "USD",
      sale_date: brtDayString(conv.created_at),
      click_ts: bestClick.ts,
      hours_to_sale: Number(((saleTs - new Date(bestClick.ts).getTime()) / 3600000).toFixed(2)),
      match_type: "instant_trigger",
      confidence: bestClick.fbclid ? 90 : 70,
      raw: { transaction_id: conv.transaction_id, utm_term: bestClick.utm_term || null }
    }, { onConflict: "conversion_id" });
  }

  const isSynthetic = typeof conv.transaction_id === "string" && conv.transaction_id.startsWith("synth-");
  let capiSent = false;
  let capiResp: any = null;
  if (!isSynthetic) {
    try {
      const ev: any = {
        event: "affiliate_purchase",
        event_id: `aff_${conv_id}`,
        ts: conv.created_at,
        firm_id: conv.firm_id,
        value: Number(conv.amount) || 0,
        currency: conv.currency || "USD",
        url: bestClick?.page_url || bestClick?.landing_page || "https://www.marketscoupons.com/coupons",
      };
      if (bestClick?.fbclid) ev.fbc = `fb.1.${new Date(bestClick.ts).getTime()}.${bestClick.fbclid}`;
      if (bestClick?.fbp) ev.fbp = bestClick.fbp;  // #2: cookie _fbp gravado no clique
      if (bestClick?.user_id) ev.external_id = bestClick.user_id;
      else if (bestClick?.anon_id) ev.external_id = bestClick.anon_id;
      if (bestClick?.email) ev.em = bestClick.email;
      if (bestClick?.country) ev.country = bestClick.country;
      if (bestClick?.city) ev.city = bestClick.city;
      if (bestClick?.region) ev.state = bestClick.region;
      const r = await fetch(FB_CAPI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // #3: manda o IP REAL do clique (capturado pelo facebook-capi no clique). Se não tiver,
        // "" -> facebook-capi omite (nunca o IP compartilhado da edge, que era o diag #4 da Meta).
        body: JSON.stringify({ events: [ev], ua: bestClick?.user_agent || "", ip: bestClick?.ip || "" }),
      });
      capiResp = await r.json().catch(() => null);
      // "OK" honesto: só conta se a Meta REALMENTE recebeu (sent>0 + events_received),
      // não só HTTP 200. Sem isso, evento filtrado/dropado mostrava "CAPI: OK" mentindo.
      capiSent = r.ok && Number(capiResp?.sent || 0) > 0 && Number(capiResp?.fb?.events_received || 0) > 0;
    } catch (e) {
      capiResp = { error: String(e) };
    }
  }

  let tgResult: any = { skipped: true, reason: "synthetic" };
  if (!isSynthetic) {
    const firm = (conv.firm_id || "").toUpperCase();
    const amt = Number(conv.amount).toFixed(2);
    const hours = bestClick ? ((saleTs - new Date(bestClick.ts).getTime()) / 3600000).toFixed(1) : null;
    let msg = `<b>[${firm}] VENDA ATRIBUIDA</b>\n+$${amt}\n`;
    if (subId) {
      msg += `Keyword: <code>${subId}</code>\n`;
      msg += `Click: ${hours}h antes · ${bestClick.utm_source || "?"} / ${bestClick.utm_medium || "?"}\n`;
      msg += `Confianca: ${bestClick.fbclid ? "alta (fbclid)" : "media"}\n`;
    } else {
      msg += `Sem click recente (7d). Provavelmente organic ou primeira-fonte fora da janela.\n`;
    }
    msg += `CAPI: ${capiSent ? "OK" : "FALHOU"}`;
    tgResult = await tg(msg);
  }

  return new Response(JSON.stringify({
    ok: true,
    sub_id: subId,
    click_id: bestClick?.id || null,
    capi_sent: capiSent,
    capi_resp: capiResp,
    is_synthetic: isSynthetic,
    tg: tgResult,
  }), {
    headers: { "Content-Type": "application/json" }
  });
});
