import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "8733719815:AAEEAw6DHQmPIKiZbATdr0TLQ7Sx_5nBqzU";
const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") ?? "-1002924828989";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://qfwhduvutfumsaxnuofa.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SITE_URL = "www.marketscoupons.com";

function siteLink(path = "", campaign = "general") {
  const base = `https://${SITE_URL}${path}`;
  return `${base}${base.includes("?") ? "&" : "?"}utm_source=telegram&utm_medium=social&utm_campaign=${campaign}`;
}

const tgApi = (method: string) =>
  `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;

async function sendMessage(text: string, buttons?: Array<Array<{text:string;url:string}>>): Promise<number | null> {
  try {
    const body: Record<string, unknown> = { chat_id: CHAT_ID, text, parse_mode: "HTML" };
    if (buttons) body.reply_markup = { inline_keyboard: buttons };
    const res = await fetch(tgApi("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.ok) return data.result.message_id as number;
    console.error("Telegram sendMessage error:", data);
    return null;
  } catch (e) {
    console.error("Telegram API fetch error:", e);
    return null;
  }
}

async function deleteMessage(messageId: number): Promise<void> {
  try {
    await fetch(tgApi("deleteMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, message_id: messageId }),
    });
  } catch (e) {
    console.error("Telegram deleteMessage error:", e);
  }
}

async function storeMessageId(db: ReturnType<typeof createClient>, messageId: number, action: string) {
  const { error } = await db.from("telegram_messages").insert({ message_id: messageId, action });
  if (error) console.error("DB insert error:", error);
}

function getLang(obj: unknown, fallback = ""): string {
  if (!obj) return fallback;
  if (typeof obj === "string") return obj;
  if (typeof obj === "object") {
    const o = obj as Record<string, string>;
    return o.en || o.pt || o.es || fallback;
  }
  return fallback;
}

// ── action=clean ────────────────────────────────────────────────────────────
async function handleClean(db: ReturnType<typeof createClient>) {
  const { data: messages, error } = await db
    .from("telegram_messages")
    .select("message_id");

  if (error) console.error("DB select error:", error);

  if (messages && messages.length > 0) {
    for (const row of messages) {
      await deleteMessage(row.message_id);
    }
    await db.from("telegram_messages").delete().neq("id", 0);
  }

  return { deleted: messages?.length ?? 0 };
}

// ── action=coupons (top 5 by discount) ──────────────────────────────────────
async function handleCoupons(db: ReturnType<typeof createClient>) {
  const { data: firms, error } = await db
    .from("cms_firms")
    .select("name, discount, coupon, discount_type")
    .eq("active", true)
    .gt("discount", 0)
    .order("discount", { ascending: false })
    .limit(5);

  if (error || !firms || firms.length === 0) {
    console.error("Failed to fetch firms:", error);
    return { sent: false };
  }

  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
  const lines = firms.map((f: { name: string; discount: number; coupon: string | null; discount_type: string | null }, i: number) => {
    const dtype = (f.discount_type || "").toLowerCase();
    const label = dtype === "lifetime" ? "LIFETIME" : "OFF";
    const couponLine = f.coupon ? `Code: <code>${f.coupon}</code>` : `No code needed`;
    return `${medals[i]} <b>${f.name}</b> — ${f.discount}% ${label}\n${couponLine}`;
  });

  const text =
    `🔥 <b>Today's Best Prop Firm Deals</b>\n\n` +
    lines.join("\n\n") +
    `\n\n👉 <a href="${siteLink("", "coupons")}">All coupons → marketscoupons.com</a>`;

  const msgId = await sendMessage(text);
  if (msgId) await storeMessageId(db, msgId, "coupons");

  return { sent: msgId !== null, count: firms.length };
}

