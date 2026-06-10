// Welcome catchup: pega users confirmados sem welcome → dispara welcome + marca tag.
// Roda via GitHub Actions cron horário. Idempotente.
//
// Detecta pendentes: auth.users WHERE email_confirmed_at NOT NULL
//   AND email NÃO está em email_subscribers com tag 'received-welcome'
// Pra cada: POST /api/welcome-email + UPSERT email_subscribers com tag.

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE = process.env.SITE_URL || 'https://www.marketscoupons.com';

if (!SK) { console.error('SUPABASE_SERVICE_ROLE_KEY missing'); process.exit(1); }
const SUB_HEAD = { apikey: SK, Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json' };

async function fetchPending() {
  // Pega últimos 200 users confirmados
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, {
    headers: { apikey: SK, Authorization: `Bearer ${SK}` }
  });
  if (!r.ok) throw new Error('admin users fetch ' + r.status);
  const d = await r.json();
  const confirmed = (d.users || []).filter(u => u.email_confirmed_at && u.email);

  // Lista emails que JÁ receberam welcome (tag received-welcome)
  const emails = confirmed.map(u => u.email.toLowerCase());
  if (!emails.length) return [];
  const inList = emails.map(e => `"${e.replace(/"/g,'\\"')}"`).join(',');
  const subR = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?select=email,tags&email=in.(${encodeURIComponent(inList)})`, { headers: SUB_HEAD });
  const subs = subR.ok ? await subR.json() : [];
  const got = new Set(subs.filter(s => Array.isArray(s.tags) && s.tags.includes('received-welcome')).map(s => s.email.toLowerCase()));

  return confirmed.filter(u => !got.has(u.email.toLowerCase())).map(u => ({
    email: u.email,
    name: u.user_metadata?.name || u.user_metadata?.full_name || 'Trader',
    lang: u.user_metadata?.lang || 'pt',
  }));
}

async function sendWelcome(rec) {
  const r = await fetch(`${SITE}/api/welcome-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rec),
  });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok && d.success, status: r.status, provider: d.provider };
}

async function markReceived(email) {
  // UPSERT email_subscribers, adiciona tag received-welcome
  const getR = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?email=eq.${encodeURIComponent(email)}&select=tags`, { headers: SUB_HEAD });
  const rows = getR.ok ? await getR.json() : [];
  if (rows.length) {
    const cur = Array.isArray(rows[0].tags) ? rows[0].tags : [];
    if (cur.includes('received-welcome')) return true;
    cur.push('received-welcome');
    const up = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?email=eq.${encodeURIComponent(email)}`, {
      method: 'PATCH', headers: { ...SUB_HEAD, Prefer: 'return=minimal' },
      body: JSON.stringify({ tags: cur }),
    });
    return up.ok;
  } else {
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers`, {
      method: 'POST', headers: { ...SUB_HEAD, Prefer: 'return=minimal' },
      body: JSON.stringify({ email, status: 'active', tags: ['received-welcome'], source: 'welcome-catchup' }),
    });
    return ins.ok;
  }
}

(async () => {
  console.log('[welcome-catchup] start', new Date().toISOString());
  const pending = await fetchPending();
  console.log(`[welcome-catchup] pending: ${pending.length}`);
  let sent = 0, failed = 0;
  for (const rec of pending) {
    const r = await sendWelcome(rec);
    if (r.ok) {
      await markReceived(rec.email).catch(() => null);
      sent++;
      console.log(`  ✓ ${rec.email} (${r.provider})`);
    } else {
      failed++;
      console.log(`  ✗ ${rec.email} status=${r.status}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`[welcome-catchup] done, sent=${sent} failed=${failed}`);
  if (failed > 0 && sent === 0) process.exit(1);
})().catch(e => { console.error('[welcome-catchup] fatal', e); process.exit(1); });
