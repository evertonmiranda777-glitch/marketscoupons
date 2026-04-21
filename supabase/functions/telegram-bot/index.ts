import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") ?? "-1002924828989";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://qfwhduvutfumsaxnuofa.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SITE_URL = "www.marketscoupons.com";

function siteLink(path = "", campaign = "general") {
  const base = `https://${SITE_URL}${path}`;
  return `${base}${base.includes("?") ? "&" : "?"}utm_source=telegram&utm_medium=social&utm_campaign=${campaign}`;
}

// Rota curta para Telegram — /t/<slug> redireciona com UTMs (vercel.json)
function tgLink(slug: string) {
  return `https://${SITE_URL}/t/${slug}`;
}

const tgApi = (method: string) =>
  `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;

async function sendMessage(text: string, buttons?: Array<Array<{text:string;url:string}>>): Promise<number | null> {
  try {
    const body: Record<string, unknown> = { chat_id: CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true };
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

async function sendPhoto(photoUrl: string, caption: string, buttons?: Array<Array<{text:string;url:string}>>): Promise<number | null> {
  try {
    // Fetch bytes ourselves — Telegram URL-fetch has ~5s timeout and CDN can stall
    const imgRes = await fetch(photoUrl);
    if (!imgRes.ok) { console.error("sendPhoto: failed to fetch image", imgRes.status); return null; }
    const imgBlob = await imgRes.blob();

    // Telegram caption limit is 1024 chars — trim if needed
    const cap = caption.length > 1020 ? caption.slice(0, 1020) + "…" : caption;

    const form = new FormData();
    form.append("chat_id", CHAT_ID);
    form.append("caption", cap);
    form.append("parse_mode", "HTML");
    form.append("photo", imgBlob, "creative.png");
    if (buttons) form.append("reply_markup", JSON.stringify({ inline_keyboard: buttons }));

    const res = await fetch(tgApi("sendPhoto"), { method: "POST", body: form });
    const data = await res.json();
    if (data.ok) return data.result.message_id as number;
    console.error("Telegram sendPhoto error:", data);
    return null;
  } catch (e) {
    console.error("Telegram sendPhoto fetch error:", e);
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

  const caption =
    `🔥 <b>Today's Best Prop Firm Deals</b>\n\n` +
    lines.join("\n\n") +
    `\n\n👉 ${tgLink("coupons")}`;

  const photoUrl = `https://${SITE_URL}/img/firms-creative.png?t=${Date.now()}`;
  const msgId = await sendPhoto(photoUrl, caption);
  if (msgId) await storeMessageId(db, msgId, "coupons");

  return { sent: msgId !== null, count: firms.length };
}

