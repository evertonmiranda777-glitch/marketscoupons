#!/usr/bin/env node
// Publish the VPA v7 article (EN base) to blog_posts, byte-exact from the file.
// Requires SUPABASE_SERVICE_ROLE_KEY in env (RLS: insert needs is_admin / service role).
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
function readKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  for (const f of ['.env.local', '.env.tmp.txt']) {
    if (!fs.existsSync(f)) continue;
    const m = fs.readFileSync(f, 'utf8').match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*"?([^"\s]+)"?/);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}
const KEY = readKey();
if (!KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY (env or .env.local)'); process.exit(1); }
const db = createClient(URL, KEY, { auth: { persistSession: false } });

const body = fs.readFileSync('data/preview/vpa-v7-en.body.html', 'utf8');

const row = {
  title: 'Volume Price Analysis (VPA) — How to Read Institutional Intent in Every Bar',
  slug: 'vpa-volume-price-analysis',
  category: 'Technical Analysis',
  level: 'intermediate',
  read_time: '32 min',
  body,
  excerpt: 'The complete VPA guide built on Wyckoff, Tom Williams and Anna Coulling: effort vs result, no-supply and climax bars, the four-phase cycle, three high-probability setups, and prop-firm risk.',
  icon: '\u{1F4CA}',
  active: true,
  ai_generated: true,
  sort_order: 24,
  lang: 'en',
  cover_url: 'https://www.marketscoupons.com/img/blog-heros/vpa-volume-price-analysis.webp',
  author: 'Markets Coupons Research',
};

const { data, error } = await db.from('blog_posts')
  .upsert(row, { onConflict: 'slug,lang' })
  .select('slug,lang')
  .maybeSingle();

if (error) { console.error('UPSERT failed:', error.message); process.exit(1); }
console.log('Published EN:', data);
