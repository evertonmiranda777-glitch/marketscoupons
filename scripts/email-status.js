// One-shot diagnóstico de email — quem recebeu o quê, quando.
// Uso: gh workflow run email-status.yml + ler logs do run

import { setTimeout as sleep } from 'timers/promises';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SK) { console.error('SUPABASE_SERVICE_ROLE_KEY missing'); process.exit(1); }

const headers = { apikey: SK, Authorization: `Bearer ${SK}` };

async function fetchAll(path) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const r = await fetch(url, { headers });
  if (!r.ok) { console.error(`${path} ${r.status}: ${await r.text()}`); return null; }
  return r.json();
}

async function main() {
  console.log('=== 1. SCHEMA email_subscribers ===');
  const oneSub = await fetchAll('email_subscribers?limit=1');
  if (oneSub && oneSub[0]) {
    console.log('Colunas:', Object.keys(oneSub[0]).join(', '));
  }

  console.log('\n=== 2. campaign_name distintos no email_logs (últimos 60 dias) ===');
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();
  const logs = await fetchAll(`email_logs?created_at=gte.${encodeURIComponent(sixtyDaysAgo)}&select=campaign_name,sent_by,recipients,status,created_at,subject&order=created_at.desc&limit=100`);
  if (logs) {
    console.log(`Total logs últimos 60d: ${logs.length}`);
    // Group by campaign
    const byCampaign = {};
    for (const l of logs) {
      const k = l.campaign_name || '(sem nome)';
      if (!byCampaign[k]) byCampaign[k] = { count: 0, totalRecipients: 0, lastDate: '', sentBy: l.sent_by };
      byCampaign[k].count++;
      byCampaign[k].totalRecipients += (l.recipients || 0);
      if (!byCampaign[k].lastDate || l.created_at > byCampaign[k].lastDate) byCampaign[k].lastDate = l.created_at;
    }
    console.log('\nAgrupado por campaign:');
    for (const [k, v] of Object.entries(byCampaign)) {
      console.log(`  ${k.padEnd(40)} | sent_by=${(v.sentBy||'?').padEnd(10)} | runs=${v.count} | total_recipients=${v.totalRecipients} | last=${v.lastDate.slice(0,16)}`);
    }
    console.log('\n10 mais recentes:');
    for (const l of logs.slice(0, 10)) {
      console.log(`  ${l.created_at.slice(0,16)} | by=${(l.sent_by||'?').padEnd(10)} | n=${String(l.recipients||'?').padStart(6)} | ${l.status||'?'} | ${(l.campaign_name||'?').slice(0,40)}`);
    }
  }

  console.log('\n=== 3. email_subscribers — counts por status ===');
  const allSubs = await fetchAll('email_subscribers?select=status,created_at,sent_count,last_sent_at,tags');
  if (allSubs) {
    console.log(`Total subscribers: ${allSubs.length}`);
    const byStatus = {};
    let withSentCount = 0;
    let withLastSent = 0;
    let withTags = 0;
    for (const s of allSubs) {
      const st = s.status || '(null)';
      byStatus[st] = (byStatus[st] || 0) + 1;
      if (s.sent_count != null) withSentCount++;
      if (s.last_sent_at) withLastSent++;
      if (s.tags) withTags++;
    }
    for (const [st, n] of Object.entries(byStatus)) {
      console.log(`  status=${st.padEnd(15)} → ${n}`);
    }
    console.log(`  com sent_count: ${withSentCount}/${allSubs.length}`);
    console.log(`  com last_sent_at: ${withLastSent}/${allSubs.length}`);
    console.log(`  com tags: ${withTags}/${allSubs.length}`);
  }

  console.log('\n=== 4. samples ===');
  const samples = await fetchAll('email_subscribers?select=email,status,sent_count,last_sent_at,tags&order=created_at.desc&limit=5');
  if (samples) {
    for (const s of samples) {
      console.log(`  ${s.email} | status=${s.status} | sent_count=${s.sent_count} | last_sent_at=${s.last_sent_at} | tags=${JSON.stringify(s.tags)}`);
    }
  }
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
