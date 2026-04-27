// Backup diário das tabelas críticas do Supabase → Supabase Storage bucket "backups".
// Roda via .github/workflows/backup-supabase.yml às 03:00 UTC daily.
//
// Tabelas inclusas:
//   - cms_firms (config das 11 firmas)
//   - i18n (traduções UI)
//   - cms_texts (textos legados)
//   - email_subscribers (lista de emails)
//   - loyalty_members + loyalty_proofs (programa fidelidade)
//   - profiles (usuários autenticados)
//   - blog_posts + cms_guides (conteúdo)
//   - firm_translations (dados firma multilíngue)
//   - events (últimos 30 dias — full table seria gigante)
//
// Output: backups/YYYY-MM-DD/<table>.json (JSON pretty-printed)
// Retenção: deleta backups com mais de 30 dias.
//
// Restore (manual): ver instruções em scripts/RESTORE.md

import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY missing'); process.exit(1); }

const BUCKET = 'backups';
const RETENTION_DAYS = 30;

const TABLES = [
  { name: 'cms_firms',         query: 'select=*' },
  { name: 'i18n',              query: 'select=*' },
  { name: 'cms_texts',         query: 'select=*' },
  { name: 'firm_translations', query: 'select=*' },
  { name: 'email_subscribers', query: 'select=*' },
  { name: 'loyalty_members',   query: 'select=*' },
  { name: 'loyalty_proofs',    query: 'select=*' },
  { name: 'profiles',          query: 'select=*' },
  { name: 'blog_posts',        query: 'select=*' },
  { name: 'cms_guides',        query: 'select=*' },
  { name: 'site_settings',     query: 'select=*' },
  // events: só últimos 30 dias (tabela cresce rápido)
  { name: 'events', query: () => {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    return `select=*&created_at=gte.${encodeURIComponent(cutoff)}`;
  }},
];

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

async function ensureBucket() {
  // Lista buckets, cria 'backups' se não existir (privado).
  const list = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, { headers });
  if (!list.ok) throw new Error(`bucket list ${list.status}`);
  const buckets = await list.json();
  if (buckets.some(b => b.name === BUCKET)) return;

  const create = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
  });
  if (!create.ok) {
    const err = await create.text();
    throw new Error(`bucket create ${create.status}: ${err}`);
  }
  console.log(`[backup] bucket "${BUCKET}" criado (privado)`);
}

async function fetchTable(name, query) {
  const q = typeof query === 'function' ? query() : query;
  const url = `${SUPABASE_URL}/rest/v1/${name}?${q}`;
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`fetch ${name} ${r.status}: ${await r.text().catch(()=>'?')}`);
  return r.json();
}

async function uploadObject(key, json) {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${key}`;
  const body = JSON.stringify(json, null, 2);
  const r = await fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', 'x-upsert': 'true' },
    body,
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`upload ${key} ${r.status}: ${err}`);
  }
  return body.length;
}

async function listOldFolders() {
  // Lista folders de backup e retorna os com mais de RETENTION_DAYS dias.
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: '', limit: 1000, offset: 0 }),
  });
  if (!r.ok) return [];
  const items = await r.json();
  const cutoff = Date.now() - RETENTION_DAYS * 86400000;
  const old = new Set();
  for (const it of items) {
    const folder = (it.name || '').split('/')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(folder)) continue;
    const folderTime = Date.parse(folder + 'T00:00:00Z');
    if (folderTime < cutoff) old.add(folder);
  }
  return Array.from(old);
}

async function deleteFolder(folder) {
  // Lista objetos da pasta e deleta em batch.
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: folder + '/', limit: 100, offset: 0 }),
  });
  if (!r.ok) return;
  const items = await r.json();
  const paths = items.map(it => `${folder}/${it.name}`);
  if (paths.length === 0) return;

  const del = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: paths }),
  });
  if (del.ok) console.log(`[backup] deleted folder ${folder} (${paths.length} files)`);
}

async function main() {
  console.log('[backup] starting Supabase backup');
  await ensureBucket();

  const today = new Date().toISOString().slice(0, 10);
  let totalBytes = 0;
  const summary = [];

  for (const t of TABLES) {
    try {
      const data = await fetchTable(t.name, t.query);
      const bytes = await uploadObject(`${today}/${t.name}.json`, data);
      totalBytes += bytes;
      summary.push(`${t.name}: ${data.length} rows, ${(bytes/1024).toFixed(1)} KB`);
      console.log(`[backup] ✅ ${t.name} (${data.length} rows, ${(bytes/1024).toFixed(1)} KB)`);
    } catch (e) {
      summary.push(`${t.name}: FAILED — ${e.message}`);
      console.error(`[backup] ❌ ${t.name}:`, e.message);
    }
  }

  // Upload manifest
  const manifest = {
    date: today,
    timestamp: new Date().toISOString(),
    total_bytes: totalBytes,
    total_kb: (totalBytes / 1024).toFixed(1),
    tables: summary,
  };
  await uploadObject(`${today}/_manifest.json`, manifest);
  console.log(`[backup] manifest: ${(totalBytes/1024).toFixed(1)} KB total`);

  // Cleanup old
  const oldFolders = await listOldFolders();
  for (const f of oldFolders) await deleteFolder(f);

  console.log('[backup] done');
}

main().catch(err => { console.error('[backup] FATAL:', err); process.exit(1); });
