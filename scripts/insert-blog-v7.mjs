#!/usr/bin/env node
// Extracts body content from data/preview/blog-v2/*.v1.html, transforms to blog_posts schema, outputs SQL inserts to stdout.
// Run: node scripts/insert-blog-v7.mjs > /tmp/blog-v7-inserts.sql

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dir = path.join(root, 'data/preview/blog-v2');

const articles = [
  { slug: 'vpa-volume-price-analysis', file: 'vpa-volume-price-analysis.v1.html',
    title: 'Volume Price Analysis — The 100-Year-Old Edge That Still Beats 90% of Modern Traders',
    category: 'Technical Analysis', level: 'intermediate', read_time: '58 min', icon: '📊',
    cover_url: 'https://www.marketscoupons.com/img/blog-heros/vpa-volume-price-analysis.jpg',
    excerpt: 'The definitive guide to Volume Price Analysis: how to read smart money footprints in any chart. The 100-year-old framework retail traders still ignore.',
    sort_order: 21 },
  { slug: 'wyckoff-method-2026', file: 'wyckoff-method-2026.v1.html',
    title: 'The Wyckoff Method in 2026 — Why a 100-Year-Old Framework Still Predicts Crashes Modern Quants Miss',
    category: 'Technical Analysis', level: 'intermediate', read_time: '55 min', icon: '📈',
    cover_url: 'https://www.marketscoupons.com/img/blog-heros/wyckoff-method-2026.jpg',
    excerpt: 'Updated guide to the Wyckoff Method: 4 phases, accumulation/distribution schematics with 9 canonical events each, the composite operator, and modern applications.',
    sort_order: 22 },
  { slug: 'order-flow-footprint', file: 'order-flow-footprint.v1.html',
    title: 'Order Flow & Footprint Charts — Reading the Auction at the Bid and Ask in Real Time',
    category: 'Technical Analysis', level: 'advanced', read_time: '56 min', icon: '🔬',
    cover_url: 'https://www.marketscoupons.com/img/blog-heros/order-flow-footprint.jpg',
    excerpt: 'Order Flow and Footprint charts decoded: aggressive buying, passive selling, absorption, exhaustion. The professional tape, demystified.',
    sort_order: 23 },
  { slug: '0dte-options-deep-dive', file: '0dte-options-deep-dive.v1.html',
    title: '0DTE Options — The Trillion-Dollar Daily Auction Most Traders Don’t Know Exists',
    category: 'Derivatives', level: 'advanced', read_time: '50 min', icon: '⏱️',
    cover_url: 'https://www.marketscoupons.com/img/blog-heros/0dte-options-deep-dive.jpg',
    excerpt: 'Same-day expiry options account for >50% of SPX option volume in 2026. They created the 3 PM ramp, the volatility crush, and the new normal of intraday flow.',
    sort_order: 24 },
  { slug: 'elliott-wave-practical', file: 'elliott-wave-practical.v1.html',
    title: 'Elliott Wave Theory — The Pattern That’s Survived 90 Years of Skeptics',
    category: 'Technical Analysis', level: 'intermediate', read_time: '48 min', icon: '🌊',
    cover_url: 'https://www.marketscoupons.com/img/blog-heros/elliott-wave-practical.jpg',
    excerpt: 'Most traders dismiss Elliott as subjective. The professionals using it correctly catch the biggest moves with the smallest stops.',
    sort_order: 25 },
  { slug: 'risk-management-1r', file: 'risk-management-1r.v1.html',
    title: 'The 1R Doctrine — Why Risk Management Is the Only Edge That Compounds',
    category: 'Risk Management', level: 'intermediate', read_time: '45 min', icon: '🛡️',
    cover_url: 'https://www.marketscoupons.com/img/blog-heros/risk-management-1r.jpg',
    excerpt: '80% accurate strategy can still blow your account. 40% accurate strategy can grow it 10x. The variable that decides is how you size, not how you predict.',
    sort_order: 26 },
  { slug: 'how-to-pass-prop-firm', file: 'how-to-pass-prop-firm.v1.html',
    title: 'How to Pass a Prop Firm Challenge — The Operational Playbook',
    category: 'Prop Firms', level: 'beginner', read_time: '47 min', icon: '🎯',
    cover_url: 'https://www.marketscoupons.com/img/blog-heros/how-to-pass-prop-firm.jpg',
    excerpt: '~7% of evaluation takers pass. ~30% of those earn a single payout. Less than 2% become consistent. This guide is for the 2%.',
    sort_order: 27 },
  { slug: 'trailing-drawdown-vs-eod', file: 'trailing-drawdown-vs-eod.v1.html',
    title: 'Trailing Drawdown vs EOD vs Static — The Hidden Variable That Decides Your Funded Account',
    category: 'Prop Firms', level: 'intermediate', read_time: '42 min', icon: '⚖️',
    cover_url: 'https://www.marketscoupons.com/img/blog-heros/trailing-drawdown-vs-eod.jpg',
    excerpt: 'Two traders, same skill, same strategy. One picks Apex (trailing intraday). The other picks Bulenox (trailing EOD). Six months later, only one is still funded.',
    sort_order: 28 },
  { slug: 'position-sizing-scaling', file: 'position-sizing-scaling.v1.html',
    title: 'Position Sizing & Scaling — How Pros Turn $5K into $500K Without Lottery Math',
    category: 'Risk Management', level: 'intermediate', read_time: '44 min', icon: '📐',
    cover_url: 'https://www.marketscoupons.com/img/blog-heros/position-sizing-scaling.jpg',
    excerpt: 'Most traders obsess over entries. Pros obsess over sizing. The same setup with wrong sizing fails. With proper sizing it compounds.',
    sort_order: 29 },
];

