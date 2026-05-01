// health-monitor — pinga URLs criticas do site, conta falhas consecutivas, dispara
// repository_dispatch no GitHub quando 3 falhas seguidas (auto-revert via GH Action).
//
// Cron: roda a cada 5min via pg_cron + supabase.cron schedule.
// Estado: tabela `health_state` no Supabase guarda contador consecutivo por URL.
// Auth: GITHUB_DISPATCH_TOKEN (PAT com scope repo) + GITHUB_DISPATCH_REPO.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GITHUB_TOKEN = Deno.env.get("GITHUB_DISPATCH_TOKEN") || "";
const GITHUB_REPO  = Deno.env.get("GITHUB_DISPATCH_REPO")  || "evertonmiranda777-glitch/marketscoupons";
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID") || "";

const TARGETS = [
  { url: "https://www.marketscoupons.com",          must_contain: "Markets Coupons" },
  { url: "https://www.marketscoupons.com/apex",      must_contain: "Apex" },
  { url: "https://www.marketscoupons.com/app.js",    must_contain: "MarketsCoupons" },
];

const FAIL_THRESHOLD = 3; // 3 ciclos consecutivos = ~15min de downtime confirmado
const CHECK_TIMEOUT_MS = 12_000;

async function checkUrl(url: string, mustContain: string) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), CHECK_TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "mc-health-monitor/1.0" } });
    if (!r.ok) return { ok: false, reason: `http_${r.status}` };
    const body = await r.text();
    if (!body.includes(mustContain)) return { ok: false, reason: "content_missing" };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.name === "AbortError" ? "timeout" : `err_${e.message}` };
  } finally {
    clearTimeout(tid);
  }
}

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

async function triggerAutoRevert(reason: string) {
  if (!GITHUB_TOKEN) throw new Error("GITHUB_DISPATCH_TOKEN not set");
  const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/dispatches`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ event_type: "prod-down", client_payload: { reason, source: "supabase-health-monitor" } }),
  });
  if (!r.ok) throw new Error(`github dispatch ${r.status}: ${await r.text()}`);
}

serve(async (_req) => {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const startedAt = new Date().toISOString();

  // Carrega estado atual
  const { data: stateRows } = await sb.from("health_state").select("url,fail_count,last_check_at,last_status");
  const stateByUrl = new Map((stateRows || []).map((r: any) => [r.url, r]));

  const results: any[] = [];
  let triggeredRevert = false;

  for (const t of TARGETS) {
    const r = await checkUrl(t.url, t.must_contain);
    const prev = stateByUrl.get(t.url) || { fail_count: 0 };
    const newFailCount = r.ok ? 0 : (prev.fail_count || 0) + 1;
    results.push({ url: t.url, ok: r.ok, reason: r.reason, fail_count: newFailCount });

    await sb.from("health_state").upsert({
      url: t.url,
      fail_count: newFailCount,
      last_check_at: startedAt,
      last_status: r.ok ? "ok" : (r.reason || "fail"),
    }, { onConflict: "url" });

    // Se essa URL atingiu threshold E ainda nao disparamos revert nessa rodada
    if (newFailCount >= FAIL_THRESHOLD && !triggeredRevert) {
      triggeredRevert = true;
      const reason = `${t.url} ${r.reason} (${newFailCount}x consecutive)`;
      await notifyTelegram(`🚨 <b>marketscoupons</b> down — disparando auto-revert%0A%0AURL: ${t.url}%0AReason: ${r.reason}%0AConsecutive fails: ${newFailCount}`);
      try {
        await triggerAutoRevert(reason);
        await notifyTelegram(`✅ Auto-revert disparado no GitHub. Aguardando workflow.`);
      } catch (e: any) {
        await notifyTelegram(`❌ Falha ao disparar auto-revert: ${e.message}`);
      }
    }
  }

  // Log resumido em events
  await sb.from("events").insert({
    event: "health_monitor_run",
    page_name: "/health-monitor",
    params: { results, triggered_revert: triggeredRevert, started_at: startedAt },
  }).then(() => {}).catch(() => {});

  return new Response(JSON.stringify({ ok: true, results, triggered_revert: triggeredRevert, started_at: startedAt }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
