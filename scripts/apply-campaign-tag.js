// One-shot: aplica tag `received-{campaign}` em email_subscribers.tags
// pros emails listados na blacklist do Supabase Storage.
//
// Uso: node scripts/apply-campaign-tag.js <campaign> [<blacklist-storage-path>]
// Default: campaign='site-invite', path='backups/site-invite-blacklist-{TODAY}.json'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SK) { console.error('SUPABASE_SERVICE_ROLE_KEY missing'); process.exit(1); }

const CAMPAIGN = process.argv[2] || process.env.CAMPAIGN || 'site-invite';
const TAG = `received-${CAMPAIGN}`;

const HEADERS = { apikey: SK, Authorization: `Bearer ${SK}` };

async function loadBlacklist() {
  // Tenta baixar do Supabase Storage o JSON com lista de emails
  const today = new Date().toISOString().slice(0, 10);
  const candidates = [
    process.argv[3],
    `${CAMPAIGN}-blacklist-${today}.json`,
    // fallback: lista todas as blacklist files do bucket e usa a mais recente
  ].filter(Boolean);

  for (const path of candidates) {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/backups/${path}`, { headers: HEADERS });
    if (r.ok) {
      const data = await r.json();
      return data.emails || [];
    }
  }

  // Fallback: lista bucket e pega o file mais recente que casa o pattern
  const list = await fetch(`${SUPABASE_URL}/storage/v1/object/list/backups`, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: '', limit: 100 }),
  });
  if (list.ok) {
    const items = await list.json();
    const matches = items
      .filter(it => (it.name || '').includes(`${CAMPAIGN}-blacklist`))
      .sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    if (matches[0]) {
      console.log(`Usando ${matches[0].name}`);
      const r = await fetch(`${SUPABASE_URL}/storage/v1/object/backups/${matches[0].name}`, { headers: HEADERS });
      if (r.ok) {
        const data = await r.json();
        return data.emails || [];
      }
    }
  }

  throw new Error(`blacklist não encontrado pra campaign=${CAMPAIGN}`);
}

async function getCurrentTags(email) {
  const url = `${SUPABASE_URL}/rest/v1/email_subscribers?email=eq.${encodeURIComponent(email)}&select=tags`;
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) return null;
  const rows = await r.json();
  return rows[0] ? rows[0].tags : null;
}

async function setTags(email, tags) {
  const url = `${SUPABASE_URL}/rest/v1/email_subscribers?email=eq.${encodeURIComponent(email)}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { ...HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ tags }),
  });
  return r.ok;
}

async function applyTag(email) {
  const current = await getCurrentTags(email);
  if (current === null) return 'not_found';
  const arr = Array.isArray(current) ? current : (current ? [current] : []);
  if (arr.includes(TAG)) return 'already_tagged';
  arr.push(TAG);
  const ok = await setTags(email, arr);
  return ok ? 'tagged' : 'error';
}

async function main() {
  console.log(`Campaign: ${CAMPAIGN} → tag: ${TAG}`);
  const emails = await loadBlacklist();
  console.log(`Emails na blacklist: ${emails.length}`);

  const stats = { tagged: 0, already_tagged: 0, not_found: 0, error: 0 };
  for (let i = 0; i < emails.length; i++) {
    const result = await applyTag(emails[i]);
    stats[result] = (stats[result] || 0) + 1;
    if ((i + 1) % 50 === 0 || i === emails.length - 1) {
      console.log(`  ${i + 1}/${emails.length} | ${JSON.stringify(stats)}`);
    }
  }
  console.log(`\n✅ Final: ${JSON.stringify(stats)}`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
