// telegram-creative v13 — retry 3x + caption EN. (off sync: alpha 40, ftmo 20, e8 40, blueguardian 50)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const GROUP_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") || "-1002924828989";
const ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID") || "";
const AUTO_TOKEN = Deno.env.get("AUTOMATION_API_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SITE = "https://www.marketscoupons.com";
const RENDER_API = `${SITE}/api/render-criativo`;

function json(obj: any, status = 200) { return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } }); }

type Slot = { firmId: string; off: number; name: string };
const SCHEDULE: Record<string, Slot[]> = {
  "1": [{ firmId: "apex", off: 90, name: "Apex Trader Funding" }, { firmId: "bulenox", off: 89, name: "Bulenox" }, { firmId: "toponefutures", off: 60, name: "Top One Futures" }, { firmId: "aquafutures", off: 60, name: "Aqua Futures" }],
  "2": [{ firmId: "blueberryfutures", off: 60, name: "Blueberry Futures" }, { firmId: "goat", off: 50, name: "Goat Funded Futures" }, { firmId: "tradeday", off: 50, name: "TradeDay" }, { firmId: "e2t", off: 50, name: "Earn2Trade" }],
  "3": [{ firmId: "fn", off: 40, name: "FundedNext" }, { firmId: "blueguardian", off: 50, name: "Blue Guardian" }, { firmId: "cti", off: 30, name: "City Traders Imperium" }, { firmId: "futureselite", off: 30, name: "Futures Elite" }],
  "4": [{ firmId: "brightfunded", off: 30, name: "BrightFunded" }, { firmId: "alphafutures", off: 40, name: "Alpha Futures" }, { firmId: "fundingpips", off: 20, name: "FundingPips" }, { firmId: "ftmo", off: 20, name: "FTMO" }],
  "5": [{ firmId: "e8", off: 40, name: "E8 Markets" }, { firmId: "the5ers", off: 5, name: "The5ers" }, { firmId: "apex", off: 90, name: "Apex Trader Funding" }, { firmId: "bulenox", off: 89, name: "Bulenox" }],
  "6": [{ firmId: "funded-futures-family", off: 80, name: "Funded Futures Family" }, { firmId: "bulenox", off: 89, name: "Bulenox" }, { firmId: "toponefutures", off: 60, name: "Top One Futures" }, { firmId: "aquafutures", off: 60, name: "Aqua Futures" }],
  "0": [{ firmId: "blueberryfutures", off: 60, name: "Blueberry Futures" }, { firmId: "goat", off: 50, name: "Goat Funded Futures" }, { firmId: "tradeday", off: 50, name: "TradeDay" }, { firmId: "funded-futures-family", off: 80, name: "Funded Futures Family" }],
};

function slotForHour(utcHour: number): number { if (utcHour >= 11 && utcHour < 15) return 0; if (utcHour >= 15 && utcHour < 19) return 1; if (utcHour >= 19 && utcHour < 23) return 2; return 3; }

const COUPONS: Record<string, string | null> = { apex: "MARKET", bulenox: "MARKET89", toponefutures: "MARKET", aquafutures: "AQUA", blueberryfutures: "MARKET-7652C", goat: "MARKET", tradeday: "MARKETS", e2t: "MARKETSCOUPONS", fn: "FLEXJU", blueguardian: "MARKET", cti: "ADHA30", futureselite: "JUNE30", brightfunded: "CLNLTPxtT4Sok0PzHaRIIQ", alphafutures: "MARKETS026158", fundingpips: "HELLO", ftmo: null, e8: "MARKET", the5ers: "MARKET", "funded-futures-family": "MARKET" };