// ── action=analysis (1 asset rotation, real data) ───────────────────────────
async function handleAnalysis(db: ReturnType<typeof createClient>) {
  const today = new Date().toISOString().slice(0, 10);
  const assets = ["ES", "NQ", "GC", "CL"];
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const assetPick = assets[dayOfYear % assets.length];
  const assetNames: Record<string, string> = {
    ES: "S&P 500 Futures", NQ: "Nasdaq 100 Futures", GC: "Gold Futures", CL: "Crude Oil Futures"
  };

  const { data, error } = await db
    .from("daily_analysis")
    .select("asset, support_1, resistance_1, attention_zone, news_impact")
    .eq("date", today)
    .eq("asset", assetPick)
    .maybeSingle();

  if (error || !data) {
    console.error("No analysis for", assetPick, "on", today, error);
    return { sent: false, reason: "no_data" };
  }

  const az = getLang(data.attention_zone);
  const ni = getLang(data.news_impact);

  const text =
    `📊 <b>Daily Market Analysis</b>\n` +
    `Updated every weekday at 5:00 AM ET. Directional bias, attention zones, news impact, and macro context for the main futures.\n\n` +
    `<b>${data.asset} ${assetNames[data.asset] || data.asset}</b>\n\n` +
    `<b>Support 1</b>\n${data.support_1}\n\n` +
    `<b>Resistance 1</b>\n${data.resistance_1}\n\n` +
    `<b>Attention zone</b>\n${az}\n\n` +
    `${ni}\n\n` +
    `📊 <a href="${siteLink("/analysis", "analysis")}">Full Analysis → marketscoupons.com</a>`;

  const msgId = await sendMessage(text);
  if (msgId) await storeMessageId(db, msgId, "analysis");

  return { sent: msgId !== null, asset: assetPick };
}

// ── action=gex (1 ticker rotation, real data) ───────────────────────────────
async function handleGex(db: ReturnType<typeof createClient>) {
  const today = new Date().toISOString().slice(0, 10);
  const tickers = ["ES", "NQ"];
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const tickerPick = tickers[dayOfYear % tickers.length];
  const tickerNames: Record<string, string> = {
    ES: "S&P 500 Futures", NQ: "Nasdaq 100 Futures"
  };

  const { data, error } = await db
    .from("gex_levels")
    .select("ticker, put_wall, call_wall, spot_price")
    .eq("date", today)
    .eq("ticker", tickerPick)
    .maybeSingle();

  if (error || !data) {
    console.error("No GEX for", tickerPick, "on", today, error);
    return { sent: false, reason: "no_data" };
  }

  const fmt = (v: unknown) => Number(v || 0).toLocaleString();

  const text =
    `🎯 <b>Gamma Exposure (GEX)</b>\n` +
    `Track market maker Gamma Exposure levels on S&P 500 and Nasdaq 100. See where the largest options concentrations are and how they affect price movement.\n` +
    `Updated every business day at 5:00 AM ET.\n\n` +
    `<b>${data.ticker} ${tickerNames[data.ticker] || data.ticker}</b>\n\n` +
    `<b>Put Wall</b>\n${fmt(data.put_wall)} — Support\n\n` +
    `<b>Call Wall</b>\n${fmt(data.call_wall)} — Resistance\n\n` +
    `<b>Put Wall &amp; Call Wall</b>\n` +
    `The Put Wall is the strike with the largest put options concentration — it acts as strong support because market makers buy the asset at this level. ` +
    `The Call Wall is the opposite — largest call concentration, acts as resistance because they sell there.\n\n` +
    `🎯 <a href="${siteLink("/gamma", "gex")}">Full GEX Data → marketscoupons.com</a>`;

  const msgId = await sendMessage(text);
  if (msgId) await storeMessageId(db, msgId, "gex");

  return { sent: msgId !== null, ticker: tickerPick };
}

// ── action=calendar_daily (morning summary of all high-impact events) ───────
async function handleCalendarDaily(db: ReturnType<typeof createClient>) {
  let events: Array<{
    title?: string; name?: string; event?: string;
    country?: string; currency?: string;
    importance?: string | number; impact?: string | number; stars?: number;
    time?: string; datetime?: string; date?: string;
  }> = [];

  try {
    const calRes = await fetch(`${SUPABASE_URL}/functions/v1/economic-calendar`, {
      headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") ?? ""}` },
    });
    if (calRes.ok) {
      const calData = await calRes.json();
      events = Array.isArray(calData) ? calData : calData.events ?? [];
    }
  } catch (e) {
    console.error("economic-calendar fetch error:", e);
    return { sent: false, reason: "calendar_fetch_error" };
  }

  // Filter ★★★ events — USD (US) only, max 3
  const highImpact = events.filter((e) => {
    const imp = Number(e.importance ?? e.impact ?? e.stars ?? 0);
    const cur = (e.currency ?? e.country ?? "").toUpperCase();
    return imp >= 3 && cur === "USD";
  }).slice(0, 3);

  if (highImpact.length === 0) return { sent: false, reason: "no_high_impact_events" };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
    timeZone: "America/New_York",
  });

  const lines = highImpact.map((ev) => {
    const name = ev.title ?? ev.name ?? ev.event ?? "Economic Event";

    let timeDisplay = "";
    try {
      const timeStr = ev.time ?? ev.datetime ?? "";
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        timeDisplay = d.toLocaleTimeString("en-US", {
          hour: "2-digit", minute: "2-digit", timeZone: "America/New_York",
        }) + " ET";
      }
    } catch { /* skip */ }

    return `🔴 ${timeDisplay ? timeDisplay + " — " : ""}<b>${name}</b>`;
  });

  const text =
    `📅 <b>Economic Calendar</b>\n${today}\n\n` +
    lines.join("\n") +
    `\n\n📊 <a href="${siteLink("/calendar", "calendar")}">Full Calendar</a>`;

  const msgId = await sendMessage(text);
  if (msgId) await storeMessageId(db, msgId, "calendar_daily");

  return { sent: msgId !== null, events: highImpact.length };
}

