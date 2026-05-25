// /api/push — endpoint multi-ação pra Web Push subscriptions
// Actions via querystring:
//   POST /api/push?action=subscribe   → cria/atualiza subscription
//   POST /api/push?action=unsubscribe → desativa subscription (soft delete)
//   POST /api/push?action=prefs       → atualiza categorias/firms

const SB_URL = process.env.SUPABASE_URL || 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

    return bad(res, 400, 'unknown action');
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e).slice(0, 200) });
  }
};
