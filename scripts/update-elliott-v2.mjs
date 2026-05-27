#!/usr/bin/env node
import fs from 'fs';
const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';
const html = fs.readFileSync('data/preview/blog-v2/elliott-wave-practical.v2.html', 'utf8');
function extractBody(html) {
  let body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)[1];
  body = body.replace(/<div class="wrap">\s*/i, '').replace(/\s*<\/div>\s*$/i, '');
  body = body.replace(/<header[^>]*class="hero"[\s\S]*?<\/header>/i, '');
  body = body.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, '');
  body = body.replace(/<p class="subtitle"[\s\S]*?<\/p>/i, '');
  body = body.replace(/<p class="meta"[\s\S]*?<\/p>/i, '');
  const s = html.match(/<style>([\s\S]*?)<\/style>/);
  return ((s ? `<style>${s[1]}</style>\n` : '') + body).trim();
}
const body = extractBody(html);
console.log(`Body: ${body.length} · SVGs: ${(body.match(/figure class="diagram"/g) || []).length}`);
const post = {
  slug: 'elliott-wave-practical', lang: 'en',
  title: 'Elliott Wave Practical — How to Read 5-3 Structures Without Losing Your Mind',
  category: 'Technical Analysis', level: 'advanced', read_time: '54 min', icon: '🌊',
  cover_url: 'https://www.marketscoupons.com/img/blog-heros/elliott-wave-practical.jpg',
  excerpt: 'The disciplined trader\'s guide to Elliott Wave: the 3 rules, Fibonacci targets, corrective patterns, real-time labeling, and a step-by-step trading system.',
  sort_order: 25, author: 'Markets Coupons Research', body, active: true,
};
const res = await fetch(`${SUPABASE_URL}/functions/v1/blog-bulk-upsert`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
  body: JSON.stringify({ posts: [post] }),
});
console.log('HTTP', res.status, (await res.text()).slice(0, 300));