async function renderCreativePngWithRetry(firmId: string, format = "feed", lang = "en"): Promise<Uint8Array | { error: string }> {
  if (!AUTO_TOKEN) return { error: "missing_automation_api_token" };
  const width = 1080;
  const height = format === "story" ? 1920 : 1350;
  let lastErr = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const url = `${SITE}/criativo-render.html?firm=${encodeURIComponent(firmId)}&format=${format}&lang=${lang}&v=${Date.now()}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 70000);
      const resp = await fetch(RENDER_API, { method: "POST", headers: { "Content-Type": "application/json", "X-Service-Auth": AUTO_TOKEN }, body: JSON.stringify({ url, width, height }), signal: controller.signal });
      clearTimeout(timeoutId);
      if (resp.ok) return new Uint8Array(await resp.arrayBuffer());
      const t = await resp.text();
      lastErr = `render-api ${resp.status}: ${t.slice(0,200)}`;
      if (resp.status !== 504 && resp.status !== 502 && resp.status !== 503) break;
      await new Promise(r => setTimeout(r, 5000));
    } catch (e) {
      lastErr = `fetch error: ${String(e).slice(0,200)}`;
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  return { error: lastErr };
}

function buildCaption(slot: Slot, prefix?: string): string {
  const coupon = COUPONS[slot.firmId];
  const lines: string[] = [];
  if (prefix) lines.push(prefix, "");
  lines.push(`<b>${slot.name} — ${slot.off}% OFF</b>`, "");
  if (coupon) lines.push(`Exclusive coupon: <code>${coupon}</code>`);
  else lines.push(`Discount applied automatically via the link.`);
  lines.push("", `Applied directly at checkout. Coupon verified today.`);
  return lines.join("\n");
}

async function storeMessageId(messageId: number, action: string) {
  if (!SUPABASE_URL || !SERVICE_ROLE) return;
  try { const db = createClient(SUPABASE_URL, SERVICE_ROLE); await db.from("telegram_messages").insert({ message_id: messageId, action }); } catch (e) { console.error("storeMessageId error:", e); }
}

async function postCreative(slot: Slot, chatId: string, prefix?: string, trackForClean = false): Promise<{ ok: boolean; details?: any }> {
  if (!BOT_TOKEN) return { ok: false, details: "missing_bot_token" };
  if (!chatId) return { ok: false, details: "missing_chat_id" };
  const pngOrErr = await renderCreativePngWithRetry(slot.firmId, "feed", "en");
  if ((pngOrErr as any).error) return { ok: false, details: pngOrErr };
  const png = pngOrErr as Uint8Array;
  // Defesa: se PNG retornado for muito pequeno (<5kb), e provavelmente uma imagem preta/vazia. Aborta.
  if (png.length < 5000) return { ok: false, details: { error: "png_too_small_likely_blank", size: png.length } };
  const caption = buildCaption(slot, prefix);
  const buyUrl = `${SITE}/aff/go/${slot.firmId}`;
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("caption", caption);
  form.append("parse_mode", "HTML");
  form.append("reply_markup", JSON.stringify({ inline_keyboard: [[{ text: "⚡ Get Coupon", url: buyUrl }]] }));
  form.append("photo", new Blob([png], { type: "image/png" }), `${slot.firmId}.png`);
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { method: "POST", body: form });
  const data = await r.json();
  if (!r.ok) return { ok: false, details: data };
  const msgId = data?.result?.message_id;
  if (trackForClean && msgId) await storeMessageId(msgId, `creative-${slot.firmId}`);
  return { ok: true, details: { firm: slot.firmId, off: slot.off, message_id: msgId, chat: chatId, tracked: !!trackForClean, png_size: png.length } };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "post";

  if (action === "test_dm") {
    const chatOverride = url.searchParams.get("chat_id");
    const dmChat = chatOverride || ADMIN_CHAT_ID;
    if (!dmChat) return json({ ok: false, error: "missing_chat_id" }, 500);
    let slot: Slot;
    const firmOverride = url.searchParams.get("firm");
    if (firmOverride) { slot = { firmId: firmOverride, off: parseInt(url.searchParams.get("off") || "90", 10), name: url.searchParams.get("name") || firmOverride }; }
    else { const now = new Date(); const dow = String(now.getUTCDay()); const slotIdx = slotForHour(now.getUTCHours()); const slots = SCHEDULE[dow] || []; const s = slots[slotIdx]; if (!s) return json({ ok: false, error: "no_slot_for_now" }, 400); slot = s; }
    return json({ ...(await postCreative(slot, dmChat, "🧪 <b>PREVIEW</b>:", false)), slot });
  }

  if (action === "test") {
    const firmId = url.searchParams.get("firm") || "apex";
    const off = parseInt(url.searchParams.get("off") || "90", 10);
    const name = url.searchParams.get("name") || firmId;
    return json(await postCreative({ firmId, off, name }, GROUP_CHAT_ID, undefined, true));
  }

  const now = new Date();
  const dow = String(now.getUTCDay());
  const slotIdx = slotForHour(now.getUTCHours());
  const slots = SCHEDULE[dow] || [];
  const slot = slots[slotIdx];
  if (!slot) return json({ ok: false, error: "no_slot_for_now", dow, slotIdx, hour: now.getUTCHours() }, 400);
  return json({ ...(await postCreative(slot, GROUP_CHAT_ID, undefined, true)), dow, slotIdx, scheduled: slot });
});