// ── action=analysis (NQ Favorable scenario only, English) ───────────────────
async function handleAnalysis(db: ReturnType<typeof createClient>) {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await db
    .from("daily_analysis")
    .select("scenario_bull")
    .eq("date", today)
    .eq("asset", "NQ")
    .maybeSingle();

  if (error || !data || !data.scenario_bull) {
    console.error("No NQ analysis for", today, error);
    return { sent: false, reason: "no_data" };
  }

  const sb = data.scenario_bull as Record<string, string> | string;
  const raw = typeof sb === "string" ? sb : (sb.en || sb.pt || "");
  if (!raw) return { sent: false, reason: "no_en" };

  const formatted = raw
    .replace(/\.\s+Target 1:/g, ".\nTarget 1:")
    .replace(/\.\s+Target 2:/g, ".\nTarget 2:")
    .replace(/\.\s+Stop:/g, ".\nStop:")
    .replace(/\.\s+Probability:/g, ".\nProbability:");

  const text = `<b>NQ</b>\n<b>Favorable scenario</b>\n${formatted}`;
  const msgId = await sendMessage(text);
  if (msgId) await storeMessageId(db, msgId, "analysis");

  return { sent: msgId !== null, asset: "NQ" };
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

  const caption =
    `🎯 <b>Gamma Exposure (GEX)</b>\n` +
    `<b>${data.ticker} ${tickerNames[data.ticker] || data.ticker}</b>\n\n` +
    `<b>Put Wall</b>: ${fmt(data.put_wall)} — Support\n` +
    `<b>Call Wall</b>: ${fmt(data.call_wall)} — Resistance\n\n` +
    `🎯 ${tgLink("gex")}`;

  const photoUrl = `https://${SITE_URL}/img/gamma-creative.png?t=${Date.now()}`;
  const msgId = await sendPhoto(photoUrl, caption);
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

  const caption =
    `📅 <b>Economic Calendar</b>\n${today}\n\n` +
    lines.join("\n") +
    `\n\n📊 ${tgLink("calendar")}`;

  const photoUrl = `https://${SITE_URL}/img/calendar-creative.png?t=${Date.now()}`;
  const msgId = await sendPhoto(photoUrl, caption);
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

  // Parse "HH:MM AM/PM" or "HH:MM" → minutes since midnight (ET local)
  function timeToMinutes(timeStr: string): number | null {
    if (!timeStr) return null;
    const m12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    const m24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    let h = 0, m = 0;
    if (m12) {
      h = parseInt(m12[1]); m = parseInt(m12[2]);
      const ampm = m12[3].toUpperCase();
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
    } else if (m24) {
      h = parseInt(m24[1]); m = parseInt(m24[2]);
    } else return null;
    return h * 60 + m;
  }
  const CUTOFF_MIN = 18 * 60 + 30; // 18:30 ET

  const upcoming = events.filter((e) => {
    // Only 3-star events
    const impNum = Number(e.importance ?? e.impact ?? e.stars ?? 0);
    if (impNum !== 3) return false;

    // Only USD (US events)
    const cur = (e.currency ?? e.country ?? "").toUpperCase();
    if (cur !== "USD") return false;

    // Only events scheduled up to 18:30 ET
    const mins = timeToMinutes(e.time ?? e.datetime ?? "");
    if (mins == null || mins > CUTOFF_MIN) return false;

    // Within 5-min alert window
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
      `\n📅 ${tgLink("calendar-alert")}`;

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
      `👉 ${tgLink("pro")}`;
  } else {
    text =
      `💰 <b>Loyalty Program — Earn Points</b>\n\n` +
      `Shop through our links and earn loyalty points!\n\n` +
      `🎁 Points unlock: exclusive perks, bigger discounts, priority access\n` +
      `📊 Track your points in your dashboard\n\n` +
      `👉 ${tgLink("loyalty")}`;
  }

  const msgId = await sendMessage(text);
  if (msgId) await storeMessageId(db, msgId, "pro_loyalty");

  return { sent: msgId !== null, type: isProDay ? "pro" : "loyalty" };
}

// ── action=flash_promo ──────────────────────────────────────────────────────
async function handleFlashPromo(db: ReturnType<typeof createClient>, firmId: string, urgency = "") {
  if (!firmId) return { sent: false, reason: "missing_firm_id" };

  const { data: firm, error } = await db
    .from("cms_firms")
    .select("id, name, discount, coupon, link, discount_type, split, drawdown")
    .eq("id", firmId)
    .eq("active", true)
    .maybeSingle();

  if (error || !firm) {
    console.error("Firm not found:", firmId, error);
    return { sent: false, reason: "firm_not_found" };
  }

  const couponPt = firm.coupon
    ? `🎟 Cupom: <code>${firm.coupon}</code>`
    : `🔗 Desconto aplicado automaticamente`;
  const couponEn = firm.coupon
    ? `🎟 Code: <code>${firm.coupon}</code>`
    : `🔗 No code needed — discount applied automatically`;

  const discountPt =
    firm.discount_type === "lifetime" ? `${firm.discount}% OFF (vitalício!)` : `${firm.discount}% OFF`;
  const discountEn =
    firm.discount_type === "lifetime" ? `${firm.discount}% OFF (lifetime deal!)` : `${firm.discount}% OFF`;

  // 48h countdown — ends at now + 48h
  const endsAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const endsLabelPt = endsAt.toLocaleString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) + " UTC";
  const endsLabelEn = endsAt.toUTCString().replace(":00 GMT", " UTC");

  // Dedicated firm page — clean URL, UTMs inferred from t.me referrer on the site
  const checkoutUrl = `https://${SITE_URL}/${firm.id}`;

  const text =
    `⚡ <b>Flash Deal — ${firm.name}</b>\n\n` +
    `🇧🇷 <b>PT</b>\n` +
    `🔥 ${discountPt}\n` +
    couponPt + `\n` +
    (firm.split ? `💰 Profit Split: ${firm.split}\n` : "") +
    (firm.drawdown ? `📉 Drawdown: ${firm.drawdown}\n` : "") +
    `⏰ <b>Termina em 48h</b> — ${endsLabelPt}\n` +
    `\n━━━━━━━━━━\n\n` +
    `🇺🇸 <b>EN</b>\n` +
    `🔥 ${discountEn}\n` +
    couponEn + `\n` +
    (firm.split ? `💰 Profit Split: ${firm.split}\n` : "") +
    (firm.drawdown ? `📉 Drawdown: ${firm.drawdown}\n` : "") +
    `⏰ <b>Ends in 48h</b> — ${endsLabelEn}\n` +
    (urgency ? `\n${urgency}\n` : "") +
    `\n👉 <a href="${checkoutUrl}"><b>Garantir oferta / Get Deal</b></a>`;

  const msgId = await sendMessage(text);
  if (msgId) await storeMessageId(db, msgId, "flash_promo");

  return { sent: msgId !== null, firm: firm.name, ends_at: endsAt.toISOString() };
}

