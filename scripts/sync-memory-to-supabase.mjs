#!/usr/bin/env node
/**
 * sync-memory-to-supabase.mjs
 *
 * Backup PERMANENTE das memórias do Claude pro Supabase.
 * Roda quando salvar memória — ou em cron diário.
 * Mandamento #12 da DOUTRINA IMPARÁVEL.
 *
 * Lê: C:/Users/evert/.claude/projects/c--Users-evert-Downloads-marketscoupons-repo/memory/*.md
 * Escreve: tabela claude_memory_backup no Supabase
 *
 * Idempotente — só upsert se content_hash mudou.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE=... node scripts/sync-memory-to-supabase.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SB_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SR = process.env.SUPABASE_SERVICE_ROLE
  || fs.readFileSync('.env.local', 'utf8').match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();
if (!SR) { console.error('SUPABASE_SERVICE_ROLE missing'); process.exit(1); }

const MEM_DIR = 'C:/Users/evert/.claude/projects/c--Users-evert-Downloads-marketscoupons-repo/memory';

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
  if (!m) return { fm: {}, body: content };
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
    const meta = line.match(/^\s+type:\s*(.+)$/);
    if (meta) fm.type = meta[1].trim();
  }
  return { fm, body: m[2] };
}

async function upsertMemory(record) {
  const r = await fetch(`${SB_URL}/rest/v1/claude_memory_backup`, {
    method: 'POST',
    headers: {
      apikey: SR,
      Authorization: `Bearer ${SR}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(record),
  });
  return r.ok;
}

async function main() {
  if (!fs.existsSync(MEM_DIR)) {
    console.error('Memory dir not found:', MEM_DIR);
    process.exit(1);
  }
  const files = fs.readdirSync(MEM_DIR).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} memory files`);

  let synced = 0, skipped = 0, errors = 0;
  for (const f of files) {
    const fullPath = path.join(MEM_DIR, f);
    const content = fs.readFileSync(fullPath, 'utf8');
    const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);

    // Check existing hash via PATCH-or-skip
    const checkR = await fetch(`${SB_URL}/rest/v1/claude_memory_backup?id=eq.${encodeURIComponent(f)}&select=content_hash`, {
      headers: { apikey: SR, Authorization: `Bearer ${SR}` },
    });
    const existing = await checkR.json();
    if (existing[0]?.content_hash === hash) { skipped++; continue; }

    const { fm, body } = parseFrontmatter(content);
    const record = {
      id: f,
      name: fm.name || f.replace('.md', ''),
      description: fm.description || '',
      type: fm.type || 'unknown',
      content,
      file_path: fullPath,
      content_hash: hash,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const ok = await upsertMemory(record);
    if (ok) synced++; else { errors++; console.error(`  fail: ${f}`); }
  }

  console.log(`✓ Synced ${synced} | Skipped ${skipped} unchanged | Errors ${errors}`);

  // Confirm count em prod
  const countR = await fetch(`${SB_URL}/rest/v1/claude_memory_backup?select=count`, {
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, Prefer: 'count=exact' },
  });
  const total = countR.headers.get('content-range')?.split('/')[1];
  console.log(`Supabase total: ${total} memories backed up`);
}

main().catch(e => { console.error(e); process.exit(1); });