function extractBody(html) {
  // Find everything between <body...> and </body>
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return '';
  let body = bodyMatch[1];
  // Remove the <div class="wrap"> wrapper (keep inner content)
  body = body.replace(/<div class="wrap">\s*/i, '');
  body = body.replace(/\s*<\/div>\s*$/i, ''); // trailing close
  // Remove hero <header> (we'll use cover_url instead via blog template)
  body = body.replace(/<header[^>]*class="hero"[\s\S]*?<\/header>/i, '');
  // Remove h1 (title goes in `title` column)
  body = body.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, '');
  // Remove first p.subtitle and p.meta
  body = body.replace(/<p class="subtitle"[\s\S]*?<\/p>/i, '');
  body = body.replace(/<p class="meta"[\s\S]*?<\/p>/i, '');
  // Strip <script> tags (JSON-LD goes in a separate column or can stay)
  // Keep them — they're useful for SEO
  return body.trim();
}

function escapeSql(s) {
  return s.replace(/'/g, "''");
}

const out = [];
for (const a of articles) {
  const filePath = path.join(dir, a.file);
  if (!fs.existsSync(filePath)) {
    console.error('// MISSING: ' + filePath);
    continue;
  }
  const html = fs.readFileSync(filePath, 'utf8');
  const body = extractBody(html);
  const sql = `INSERT INTO blog_posts (slug, lang, title, category, level, read_time, body, excerpt, icon, cover_url, sort_order, active, ai_generated, author) VALUES ('${a.slug}','en','${escapeSql(a.title)}','${a.category}','${a.level}','${a.read_time}','${escapeSql(body)}','${escapeSql(a.excerpt)}','${a.icon}','${a.cover_url}',${a.sort_order},true,true,'Markets Coupons Research') ON CONFLICT (slug, lang) DO UPDATE SET title=EXCLUDED.title, body=EXCLUDED.body, excerpt=EXCLUDED.excerpt, cover_url=EXCLUDED.cover_url, read_time=EXCLUDED.read_time, sort_order=EXCLUDED.sort_order;`;
  out.push(sql);
  console.error(`OK ${a.slug} (${body.length} chars)`);
}

console.log(out.join('\n'));
