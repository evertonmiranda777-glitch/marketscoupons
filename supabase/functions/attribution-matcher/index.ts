// Matcher: affiliate_conversions (vendas reais das firmas) -> coupon_clicks (atribuicao)
// Insere linha em coupon_attributions por venda, ligando ao melhor click candidato (7d window, mesma firma)
// Chamada GET/POST ?days=30 (default 30)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Dia BRT (UTC-3), evita venda 21-23:59 BRT vazar pro dia UTC seguinte
function brtDayString(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 3 * 3600000);
  return d.toISOString().slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get("days") || "30")));
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data: conversions, error: convErr } = await sb
    .from("affiliate_conversions")
    .select("id, firm_id, amount, currency, created_at, transaction_id, raw_payload")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (convErr) return json({ error: "conv_query", message: convErr.message }, 500);
  if (!conversions?.length) return json({ ok: true, scanned: 0, matched: 0, note: "no_conversions" });

  const ids = conversions.map(c => c.id);
  const { data: existing, error: exErr } = await sb
    .from("coupon_attributions")
    .select("conversion_id")
    .in("conversion_id", ids);
  if (exErr) return json({ error: "attr_query", message: exErr.message }, 500);
  const done = new Set((existing || []).map(r => r.conversion_id));

  const todo = conversions.filter(c => !done.has(c.id));
  if (!todo.length) return json({ ok: true, scanned: conversions.length, matched: 0, note: "all_already_matched" });

  let matched = 0;
  const inserts: any[] = [];

  for (const conv of todo) {
    const saleTs = new Date(conv.created_at).getTime();
    const windowStart = new Date(saleTs - 7 * 86400000).toISOString();
    const windowEnd = new Date(saleTs + 2 * 3600000).toISOString();

    let email: string | null = null;
    try {
      const rp = typeof conv.raw_payload === "string" ? JSON.parse(conv.raw_payload) : conv.raw_payload;
      email = rp?.email || rp?.customer?.email || null;
    } catch {}

    let click: any = null;
    let matchType = "";
    let confidence = 0;

    if (email) {
      const { data } = await sb
        .from("coupon_clicks")
        .select("*")
        .eq("firm_id", conv.firm_id)
        .eq("email", email)
        .gte("ts", windowStart)
        .lte("ts", windowEnd)
        .order("ts", { ascending: false })
        .limit(1);
      if (data?.length) { click = data[0]; matchType = "email_exact"; confidence = 100; }
    }

    if (!click) {
      const { data } = await sb
        .from("coupon_clicks")
        .select("*")
        .eq("firm_id", conv.firm_id)
        .gte("ts", windowStart)
        .lte("ts", windowEnd)
        .order("ts", { ascending: false })
        .limit(50);
      if (data?.length) {
        const scored = data.map(c => {
          let score = 50;
          if (c.fbclid || c.gclid || c.ttclid) score += 30;
          if (c.utm_campaign) score += 20;
          if (c.user_id) score += 10;
          const dt = Math.abs(saleTs - new Date(c.ts).getTime()) / 86400000;
          score -= dt * 2;
          return { c, score };
        }).sort((a, b) => b.score - a.score);
        click = scored[0].c;
        const recurr = data.filter(d => d.anon_id === click.anon_id).length;
        matchType = recurr > 1 ? "anon_window" : "firm_window_best";
        confidence = recurr > 1 ? 80 : 50;
      }
    }

    if (!click) continue;

    const hoursToSale = (saleTs - new Date(click.ts).getTime()) / 3600000;
    inserts.push({
      click_id: click.id,
      conversion_id: conv.id,
      firm_id: conv.firm_id,
      coupon_code: click.coupon_code || null,
      utm_campaign: click.utm_campaign || null,
      utm_source: click.utm_source || null,
      utm_medium: click.utm_medium || null,
      utm_content: click.utm_content || null,
      fbclid: click.fbclid || null,
      gclid: click.gclid || null,
      amount: Number(conv.amount) || 0,
      currency: conv.currency || "USD",
      sale_date: brtDayString(conv.created_at),
      click_ts: click.ts,
      hours_to_sale: Number(hoursToSale.toFixed(2)),
      match_type: matchType,
      confidence,
      raw: { transaction_id: conv.transaction_id }
    });
    matched++;
  }

  if (inserts.length) {
    const { error: upErr } = await sb
      .from("coupon_attributions")
      .upsert(inserts, { onConflict: "conversion_id" });
    if (upErr) return json({ error: "upsert_failed", message: upErr.message, partial: matched }, 500);
  }

  // CRÍTICO: escreve sub_id de volta em affiliate_conversions pra notificações Telegram saberem a keyword
  // (antes só ficava em coupon_attributions, conversions.sub_id ficava NULL pra sempre)
  let backfilled = 0;
  for (const ins of inserts) {
    const subId = ins.utm_campaign || ins.fbclid || null;
    // Procura utm_term/keyword no click original
    const { data: clickData } = await sb
      .from("coupon_clicks")
      .select("utm_term, utm_campaign, utm_content")
      .eq("id", ins.click_id)
      .single();
    const realSubId = clickData?.utm_term || clickData?.utm_campaign || clickData?.utm_content || subId;
    if (realSubId) {
      const { error: updErr } = await sb
        .from("affiliate_conversions")
        .update({ sub_id: realSubId })
        .eq("id", ins.conversion_id)
        .is("sub_id", null);
      if (!updErr) backfilled++;
    }
  }

  return json({ ok: true, scanned: todo.length, matched, inserts: inserts.length, sub_id_backfilled: backfilled });
});

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" }
  });
}
