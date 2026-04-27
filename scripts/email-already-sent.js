// One-shot: lista emails que JÁ receberam o site-invite via Brevo events.
// Output: salva blacklist em backups/site-invite-already-sent-{date}.json no Supabase Storage.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO = process.env.BREVO_API_KEY;
if (!SK || !BREVO) { console.error('keys missing'); process.exit(1); }

const SUB_HEAD = { apikey: SK, Authorization: `Bearer ${SK}` };

// Tags Brevo associadas com a campanha site-invite
const TAGS_OF_INTEREST = ['site-invite', 'invite-site'];
// Subjects que indicam site-invite — TODOS os 7 idiomas
const SUBJECT_PATTERNS = [
  /\$25K account for \$19\.90/i,        // EN
  /Conta de \$25K por \$19/i,           // PT
  /Cuenta de \$25K por \$19/i,          // ES
  /Compte de \$25K pour \$19/i,         // FR
  /\$25K Konto für \$19/i,              // DE
  /Conto da \$25K a \$19/i,             // IT
  /حساب \$25K بسعر \$19/i,              // AR
  /site-invite/i,                       // tag fallback
];

async function fetchBrevoEvents(offset = 0, limit = 2500, eventType = 'delivered') {
  // Brevo: últimos N events. Tipos: requests, delivered, opens, clicks, bounces, etc.
  // Sem 'event' param, retorna TODOS os tipos misturados.
  // Sem 'days', max 90 dias por default.
  const startDate = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];
  let url = `https://api.brevo.com/v3/smtp/statistics/events?limit=${limit}&offset=${offset}&startDate=${startDate}&endDate=${endDate}&sort=desc`;
  if (eventType) url += `&event=${eventType}`;
  const r = await fetch(url, { headers: { 'accept': 'application/json', 'api-key': BREVO } });
  if (!r.ok) {
    console.error(`brevo ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return null;
  }
  return r.json();
}

async function main() {
  console.log('=== DEBUG: 1 event sample pra ver shape do response ===');
  const sample = await fetchBrevoEvents(0, 5, 'delivered');
  if (sample && sample.events && sample.events[0]) {
    console.log(JSON.stringify(sample.events[0], null, 2));
    console.log('---');
  }

  console.log('\n=== Coletando ALL delivered events últimos 90 dias ===');
  const sentEmails = new Set();
  const subjectsCount = {}; // pra ver TODOS subjects e identificar quais pertencem ao site-invite
  let offset = 0;
  const PAGE = 2500;

  while (true) {
    const data = await fetchBrevoEvents(offset, PAGE, 'delivered');
    if (!data || !data.events || data.events.length === 0) break;

    for (const ev of data.events) {
      const subject = (ev.subject || '').trim();
      if (subject) subjectsCount[subject] = (subjectsCount[subject] || 0) + 1;
      const tags = Array.isArray(ev.tags) ? ev.tags.join(',') : (ev.tags || '');
      const matchesTag = TAGS_OF_INTEREST.some(t => tags.includes(t));
      const matchesSubject = SUBJECT_PATTERNS.some(re => re.test(subject));
      if (matchesTag || matchesSubject) {
        sentEmails.add(ev.email.toLowerCase().trim());
      }
    }
    console.log(`  page offset=${offset}: ${data.events.length} events, total unique site-invite=${sentEmails.size}`);
    if (data.events.length < PAGE) break;
    offset += PAGE;
    if (offset > 100000) { console.warn('safety stop at 100k'); break; }
  }

  console.log('\n=== TOP 20 subjects por volume nos events ===');
  Object.entries(subjectsCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([s, n]) => console.log(`  ${String(n).padStart(6)} | ${s.slice(0, 80)}`));

  console.log(`\n=== TOTAL ÚNICO de emails que já receberam site-invite: ${sentEmails.size} ===\n`);

  // Salva no Supabase Storage
  const today = new Date().toISOString().slice(0, 10);
  const payload = {
    date: today,
    total_unique_emails: sentEmails.size,
    emails: Array.from(sentEmails).sort(),
  };
  const key = `site-invite-blacklist-${today}.json`;
  const upUrl = `${SUPABASE_URL}/storage/v1/object/backups/${key}`;
  const up = await fetch(upUrl, {
    method: 'POST',
    headers: { ...SUB_HEAD, 'Content-Type': 'application/json', 'x-upsert': 'true' },
    body: JSON.stringify(payload, null, 2),
  });
  if (!up.ok) console.error(`upload ${up.status}: ${await up.text()}`);
  else console.log(`✅ Salvo em backups/${key}`);

  // Print primeiros 10 + últimos 10 pra sanity
  const arr = Array.from(sentEmails).sort();
  console.log('\nPrimeiros 10:');
  arr.slice(0, 10).forEach(e => console.log(`  ${e}`));
  console.log('\nÚltimos 10:');
  arr.slice(-10).forEach(e => console.log(`  ${e}`));
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
