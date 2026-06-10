#!/usr/bin/env node
// Calls blog-bulk-upsert edge function with all 9 v7 articles' bodies extracted from data/preview/blog-v2/*.v1.html
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dir = path.join(root, 'data/preview/blog-v2');

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

const articles = [
  { slug: 'vpa-volume-price-analysis', file: 'vpa-volume-price-analysis.v1.html',
    title: 'Volume Price Analysis, The 100-Year-Old Edge That Still Beats 90% of Modern Traders',
    category: 'Technical Analysis', level: 'intermediate', read_time: '58 min', icon: '📊',
    cover_url: 'https://www.marketscoupons.com/img/blog-heros/vpa-volume-price-analysis.jpg',
    excerpt: 'The definitive guide to Volume Price Analysis: how to read smart money footprints in any chart. The 100-year-old framework retail traders still ignore.',
    sort_order: 21 },
  { slug: 'wyckoff-method-2026', file: 'wyckoff-method-2026.v1.html',
    title: 'The Wyckoff Method in 2026, Why a 100-Year-Old Framework Still Predicts Crashes Modern Quants Miss',
    category: 'Technical Analysis', level: 'intermediate', read_time: '55 min', icon: '📈',
    cover_url: 'https://www.marketscoupons.com/img/blog-heros/wyckoff-method-2026.jpg',
    excerpt: 'Updated guide to the Wyckoff Method: 4 phases, accumulation/distribution schematics with 9 canonical events each, the composite operator, and modern applications.',
    sort_order: 22 },
  { slug: 'order-flow-footprint', file: 'order-flow-footprint.v1.html',
    title: 'Order Flow & Footprint Charts, Reading the Auction at the Bid and Ask in Real Time',
    category: 'Technical Analysis', level: 'advanced', read_time: '56 min', icon: '🔬',
    cover_url: 'https://www.marketscoupons.com/img/blog-heros/order-flow-footprint.jpg',
    excerpt: 'Order Flow and Footprint charts decoded: aggressive buying, passive selling, absorption, exhaustion. The professional tape, demystified.',
    sort_order: 23 },
  { slug: '0dte-options-deep-dive', file: '0dte-options-deep-dive.v1.html',
    title: '0DTE Options, The Trillion-Dollar Daily Auction Most Traders Don’t Know Exists',
    category: 'Derivatives', level: 'advanced', read_time: '50 min', icon: '⏱️',
    cover_url: 'https://www.marketscoupons.com/img/blog-heros/0dte-options-deep-dive.jpg',
    excerpt: 'Same-day expiry options account for >50% of SPX option volume in 2026. They created the 3 PM ramp, the volatility crush, and the new normal of intraday flow.',
    sort_order: 24 },
  { slug: 'elliott-wave-practical', file: 'elliott-wave-practical.v1.html',
    title: 'Elliott Wave Theory, The Pattern That’s Survived 90 Years of Skeptics',
    category: 'Technical Analysis', level: 'intermediate', read_time: '48 min', icon: '🌊',
    cover_url: 'https://www.marketscoupons.com/img/blog-heros/elliott-wave-practical.jpg',
    excerpt: 'Most traders dismiss Elliott as subjective. The professionals using it correctly catch the biggest moves with the smallest stops.',
    sort_order: 25 },
  { slug: 'risk-management-1r', file: 'risk-management-1r.v1.html',
    title: 'The 1R Doctrine, Why Risk Management Is the Only Edge That Compounds',
    category: 'Risk Management', level: 'intermediate', read_time: '45 min', icon: '🛡️',
    cover_url: 'https://www.marketscoupons.com/img/blog-heros/risk-management-1r.jpg',
    excerpt: '80% accurate strategy can still blow your account. 40% accurate strategy can grow it 10x. The variable that decides is how you size, not how you predict.',
    sort_order: 26 },
  { slug: 'how-to-pass-prop-firm', file: 'how-to-pass-prop-firm.v1.html',
    title: 'How to Pass a Prop Firm Challenge, The Operational Playbook',
    category: 'Prop Firms', level: 'beginner', read_time: '47 min', icon: '🎯',
    cover_url: 'https://www.marketscoupons.com/img/blog-heros/how-to-pass-prop-firm.jpg',
    excerpt: '~7% of evaluation takers pass. ~30% of those earn a single payout. Less than 2% become consistent. This guide is for the 2%.',
    sort_order: 27 },
  { slug: 'trailing-drawdown-vs-eod', file: 'trailing-drawdown-vs-eod.v1.html',
    title: 'Trailing Drawdown vs EOD vs Static, The Hidden Variable That Decides Your Funded Account',
    category: 'Prop Firms', level: 'intermediate', read_time: '42 min', icon: '⚖️',
    cover_url: 'https://www.marketscoupons.com/img/blog-heros/trailing-drawdown-vs-eod.jpg',
    excerpt: 'Two traders, same skill, same strategy. One picks Apex (trailing intraday). The other picks Bulenox (trailing EOD). Six months later, only one is still funded.',
    sort_order: 28 },
  { slug: 'position-sizing-scaling', file: 'position-sizing-scaling.v1.html',
    title: 'Position Sizing & Scaling, How Pros Turn $5K into $500K Without Lottery Math',
    category: 'Risk Management', level: 'intermediate', read_time: '44 min', icon: '📐',
    cover_url: 'https://www.marketscoupons.com/img/blog-heros/position-sizing-scaling.jpg',
    excerpt: 'Most traders obsess over entries. Pros obsess over sizing. The same setup with wrong sizing fails. With proper sizing it compounds.',
    sort_order: 29 },
];

function extractBody(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return '';
  let body = bodyMatch[1];
  body = body.replace(/<div class="wrap">\s*/i, '');
  body = body.replace(/\s*<\/div>\s*$/i, '');
  body = body.replace(/<header[^>]*class="hero"[\s\S]*?<\/header>/i, '');
  body = body.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, '');
  body = body.replace(/<p class="subtitle"[\s\S]*?<\/p>/i, '');
  body = body.replace(/<p class="meta"[\s\S]*?<\/p>/i, '');
  return body.trim();
}

const posts = [];
for (const a of articles) {
  const fp = path.join(dir, a.file);
  if (!fs.existsSync(fp)) { console.error('MISS', fp); continue; }
  const html = fs.readFileSync(fp, 'utf8');
  const body = extractBody(html);
  posts.push({ ...a, body, lang: 'en', author: 'Markets Coupons Research' });
  console.error(`  ${a.slug.padEnd(34)} ${body.length} chars`);
}

console.error(`\nUploading ${posts.length} posts to blog-bulk-upsert...`);

const res = await fetch(`${SUPABASE_URL}/functions/v1/blog-bulk-upsert`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON}`,
    'apikey': SUPABASE_ANON,
  },
  body: JSON.stringify({ posts }),
});

const text = await res.text();
console.error(`HTTP ${res.status}`);
console.error(text.slice(0, 2000));
