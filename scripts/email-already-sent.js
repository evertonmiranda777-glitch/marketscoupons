// One-shot: lista emails que JÁ receberam o site-invite via Brevo events.
// Output: salva blacklist em backups/site-invite-already-sent-{date}.json no Supabase Storage.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO = process.env.BREVO_API_KEY;
if (!SK || !BREVO) { console.error('keys missing'); process.exit(1); }

const SUB_HEAD = { apikey: SK, Authorization: `Bearer ${SK}` };

// Tags Brevo associadas com a campanha site-invite
const TAGS_OF_INTEREST = ['site-invite', 'campaign', 'invite-site'];
// Subjects que indicam site-invite (caso tag não bata)
const SUBJECT_PATTERNS = [/\$25K por \$19/i, /Conta de \$25K/i, /site-invite/i];

async function fetchBrevoEvents(offset = 0, limit = 1000) {
  // Brevo retorna últimos N events. Iteramos paginando.
  // Range: últimos 60 dias.
  const startDate = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];
  const url = `https://api.brevo.com/v3/smtp/statistics/events?limit=${limit}&offset=${offset}&startDate=${startDate}&endDate=${endDate}&sort=desc&event=requests`;
  const r = await fetch(url, { headers: { 'accept': 'application/json', 'api-key': BREVO } });
  if (!r.ok) {
    console.error(`brevo ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return null;
  }
  return r.json();
}

async function main() {
  console.log('=== Coletando events do Brevo (últimos 60 dias) ===');
  const sentEmails = new Set();
  const sentDetail = []; // [{email, date, subject, tag}]
  let offset = 0;
  const PAGE = 1000;

  while (true) {
    const data = await fetchBrevoEvents(offset, PAGE);
    if (!data || !data.events || data.events.length === 0) break;

    let pageMatched = 0;
    for (const ev of data.events) {
      const subject = ev.subject || '';
      const tags = (ev.tags || []).join(',');
      const matchesTag = TAGS_OF_INTEREST.some(t => tags.includes(t));
      const matchesSubject = SUBJECT_PATTERNS.some(re => re.test(subject));
      if (matchesTag || matchesSubject) {
        sentEmails.add(ev.email.toLowerCase().trim());
        sentDetail.push({ email: ev.email, date: ev.date, subject, tags });
        pageMatched++;
      }
    }
    console.log(`  page offset=${offset}: ${data.events.length} events, ${pageMatched} matches site-invite`);
    if (data.events.length < PAGE) break;
    offset += PAGE;
    if (offset > 50000) { console.warn('safety stop at 50k'); break; }
  }

  console.log(`\n=== TOTAL ÚNICO de emails que já receberam site-invite: ${sentEmails.size} ===\n`);

  // Salva no Supabase Storage
  const today = new Date().toISOString().slice(0, 10);
  const payload = {
    date: today,
    total_unique_emails: sentEmails.size,
    total_events: sentDetail.length,
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
