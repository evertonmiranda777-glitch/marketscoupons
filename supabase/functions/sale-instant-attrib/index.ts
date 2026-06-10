// sale-instant-attrib, chamado pelo trigger SQL quando affiliate_conversions recebe INSERT
// 1. Roda match contra coupon_clicks dos últimos 7 dias
// 2. UPDATE affiliate_conversions.sub_id
// 3. Manda Telegram com a keyword atribuída (substitui mensagem "sem sub_id" do MM)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const TG_CHAT  = "1284593409";

// Converte timestamp ISO pra dia BRT (UTC-3). Fix do TZ rollover: vendas 21-23:59 BRT
// caiam no dia UTC seguinte, sumindo do filtro "hoje" do admin.
function brtDayString(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 3 * 3600000);
  return d.toISOString().slice(0, 10);
}

async function tg(text: string) {
  if (!TG_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
  } catch {}
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

  // Procura melhor click na janela
  const { data: clicks } = await sb.from("coupon_clicks")
    .select("*")
    .eq("firm_id", conv.firm_id)
    .gte("ts", windowStart)
    .lte("ts", windowEnd)
    .order("ts", { ascending: false })
    .limit(50);

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
    // Insere em coupon_attributions também (idempotente via UNIQUE)
    await sb.from("coupon_attributions").upsert({
      click_id: bestClick.id,
      conversion_id: conv_id,
      firm_id: conv.firm_id,
      coupon_code: bestClick.coupon_code || null,
      utm_campaign: bestClick.utm_campaign || null,
      utm_source: bestClick.utm_source || null,
      utm_medium: bestClick.utm_medium || null,
      utm_term: bestClick.utm_term || null,
      utm_content: bestClick.utm_content || null,
      fbclid: bestClick.fbclid || null,
      amount: Number(conv.amount) || 0,
      currency: conv.currency || "USD",
      sale_date: brtDayString(conv.created_at),
      click_ts: bestClick.ts,
      hours_to_sale: Number(((saleTs - new Date(bestClick.ts).getTime()) / 3600000).toFixed(2)),
      match_type: "instant_trigger",
      confidence: bestClick.fbclid ? 90 : 70,
      raw: { transaction_id: conv.transaction_id }
    }, { onConflict: "conversion_id" });
  }

  // Telegram, vendas reais (webhook IPN) sempre disparam.
  // Synthetics (backfill do scraper) só disparam se forem do dia corrente BRT, evita spam
  // de 80+ TGs quando faz backfill historico, mas mantem venda-a-venda em tempo real.
  const isSynthetic = typeof conv.transaction_id === "string" && conv.transaction_id.startsWith("synth-");
  const saleDay = brtDayString(conv.created_at);
  const todayBRT = brtDayString(new Date().toISOString());
  const shouldTG = !isSynthetic || saleDay === todayBRT;
  if (shouldTG) {
    const firm = (conv.firm_id || "").toUpperCase();
    const amt = Number(conv.amount).toFixed(2);
    const hours = bestClick ? ((saleTs - new Date(bestClick.ts).getTime()) / 3600000).toFixed(1) : null;
    let msg = `<b>[${firm}] VENDA ATRIBUIDA</b>\n+$${amt}\n`;
    if (subId) {
      msg += `Keyword: <code>${subId}</code>\n`;
      msg += `Click: ${hours}h antes · ${bestClick.utm_source || "?"} / ${bestClick.utm_medium || "?"}\n`;
      msg += `Confianca: ${bestClick.fbclid ? "alta (fbclid)" : "media"}`;
    } else {
      msg += `Sem click recente (7d). Provavelmente organic ou primeira-fonte fora da janela.`;
    }
    await tg(msg);
  }

  return new Response(JSON.stringify({ ok: true, sub_id: subId, click_id: bestClick?.id || null }), {
    headers: { "Content-Type": "application/json" }
  });
});
