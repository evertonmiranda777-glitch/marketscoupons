// /api/push — endpoint multi-ação pra Web Push subscriptions
// Actions via querystring:
//   POST /api/push?action=subscribe   → cria/atualiza subscription
//   POST /api/push?action=unsubscribe → desativa subscription (soft delete)
//   POST /api/push?action=prefs       → atualiza categorias/firms
//   POST /api/push?action=click       → tracking de click em notification
//   POST /api/push?action=send        → ADMIN: envia push pra filtrados

const webpush = require('web-push');

const SB_URL = process.env.SUPABASE_URL || 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || 'BD5A4Ys4-VdJA5qkkk6s4wgTzTJjrmgEy8XrqvATUnH07wyJrUEJK3sX05cCyxfcLDIjafJePYLODdQC-PkaaGw';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@marketscoupons.com';

if (VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  } catch (e) { /* fail-safe */ }
}

function bad(res, code, msg) {
  res.status(code).json({ error: msg });
}

async function sbInsert(table, row, conflict) {
  const url = `${SB_URL}/rest/v1/${table}?on_conflict=${conflict || ''}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': conflict ? 'resolution=merge-duplicates,return=representation' : 'return=representation'
    },
    body: JSON.stringify(row)
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Supabase ${table} ${r.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

async function sbUpdate(table, filter, patch) {
  const url = `${SB_URL}/rest/v1/${table}?${filter}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(patch)
  });
  if (!r.ok) throw new Error(`Supabase update ${r.status}`);
  return r.json();
}

