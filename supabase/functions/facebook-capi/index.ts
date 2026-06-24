// ============================================================================
// facebook-capi v6, B.7 server-side enrichment (profile lookup + IP fallback)
// Date:  2026-04-29
// Phase: B.7 (Fix #1.6, última peça Match Quality CAPI)
//
// Mudanças v5 → v6:
//   - Lookup server-side em public.profiles (cache por request)
//   - IP enrichment via headers Cloudflare (cf-ipcountry/city/region/postal)
//   - Normalizadores específicos por campo (phone só dígitos, birthday
//     YYYYMMDD, city sem acento/espaço, state/country 2 letras lowercase)
//   - Hash em ph, ln, ct, st, zp, db (faltavam na v5)
//   - Bug fix: fn agora envia first_name (não full_name)
//   - Setif helper: omite chave quando valor vazio (Meta rejeita null/empty)
// ============================================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const FB_PIXEL_ID = '813048241061812';
const FB_API_VERSION = 'v21.0';
const SUPA_URL = Deno.env.get('SUPABASE_URL') || 'https://qfwhduvutfumsaxnuofa.supabase.co';

// Map our track() event names → Facebook standard events
const EVENT_MAP: Record<string, string[]> = {
  'page_view':              ['PageView'],
  'firm_detail_open':       ['ViewContent'],
  'guide_read':             ['ViewContent'],
  'blog_read':              ['ViewContent'],
  'coupon_copy':            ['CopyCode'],
  'checkout_click':         ['InitiateCheckout', 'Lead'],
  'user_signup':            ['CompleteRegistration'],
  'user_login':             ['Login'],
  // 2026-05-05: removido mapping pra Lead. Tool/quiz/calc unlock NÃO indica
  // intenção de compra. Inflava ~30x denominador Meta (4994 leads vs 160 IC).
  // Eventos seguem rastreados internamente como custom events sem mapping CAPI.
  'tool_lead_capture':      [],
  'calc_unlocked':          [],
  'quiz_complete':          [],
  'platform_checkout_click':['InitiateCheckout'],
  'copy_coupon':            ['CopyCode'],
  'search':                 ['Search'],
  'purchase':               ['Purchase'],
  'affiliate_purchase':     ['Purchase'],
  'newsletter_subscribe':   ['Subscribe'],
};

// CAPI = SÓ eventos comerciais (Meta deve receber ~17 tipos, não 60+).
// Espelha CAPI_ALLOW do app.js. Enforce no servidor: cobre coupons.html e qualquer caller.
// Custom comerciais (firm_redirect etc.) sem mapping vão como custom event (nome cru) p/ Custom Conversion.
const CAPI_ALLOW = new Set([
  'page_view','firm_detail_open','platform_detail_open','coupon_copy','copy_coupon',
  'checkout_click','platform_checkout_click',
  'tool_lead_capture','purchase','affiliate_purchase','newsletter_subscribe',
  'user_signup','user_login','search',
  'firm_redirect','offer_card_click','lp_explore_site','user_reactivated','platform_select','platform_click',
]);

// === Normalizadores por tipo de campo (Meta CAPI spec) ===
const norm = {
  basic:  (s: string) => String(s||'').toLowerCase().trim(),
  city:   (s: string) => String(s||'').toLowerCase()
                          .normalize('NFD').replace(/[̀-ͯ]/g, '')
                          .replace(/[^a-z0-9]/g, '').trim(),
  region: (s: string) => String(s||'').toLowerCase().trim().slice(0, 5),
  phone:  (s: string) => String(s||'').replace(/\D/g, ''),
  zip:    (s: string) => String(s||'').replace(/\D/g, ''),
  dob:    (s: string) => String(s||'').replace(/[^0-9]/g, '').slice(0, 8),
};

