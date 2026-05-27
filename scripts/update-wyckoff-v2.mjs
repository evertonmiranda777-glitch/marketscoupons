#!/usr/bin/env node
// Update Wyckoff EN body via blog-bulk-upsert edge function (uses service_role)
import fs from 'fs';

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

const html = fs.readFileSync('data/preview/blog-v2/wyckoff-method-2026.v2.html', 'utf8');

function extractBody(html) {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let body = m[1];
  body = body.replace(/<div class="wrap">\s*/i, '');
  body = body.replace(/\s*<\/div>\s*$/i, '');
  body = body.replace(/<header[^>]*class="hero"[\s\S]*?<\/header>/i, '');
  body = body.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, '');
  body = body.replace(/<p class="subtitle"[\s\S]*?<\/p>/i, '');
  body = body.replace(/<p class="meta"[\s\S]*?<\/p>/i, '');
  // Prepend style block
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  const style = styleMatch ? `<style>${styleMatch[1]}</style>\n` : '';
  return (style + body).trim();
}

const body = extractBody(html);
console.log(`Body: ${body.length} chars · SVGs: ${(body.match(/figure class="diagram"/g) || []).length}`);

const post = {
  slug: 'wyckoff-method-2026',
  lang: 'en',
  title: 'The Wyckoff Method in 2026 — Why a 100-Year-Old Framework Still Predicts Crashes Modern Quants Miss',
  category: 'Technical Analysis',
  level: 'intermediate',
  read_time: '55 min',
  icon: '📈',
  cover_url: 'https://www.marketscoupons.com/img/blog-heros/wyckoff-method-2026.jpg',
  excerpt: 'Updated guide to the Wyckoff Method: 4 phases, accumulation/distribution schematics with 9 canonical events each, the composite operator, and modern applications.',
  sort_order: 22,
  author: 'Markets Coupons Research',
  body,
  active: true,
};

const res = await fetch(`${SUPABASE_URL}/functions/v1/blog-bulk-upsert`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON}`, 'apikey': SUPABASE_ANON },
  body: JSON.stringify({ posts: [post] }),
});
console.log('HTTP', res.status);
console.log((await res.text()).slice(0, 600));
