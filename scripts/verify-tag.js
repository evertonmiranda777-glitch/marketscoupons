// Verifica estado de tags de uma lista de emails. Diagnóstico do dedup.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SK) { console.error('SUPABASE_SERVICE_ROLE_KEY missing'); process.exit(1); }

const HEADERS = { apikey: SK, Authorization: `Bearer ${SK}` };

async function check(email) {
  const url = `${SUPABASE_URL}/rest/v1/email_subscribers?email=eq.${encodeURIComponent(email)}&select=email,tags,status`;
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) return { email, error: r.status };
  const rows = await r.json();
  if (!rows.length) return { email, status: 'NOT_FOUND' };
  const row = rows[0];
  const tags = Array.isArray(row.tags) ? row.tags : (row.tags ? [row.tags] : []);
  return { email: row.email, status: row.status, tags, hasInviteTag: tags.includes('received-site-invite') };
}

async function main() {
  // Pega 1 email do blacklist (já recebeu) + 3 emails subscribers que não receberam
  const today = new Date().toISOString().slice(0, 10);
  const blRes = await fetch(`${SUPABASE_URL}/storage/v1/object/backups/site-invite-blacklist-${today}.json`, { headers: HEADERS });
  const bl = blRes.ok ? await blRes.json() : { emails: [] };
  const sampleAlready = bl.emails.slice(0, 2);

  // Pega 3 subscribers ativos quaisquer pra checar quem NÃO tem tag
  const sub = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?status=eq.active&limit=200&select=email,tags`, { headers: HEADERS });
  const allActive = await sub.json();
  const sampleNotTagged = allActive
    .filter(s => {
      const t = Array.isArray(s.tags) ? s.tags : [];
      return !t.includes('received-site-invite');
    })
    .slice(0, 3)
    .map(s => s.email);

  console.log('=== EMAILS QUE JÁ RECEBERAM (devem ter tag) ===');
  for (const e of sampleAlready) {
    const r = await check(e);
    console.log(`  ${r.email}: hasTag=${r.hasInviteTag} | tags=${JSON.stringify(r.tags)}`);
  }

  console.log('\n=== EMAILS QUE NÃO RECEBERAM (não devem ter tag) ===');
  for (const e of sampleNotTagged) {
    const r = await check(e);
    console.log(`  ${r.email}: hasTag=${r.hasInviteTag} | tags=${JSON.stringify(r.tags)}`);
  }

  console.log('\n=== CONTAGENS ===');
  const tagged = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?tags=cs.{received-site-invite}&select=count`, {
    headers: { ...HEADERS, Prefer: 'count=exact', Range: '0-0' },
  });
  const total = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?status=eq.active&select=count`, {
    headers: { ...HEADERS, Prefer: 'count=exact', Range: '0-0' },
  });
  console.log(`  Total subscribers ativos: ${total.headers.get('content-range')}`);
  console.log(`  Subscribers com tag received-site-invite: ${tagged.headers.get('content-range')}`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
