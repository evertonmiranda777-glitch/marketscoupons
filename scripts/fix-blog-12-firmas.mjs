#!/usr/bin/env node
// Replace hardcoded "12 firmas/firms/aziende/entreprises/firmen" → "17"
// across blog_posts. Adds idempotency check (won't re-patch if already 17).
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
let KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
if (!KEY && fs.existsSync('.env.tmp.txt')) {
  const m = fs.readFileSync('.env.tmp.txt','utf8').match(/SUPABASE_SERVICE_ROLE_KEY=(\S+)/);
  if (m) KEY = m[1];
}
if (!KEY) { console.error('missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const db = createClient(SUPABASE_URL, KEY);

// Word per lang: pt/es=firmas, en=firms, it=aziende, fr=entreprises, de=firmen
const PATTERNS = [
  // (regex, replacement), \b boundaries where useful
  [/\b12 firmas\b/g, '17 firmas'],
  [/\b12 firms\b/g, '17 firms'],
  [/\b12 aziende\b/g, '17 aziende'],
  [/\b12 entreprises\b/g, '17 entreprises'],
  [/\b12 firmen\b/gi, '17 Firmen'],
];

const { data, error } = await db.from('blog_posts').select('id,slug,lang,body').eq('active', true);
if (error) { console.error(error); process.exit(1); }

let touched = 0;
for (const row of data) {
  if (!row.body) continue;
  let newBody = row.body;
  let hits = 0;
  for (const [re, rep] of PATTERNS) {
    const before = newBody;
    newBody = newBody.replace(re, rep);
    if (newBody !== before) hits++;
  }
  if (hits === 0) continue;
  const { error: uerr } = await db.from('blog_posts').update({ body: newBody }).eq('id', row.id);
  if (uerr) { console.error('update failed', row.slug, row.lang, uerr); continue; }
  console.log(`patched ${row.slug}/${row.lang} (${hits} pattern(s))`);
  touched++;
}
console.log(`\ntotal patched: ${touched}`);