async function hash(str: string): Promise<string> {
  if (!str) return '';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashIfPresent(value: string | null | undefined, normalizer: (s: string) => string): Promise<string | null> {
  const v = normalizer(value || '');
  return v ? await hash(v) : null;
}

// === IP enrichment via Cloudflare headers (Supabase passa por CF) ===
function ipEnrich(req: Request) {
  const h = req.headers;
  return {
    country: (h.get('cf-ipcountry') || '').toUpperCase() || null,
    city:    decodeURIComponent(h.get('cf-ipcity') || '') || null,
    state:   (h.get('cf-region-code') || '').toUpperCase() || null,
    zip:     h.get('cf-postal-code') || null,
  };
}

// === Profile lookup com cache por request ===
const PROFILE_FIELDS = 'first_name,last_name,phone,city,state,country,zip,birthday,email';

async function fetchProfile(userId: string, sk: string): Promise<any | null> {
  if (!userId || !sk) return null;
  try {
    const r = await fetch(
      `${SUPA_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=${PROFILE_FIELDS}`,
      { headers: { apikey: sk, Authorization: `Bearer ${sk}` } }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  } catch {
    return null;
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// Anti-abuso cross-site: só aceita chamadas com Origin do nosso domínio.
// O caller legítimo é browser (app.js/coupons.html) que SEMPRE manda Origin.
// Origin ausente (server-to-server/edge) é tolerado; Origin presente e
// estranho é barrado, cortando spam de conversão de outros sites.
const ALLOWED_ORIGINS = new Set([
  'https://www.marketscoupons.com',
  'https://marketscoupons.com',
]);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  const origin = req.headers.get('origin') || '';
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return new Response(JSON.stringify({ error: 'forbidden origin' }), { status: 403, headers: CORS });
  }

  const token = Deno.env.get('FB_CAPI_TOKEN');
  if (!token) {
    return new Response(JSON.stringify({ error: 'CAPI token not configured' }), { status: 500, headers: CORS });
  }
  const sk = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON' }), { status: 400, headers: CORS });
  }

  const { events } = body;
  if (!Array.isArray(events) || events.length === 0) {
    return new Response(JSON.stringify({ error: 'no events' }), { status: 400, headers: CORS });
  }

  // Server-side enrichment shared per request
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                   req.headers.get('cf-connecting-ip') || '';
  const userAgent = body.ua || req.headers.get('user-agent') || '';
  const ip = ipEnrich(req);

  // Cache de profile por request, 1 lookup por external_id mesmo com N eventos
  const profileCache = new Map<string, any>();
  const getProfile = async (userId: string) => {
    if (!userId) return null;
    if (profileCache.has(userId)) return profileCache.get(userId);
    const p = await fetchProfile(userId, sk);
    profileCache.set(userId, p);
    return p;
  };

  const fbEvents: any[] = [];

  for (const ev of events) {
    if (!ev.event) continue;
    if (!CAPI_ALLOW.has(ev.event)) continue;  // só eventos comerciais no CAPI (corta ruído)
    const fbNames = EVENT_MAP[ev.event] || [ev.event];

    // Lookup profile pra esse user (cached)
    const profile = ev.external_id ? await getProfile(ev.external_id) : null;

    // Resolve cada campo: profile primeiro, IP fallback, payload do cliente último
    const r = {
      email:      profile?.email      || ev.em || '',
      first_name: profile?.first_name || (ev.fn ? String(ev.fn).split(' ')[0] : ''),
      last_name:  profile?.last_name  || (ev.fn ? String(ev.fn).split(' ').slice(1).join(' ') : ''),
      phone:      profile?.phone      || ev.ph || '',
      city:       profile?.city       || ip.city  || '',
      state:      profile?.state      || ip.state || '',
      country:    profile?.country    || ev.country || ip.country || '',
      zip:        profile?.zip        || ip.zip   || '',
      birthday:   profile?.birthday   || '',
    };

    const userData: any = {
      client_ip_address: clientIp,
      client_user_agent: userAgent,
    };
    if (ev.fbp) userData.fbp = ev.fbp;
    if (ev.fbc) userData.fbc = ev.fbc;

    // setIf, só adiciona a chave se valor existir após normalização (Meta rejeita vazios)
    const setIf = async (key: string, val: string, normalizer: (s: string) => string) => {
      const h = await hashIfPresent(val, normalizer);
      if (h) userData[key] = [h];
    };

    await setIf('em',         r.email,      norm.basic);
    if (ev.external_id)       userData.external_id = [await hash(norm.basic(String(ev.external_id)))];
    await setIf('fn',         r.first_name, norm.basic);
    await setIf('ln',         r.last_name,  norm.basic);
    await setIf('ph',         r.phone,      norm.phone);
    await setIf('ct',         r.city,       norm.city);
    await setIf('st',         r.state,      norm.region);
    await setIf('country',    r.country,    norm.region);
    await setIf('zp',         r.zip,        norm.zip);
    await setIf('db',         r.birthday,   norm.dob);

    // Custom data (preservado da v5)
    const customData: any = {};
    if (ev.firm_id) customData.content_ids = [ev.firm_id];
    if (ev.content_ids) customData.content_ids = ev.content_ids;
    customData.content_type = ev.content_type || 'product';
    if (ev.content_name) customData.content_name = ev.content_name;
    if (ev.content_category) customData.content_category = ev.content_category;
    customData.value = ev.value || 0;
    customData.currency = ev.currency || 'USD';
    if (ev.num_items) customData.num_items = ev.num_items;
    if (ev.coupon) customData.order_id = ev.coupon;

    const eventTime = Math.floor(new Date(ev.ts || Date.now()).getTime() / 1000);

    for (const fbName of fbNames) {
      fbEvents.push({
        event_name: fbName,
        event_time: eventTime,
        event_id: ev.event_id ? `${ev.event_id}_${fbName}` : undefined,
        event_source_url: ev.url || '',
        action_source: 'website',
        user_data: userData,
        custom_data: customData,
      });
    }
  }

  if (fbEvents.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: CORS });
  }

  try {
    const fbUrl = `https://graph.facebook.com/${FB_API_VERSION}/${FB_PIXEL_ID}/events?access_token=${token}`;
    const fbRes = await fetch(fbUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: fbEvents }),
    });
    const fbData = await fbRes.json();

    return new Response(JSON.stringify({
      ok: fbRes.ok,
      sent: fbEvents.length,
      profile_lookups: profileCache.size,
      fb: fbData,
    }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 502, headers: CORS });
  }
});
