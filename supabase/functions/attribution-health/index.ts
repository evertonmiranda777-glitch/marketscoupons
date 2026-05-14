// attribution-health — verifica integridade do tracking de atribuição
// Roda a cada 1h via pg_cron. Aciona Telegram se algo quebrar.
//
// Verificações:
//  1. sub_id NULL rate em affiliate_conversions últimas 2h
//  2. utm_term NULL rate em coupon_clicks utm_medium=paid últimas 2h
//  3. Links de afiliado /aff/go/<firm> retornam 200/30x
//  4. /coupons + /go retornam 200
//  5. resend_events recebidos últimas 2h (webhook vivo)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID") || "";
const BASE_URL = "https://www.marketscoupons.com";

const ACTIVE_FIRMS = ['apex','bulenox','ftmo','tpt','fn','e2t','the5ers','fundingpips','brightfunded','e8','cti','tradeday'];

async function notifyTelegram(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_ADMIN_CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
  } catch {}
}

async function checkUrl(url: string): Promise<{ok: boolean, status: number}> {
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(url, { redirect: 'manual', signal: ctrl.signal, headers: { "User-Agent": "mc-attribution-health/1.0" } });
    clearTimeout(tid);
    return { ok: r.status >= 200 && r.status < 400, status: r.status };
  } catch (e) {
    return { ok: false, status: 0 };
  }
}

serve(async (_req) => {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const since2h = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
  const alerts: any[] = [];

  // 1. sub_id NULL rate em affiliate_conversions
  try {
    const { data: convs } = await sb
      .from("affiliate_conversions")
      .select("id, sub_id")
      .gte("created_at", since2h);
    const total = convs?.length || 0;
    const nullSub = (convs || []).filter(c => !c.sub_id).length;
    const nullRate = total > 0 ? Math.round((nullSub / total) * 100) : 0;
    const ok = total === 0 || nullRate <= 50;
    if (!ok) {
      alerts.push({
        check_name: "sub_id_null_rate",
        severity: "critical",
        detail: { total, null_count: nullSub, null_rate_pct: nullRate, window: "2h" }
      });
    }
    await sb.from("attribution_alerts").insert({
      check_name: "sub_id_null_rate", severity: ok ? "warn" : "critical", ok,
      detail: { total, null_count: nullSub, null_rate_pct: nullRate }
    });
  } catch (e: any) { console.error("check 1:", e.message); }

  // 2. utm_term NULL rate em coupon_clicks paid
  try {
    const { data: clicks } = await sb
      .from("coupon_clicks")
      .select("id, utm_term, utm_medium")
      .eq("utm_medium", "paid")
      .gte("ts", since2h);
    const total = clicks?.length || 0;
    const nullTerm = (clicks || []).filter(c => !c.utm_term).length;
    const nullRate = total > 0 ? Math.round((nullTerm / total) * 100) : 0;
    const ok = total === 0 || nullRate <= 50;
    if (!ok) {
      alerts.push({
        check_name: "utm_term_null_rate_paid",
        severity: "warn",
        detail: { total, null_count: nullTerm, null_rate_pct: nullRate, window: "2h" }
      });
    }
    await sb.from("attribution_alerts").insert({
      check_name: "utm_term_null_rate_paid", severity: ok ? "warn" : "warn", ok,
      detail: { total, null_count: nullTerm, null_rate_pct: nullRate }
    });
  } catch (e: any) { console.error("check 2:", e.message); }

  // 3. Links de afiliado das 12 firmas
  const brokenLinks: string[] = [];
  for (const firm of ACTIVE_FIRMS) {
    const r = await checkUrl(`${BASE_URL}/go/${firm}`);
    if (!r.ok) brokenLinks.push(`${firm}=${r.status}`);
  }
  if (brokenLinks.length) {
    alerts.push({
      check_name: "affiliate_links_broken",
      severity: "critical",
      detail: { broken: brokenLinks }
    });
  }
  await sb.from("attribution_alerts").insert({
    check_name: "affiliate_links", severity: brokenLinks.length ? "critical" : "warn", ok: brokenLinks.length === 0,
    detail: { checked: ACTIVE_FIRMS.length, broken: brokenLinks }
  });

  // 4. /coupons + raiz
  const couponsCheck = await checkUrl(`${BASE_URL}/coupons`);
  const rootCheck = await checkUrl(`${BASE_URL}/`);
  if (!couponsCheck.ok || !rootCheck.ok) {
    alerts.push({
      check_name: "critical_pages",
      severity: "critical",
      detail: { coupons: couponsCheck.status, root: rootCheck.status }
    });
  }
  await sb.from("attribution_alerts").insert({
    check_name: "critical_pages", severity: (!couponsCheck.ok || !rootCheck.ok) ? "critical" : "warn", ok: couponsCheck.ok && rootCheck.ok,
    detail: { coupons: couponsCheck.status, root: rootCheck.status }
  });

  // 5. resend_events webhook vivo
  try {
    const { count } = await sb
      .from("resend_events")
      .select("*", { count: 'exact', head: true })
      .gte("created_at", since2h);
    // Se zero, pode ser ok (sem envios) OU webhook morto. Não alerta como critical, só warn.
    const ok = (count || 0) > 0;
    await sb.from("attribution_alerts").insert({
      check_name: "resend_events_pulse", severity: "warn", ok,
      detail: { events_2h: count || 0 }
    });
  } catch (e: any) { console.error("check 5:", e.message); }

  // Disparar Telegram se houve alerts críticos ou warns relevantes
  if (alerts.length) {
    let msg = `<b>🔴 attribution-health</b> — ${alerts.length} problema(s)\n\n`;
    for (const a of alerts) {
      msg += `<b>${a.check_name}</b> [${a.severity}]\n<code>${JSON.stringify(a.detail).slice(0,300)}</code>\n\n`;
    }
    msg += `<i>Painel: ${BASE_URL}/admin#email</i>`;
    await notifyTelegram(msg);
  }

  return new Response(JSON.stringify({ ok: alerts.length === 0, alerts_count: alerts.length, alerts }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
});