module.exports = async (req, res) => {
  // CORS — same-origin via vercel default, sem header explícito
  if (req.method !== 'POST') return bad(res, 405, 'POST only');

  const action = (req.query.action || '').toString();
  if (!SB_KEY) return bad(res, 500, 'service_role_key missing');

  try {
    const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');

    if (action === 'subscribe') {
      const { endpoint, keys, anon_id, user_id, lang } = body || {};
      if (!endpoint || !keys?.p256dh || !keys?.auth) return bad(res, 400, 'missing endpoint or keys');
      const row = {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        anon_id: anon_id || null,
        user_id: user_id || null,
        lang: (lang || 'en').slice(0, 5),
        user_agent: (req.headers['user-agent'] || '').slice(0, 250),
        active: true,
        last_active_at: new Date().toISOString(),
        unsubscribed_at: null
      };
      // upsert por endpoint (unique)
      const result = await sbInsert('push_subscriptions', row, 'endpoint');
      return res.status(200).json({ ok: true, subscription_id: Array.isArray(result) ? result[0]?.id : null });
    }

    if (action === 'unsubscribe') {
      const { endpoint } = body || {};
      if (!endpoint) return bad(res, 400, 'missing endpoint');
      await sbUpdate('push_subscriptions',
        `endpoint=eq.${encodeURIComponent(endpoint)}`,
        { active: false, unsubscribed_at: new Date().toISOString() });
      return res.status(200).json({ ok: true });
    }

    if (action === 'click') {
      // Tracking de click em push (Fase 5 detalha o dashboard)
      const { event_id, category, url, ts } = body || {};
      try {
        await sbInsert('events', {
          event: 'push_click',
          params: { event_id, category, url, ts }
        });
      } catch (_) {}
      return res.status(200).json({ ok: true });
    }

    if (action === 'prefs') {
      const { endpoint, cat_promo, cat_calendar, cat_analysis, cat_gex, firms, lang } = body || {};
      if (!endpoint) return bad(res, 400, 'missing endpoint');
      const patch = { last_active_at: new Date().toISOString() };
      if (typeof cat_promo === 'boolean') patch.cat_promo = cat_promo;
      if (typeof cat_calendar === 'boolean') patch.cat_calendar = cat_calendar;
      if (typeof cat_analysis === 'boolean') patch.cat_analysis = cat_analysis;
      if (typeof cat_gex === 'boolean') patch.cat_gex = cat_gex;
      if (Array.isArray(firms)) patch.firms = firms.filter(f => typeof f === 'string').slice(0, 20);
      if (typeof lang === 'string') patch.lang = lang.slice(0, 5);
      await sbUpdate('push_subscriptions',
        `endpoint=eq.${encodeURIComponent(endpoint)}`,
        patch);
      return res.status(200).json({ ok: true });
    }

    if (action === 'send') {
      // Admin-only: envia push notification pra subscribers filtrados
      if (!VAPID_PRIVATE) return bad(res, 500, 'VAPID_PRIVATE_KEY not configured in env');

      // Auth admin: JWT do Supabase via header Authorization: Bearer
      const authHdr = req.headers.authorization || '';
      const jwt = authHdr.startsWith('Bearer ') ? authHdr.slice(7) : '';
      if (!jwt) return bad(res, 401, 'missing admin jwt');
      // Verifica que é admin via Supabase
      try {
        const u = await fetch(`${SB_URL}/auth/v1/user`, {
          headers: { 'Authorization': `Bearer ${jwt}`, 'apikey': SB_KEY }
        });
        if (!u.ok) return bad(res, 401, 'invalid jwt');
        const user = await u.json();
        if (!user?.user_metadata?.is_admin && user?.app_metadata?.role !== 'admin' && user?.email !== 'evertonmiranda777@gmail.com') {
          return bad(res, 403, 'admin only');
        }
      } catch (e) {
        return bad(res, 401, 'jwt verify failed');
      }

      const {
        title, body: msgBody, url, icon, image, tag, category,
        firm, lang_filter, test_endpoint, dry_run
      } = body || {};
      if (!title) return bad(res, 400, 'missing title');

      // Monta filtros pra query do Supabase
      const filters = ['active=eq.true'];
      if (category) {
        const catCol = { promo: 'cat_promo', calendar: 'cat_calendar', analysis: 'cat_analysis', gex: 'cat_gex' }[category];
        if (!catCol) return bad(res, 400, 'invalid category');
        filters.push(`${catCol}=eq.true`);
      }
      if (lang_filter) filters.push(`lang=eq.${encodeURIComponent(lang_filter)}`);
      if (test_endpoint) filters.push(`endpoint=eq.${encodeURIComponent(test_endpoint)}`);

      const qs = filters.join('&');
      const r = await fetch(`${SB_URL}/rest/v1/push_subscriptions?${qs}&select=id,endpoint,p256dh,auth,firms,lang`, {
        headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
      });
      if (!r.ok) return bad(res, 500, 'failed to load subscriptions');
      let subs = await r.json();

      // Filtro de firma feito em JS (array contains)
      if (firm) {
        subs = subs.filter(s => !Array.isArray(s.firms) || s.firms.length === 0 || s.firms.includes(firm));
      }

      if (dry_run) {
        return res.status(200).json({ ok: true, would_send: subs.length, dry_run: true });
      }

      const payload = JSON.stringify({
        title,
        body: msgBody || '',
        url: url || '/',
        icon: icon || '/img/pwa/icon-192.png',
        badge: '/img/pwa/icon-192.png',
        image,
        tag: tag || ('mc-' + (category || 'general')),
        category,
        event_id: 'push-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
      });

      let sent = 0, failed = 0, expired = 0;
      const expiredIds = [];
      // Envia em lotes paralelos pra não estourar o timeout da função (doutrina: chunkar sempre).
      const CHUNK = 100;
      for (let i = 0; i < subs.length; i += CHUNK) {
        const batch = subs.slice(i, i + CHUNK);
        const results = await Promise.allSettled(batch.map(s =>
          webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          )
        ));
        results.forEach((r, j) => {
          if (r.status === 'fulfilled') { sent++; return; }
          const code = r.reason && r.reason.statusCode;
          if (code === 410 || code === 404) { expired++; expiredIds.push(batch[j].id); }
          else { failed++; }
        });
      }
      // Soft-delete expirados
      if (expiredIds.length > 0) {
        try {
          await fetch(`${SB_URL}/rest/v1/push_subscriptions?id=in.(${expiredIds.join(',')})`, {
            method: 'PATCH',
            headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: false, unsubscribed_at: new Date().toISOString() })
          });
        } catch (_) {}
      }

      return res.status(200).json({ ok: true, total: subs.length, sent, failed, expired });
    }

    return bad(res, 400, 'unknown action');
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e).slice(0, 200) });
  }
};