// ── action=promo_reminder ──────────────────────────────────────────────────
// Varre cms_firms com promo_ends_at nao-nulo e envia lembrete nos thresholds 48h/24h/2h.
// Dedupe via promo_reminder_log (firm_id, threshold_hours, promo_ends_at).
async function handlePromoReminder(db: ReturnType<typeof createClient>) {
  const now = Date.now();
  const THRESHOLDS = [48, 24, 2]; // horas
  const WINDOW_MIN = 30; // janela de +/- 30min em volta do threshold — cron roda de hora em hora

  const { data: firms, error } = await db
    .from("cms_firms")
    .select("id, name, discount, discount_type, coupon, split, drawdown, promo_ends_at, promo_label")
    .eq("active", true)
    .not("promo_ends_at", "is", null);

  if (error || !firms?.length) return { sent: 0, reason: error ? "db_error" : "no_promos", details: error?.message };

  const results: Array<{ firm: string; threshold: number; sent: boolean; reason?: string }> = [];

  for (const firm of firms) {
    const endsAt = new Date(firm.promo_ends_at as string).getTime();
    const hoursLeft = (endsAt - now) / 3600000;
    if (hoursLeft < 0) continue;

    for (const th of THRESHOLDS) {
      if (Math.abs(hoursLeft - th) > WINDOW_MIN / 60) continue;

      const { data: already } = await db
        .from("promo_reminder_log")
        .select("id")
        .eq("firm_id", firm.id)
        .eq("threshold_hours", th)
        .eq("promo_ends_at", firm.promo_ends_at as string)
        .maybeSingle();
      if (already) continue;

      const urgencyLabel = th === 48
        ? { pt: "⏰ <b>Termina em 48h</b>", en: "⏰ <b>Ends in 48h</b>" }
        : th === 24
          ? { pt: "🔥 <b>Termina em 24h</b>", en: "🔥 <b>Ends in 24h</b>" }
          : { pt: "🚨 <b>ÚLTIMAS 2 HORAS</b>", en: "🚨 <b>LAST 2 HOURS</b>" };

      const discountPt = firm.discount_type === "lifetime"
        ? `${firm.discount}% OFF (vitalício!)`
        : `${firm.discount}% OFF`;
      const discountEn = firm.discount_type === "lifetime"
        ? `${firm.discount}% OFF (lifetime deal!)`
        : `${firm.discount}% OFF`;

      const couponPt = firm.coupon ? `🎟 Cupom: <code>${firm.coupon}</code>` : `🔗 Desconto aplicado automaticamente`;
      const couponEn = firm.coupon ? `🎟 Code: <code>${firm.coupon}</code>` : `🔗 No code needed`;

      const checkoutUrl = `https://${SITE_URL}/${firm.id}`;
      const promoLabel = firm.promo_label ? ` — ${firm.promo_label}` : "";

      const text =
        `${th === 2 ? "🚨" : th === 24 ? "🔥" : "⚡"} <b>${firm.name}${promoLabel}</b>\n\n` +
        `🇧🇷 <b>PT</b>\n` +
        `🔥 ${discountPt}\n` +
        couponPt + `\n` +
        (firm.split ? `💰 Profit Split: ${firm.split}\n` : "") +
        (firm.drawdown ? `📉 Drawdown: ${firm.drawdown}\n` : "") +
        urgencyLabel.pt + `\n` +
        `\n━━━━━━━━━━\n\n` +
        `🇺🇸 <b>EN</b>\n` +
        `🔥 ${discountEn}\n` +
        couponEn + `\n` +
        (firm.split ? `💰 Profit Split: ${firm.split}\n` : "") +
        (firm.drawdown ? `📉 Drawdown: ${firm.drawdown}\n` : "") +
        urgencyLabel.en + `\n` +
        `\n👉 <a href="${checkoutUrl}"><b>${th === 2 ? "Garantir agora / Grab now" : "Ver oferta / See deal"}</b></a>`;

      const msgId = await sendMessage(text);
      if (msgId) {
        await storeMessageId(db, msgId, `promo_reminder_${th}h`);
        await db.from("promo_reminder_log").insert({
          firm_id: firm.id,
          threshold_hours: th,
          promo_ends_at: firm.promo_ends_at,
          telegram_msg_id: msgId
        });
        results.push({ firm: firm.id, threshold: th, sent: true });
      } else {
        results.push({ firm: firm.id, threshold: th, sent: false, reason: "send_failed" });
      }
      break; // so 1 threshold por firma por execucao
    }
  }

  return { scanned: firms.length, sent: results.filter(r => r.sent).length, results };
}

// ── action=send_custom (admin preview → send) ──────────────────────────────
async function handleSendCustom(req: Request) {
  let body: { text?: string; buttonText?: string; buttonUrl?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }
  const text = String(body.text || "").slice(0, 4000);
  if (!text) return { sent: false, error: "empty text" };
  const buttons = body.buttonText && body.buttonUrl
    ? [[{ text: String(body.buttonText), url: String(body.buttonUrl) }]]
    : undefined;
  const msgId = await sendMessage(text, buttons);
  return { sent: msgId !== null, message_id: msgId };
}

// ── Main handler ────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "";
  const firmId = url.searchParams.get("firm_id") ?? "";
  const urgency = url.searchParams.get("urgency") ?? "";

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
        result = await handleFlashPromo(db, firmId, urgency);
        break;
      case "promo_reminder":
        result = await handlePromoReminder(db);
        break;
      case "send_custom":
        result = await handleSendCustom(req);
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
