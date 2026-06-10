#!/usr/bin/env node
import fs from 'fs';

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

const html = fs.readFileSync('data/preview/blog-v2/order-flow-footprint.v2.html', 'utf8');

function extractBody(html) {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let body = m[1];
  body = body.replace(/<div class="wrap">\s*/i, '');
  body = body.replace(/\s*<\/div>\s*$/i, '');
  body = body.replace(/<header[^>]*class="hero"[\s\S]*?<\/header>/i, '');
  body = body.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, '');
  body = body.replace(/<p class="subtitle"[\s\S]*?<\/p>/i, '');
  body = body.replace(/<p class="meta"[\s\S]*?<\/p>/i, '');
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  const style = styleMatch ? `<style>${styleMatch[1]}</style>\n` : '';
  return (style + body).trim();
}

const body = extractBody(html);
console.log(`Body: ${body.length} · SVGs: ${(body.match(/figure class="diagram"/g) || []).length}`);

const post = {
  slug: 'order-flow-footprint', lang: 'en',
  title: 'Order Flow & Footprint Charts, Reading the Auction at the Bid and Ask in Real Time',
  category: 'Technical Analysis', level: 'advanced', read_time: '56 min', icon: '🔬',
  cover_url: 'https://www.marketscoupons.com/img/blog-heros/order-flow-footprint.jpg',
  excerpt: 'The complete guide to order flow trading: footprint anatomy, delta divergence, absorption, iceberg detection, and the institutional playbook for reading the tape.',
  sort_order: 23, author: 'Markets Coupons Research', body, active: true,
};

const res = await fetch(`${SUPABASE_URL}/functions/v1/blog-bulk-upsert`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
  body: JSON.stringify({ posts: [post] }),
});
console.log('HTTP', res.status);
console.log((await res.text()).slice(0, 500));