// ── action=calendar_alert (5min before ★★★ and ★★☆ events) ─────────────────
async function handleCalendarAlert(db: ReturnType<typeof createClient>) {
  let events: Array<{
    title?: string; name?: string; event?: string;
    country?: string; currency?: string;
    importance?: string | number; impact?: string | number; stars?: number;
    time?: string; datetime?: string; date?: string;
    previous?: string | number; forecast?: string | number; estimate?: string | number;
  }> = [];

  try {
    const calRes = await fetch(`${SUPABASE_URL}/functions/v1/economic-calendar`, {
      headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") ?? ""}` },
    });
    if (calRes.ok) {
      const calData = await calRes.json();
      events = Array.isArray(calData) ? calData : calData.events ?? [];
    }
  } catch (e) {
    console.error("economic-calendar fetch error:", e);
    return { sent: false, reason: "calendar_fetch_error" };
  }

  if (!events || events.length === 0) return { sent: false, reason: "no_events" };

  const now = new Date();
  const windowMs = 5 * 60 * 1000;
  const toleranceMs = 90 * 1000; // 1.5min tolerance for cron drift

  // Parse "02:00 PM" + "2026-04-10" into a proper Date in ET
  function parseEventTime(dateStr?: string, timeStr?: string): Date | null {
    if (!dateStr || !timeStr) return null;
    try {
      // timeStr format: "02:00 PM" or "14:00"
      let hours = 0, minutes = 0;
      const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      if (match12) {
        hours = parseInt(match12[1]);
        minutes = parseInt(match12[2]);
        const ampm = match12[3].toUpperCase();
        if (ampm === "PM" && hours !== 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;
      } else if (match24) {
        hours = parseInt(match24[1]);
        minutes = parseInt(match24[2]);
      } else {
        return null;
      }
      // Create date string in ET timezone format
      const etStr = `${dateStr}T${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:00`;
      // Trading Economics times are in ET — convert by creating in ET
      const etDate = new Date(new Date(etStr + "-04:00").getTime()); // EDT (UTC-4)
      return isNaN(etDate.getTime()) ? null : etDate;
    } catch { return null; }
  }

  const upcoming = events.filter((e) => {
    const impNum = Number(e.importance ?? e.impact ?? e.stars ?? 0);
    const cur = (e.currency ?? e.country ?? "").toUpperCase();
    if (impNum < 2 || cur !== "USD") return false;

    const eventTime = parseEventTime(e.date, e.time ?? e.datetime);
    if (!eventTime) return false;

    const diff = eventTime.getTime() - now.getTime();
    return diff >= (windowMs - toleranceMs) && diff <= (windowMs + toleranceMs);
  });

  if (upcoming.length === 0) return { sent: false, reason: "no_upcoming_events" };

  for (const ev of upcoming) {
    const name = ev.title ?? ev.name ?? ev.event ?? "Economic Event";
    const timeStr = ev.time ?? ev.datetime ?? "";
    let timeDisplay = timeStr ? timeStr + " ET" : "";

    const prevLine = ev.previous != null ? `Prev: ${ev.previous}` : "";
    const fcLine = (ev.forecast ?? ev.estimate) != null ? `Exp: ${ev.forecast ?? ev.estimate}` : "";
    const statsLine = [prevLine, fcLine].filter(Boolean).join(" | ");

    const impNum = Number(ev.importance ?? ev.impact ?? ev.stars ?? 0);
    const stars = impNum >= 3 ? "★★★" : "★★☆";
    const dot = impNum >= 3 ? "🔴" : "🟡";

    const text =
      `${dot} <b>${name}</b> ${stars} in 5 min\n` +
      `🕐 ${timeDisplay}\n` +
      (statsLine ? `📊 ${statsLine}\n` : "") +
      `\n📅 <a href="${siteLink("/calendar", "calendar_alert")}">Full Calendar</a>`;

    const msgId = await sendMessage(text);
    if (msgId) await storeMessageId(db, msgId, "calendar_alert");
  }

  return { sent: true, alerts: upcoming.length };
}

// ── action=pro_loyalty (Pro subscription + loyalty program promo) ───────────
async function handleProLoyalty(db: ReturnType<typeof createClient>) {
  const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon...

  // Alternate between Pro and Loyalty messages
  const isProDay = dayOfWeek % 2 === 1; // Mon, Wed, Fri = Pro; Tue, Thu = Loyalty

  let text: string;

  if (isProDay) {
    text =
      `⭐ <b>Markets Coupons PRO</b>\n\n` +
      `Unlock exclusive benefits:\n` +
      `• Priority access to flash deals\n` +
      `• Exclusive coupons not available to free users\n` +
      `• Advanced market analysis features\n` +
      `• Early access to new prop firm partnerships\n\n` +
      `👉 <a href="${siteLink("/pro", "pro")}">Learn more → marketscoupons.com</a>`;
  } else {
    text =
      `💰 <b>Loyalty Program — Earn Points</b>\n\n` +
      `Shop through our links and earn loyalty points!\n\n` +
      `🎁 Points unlock: exclusive perks, bigger discounts, priority access\n` +
      `📊 Track your points in your dashboard\n\n` +
      `👉 <a href="${siteLink("", "loyalty")}">Start earning → marketscoupons.com</a>`;
  }

  const msgId = await sendMessage(text);
  if (msgId) await storeMessageId(db, msgId, "pro_loyalty");

  return { sent: msgId !== null, type: isProDay ? "pro" : "loyalty" };
}

// ── action=flash_promo ──────────────────────────────────────────────────────
async function handleFlashPromo(db: ReturnType<typeof createClient>, firmId: string) {
  if (!firmId) return { sent: false, reason: "missing_firm_id" };

  const { data: firm, error } = await db
    .from("cms_firms")
    .select("name, discount, coupon, link, discount_type, split, drawdown")
    .eq("id", firmId)
    .eq("active", true)
    .maybeSingle();

  if (error || !firm) {
    console.error("Firm not found:", firmId, error);
    return { sent: false, reason: "firm_not_found" };
  }

  const couponLine = firm.coupon
    ? `🎟 Code: <code>${firm.coupon}</code>`
    : `🔗 No code needed — discount applied automatically`;

  const discountLabel =
    firm.discount_type === "lifetime" ? `${firm.discount}% OFF (lifetime deal!)` : `${firm.discount}% OFF`;

  const text =
    `⚡ <b>Flash Deal — ${firm.name}</b>\n\n` +
    `🔥 ${discountLabel}\n` +
    couponLine + `\n\n` +
    (firm.split ? `💰 Profit Split: ${firm.split}\n` : "") +
    (firm.drawdown ? `📉 Drawdown: ${firm.drawdown}\n` : "") +
    `\n👉 <a href="${firm.link ?? siteLink("", "flash_promo")}">Claim this deal → ${firm.name}</a>`;

  const msgId = await sendMessage(text);
  if (msgId) await storeMessageId(db, msgId, "flash_promo");

  return { sent: msgId !== null, firm: firm.name };
}

// ── Main handler ────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "";
  const firmId = url.searchParams.get("firm_id") ?? "";

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  let result: unknown;

  try {
    switch (action) {
      case "clean":
        result = await handleClean(db);
        break;
      case "coupons":
        result = await handleCoupons(db);
        break;
      case "analysis":
        result = await handleAnalysis(db);
        break;
      case "gex":
        result = await handleGex(db);
        break;
      case "calendar_daily":
        result = await handleCalendarDaily(db);
        break;
      case "calendar_alert":
        result = await handleCalendarAlert(db);
        break;
      case "pro_loyalty":
        result = await handleProLoyalty(db);
        break;
      case "flash_promo":
        result = await handleFlashPromo(db, firmId);
        break;
      default:
        return new Response(JSON.stringify({ error: "Unknown action", action }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
    }
  } catch (e) {
    console.error("Unhandled error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, action, result }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
