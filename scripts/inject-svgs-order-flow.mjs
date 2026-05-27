// Injects 20 SVG diagrams into order-flow-footprint.v1.html → v2.html
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('data/preview/blog-v2/order-flow-footprint.v1.html', 'utf8');

const dia = (n, name, caption) => `
<figure class="diagram">
  <img src="/img/blog-diagrams/order-flow/${String(n).padStart(2,'0')}-${name}.svg" alt="${caption}" loading="lazy">
  <figcaption>${caption}</figcaption>
</figure>`;

const cssAdd = `
figure.diagram{margin:32px 0;padding:0;background:#0F1422;border:1px solid rgba(240,180,41,.18);border-radius:14px;overflow:hidden}
figure.diagram img{display:block;width:100%;height:auto}
figure.diagram figcaption{padding:14px 22px;color:var(--t3);font-size:13px;font-style:italic;border-top:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02)}
`;

let out = src.replace('</style>', cssAdd + '\n</style>');

const inserts = [
  ['<h2 id="p1">Part 1 — The Auction at the Heart of Every Market</h2>',
   dia(14,'initiative-vs-responsive','Auction Market Theory — Initiative vs Responsive activity. Identify the type, you know the regime.')],

  ['<h2 id="p3">Part 3 — The Bid-Ask Spread — Where Reality Happens</h2>',
   dia(2,'aggressor-vs-passive','Every trade has two sides — but only the aggressor moves price. Buy aggressor lifts ask, sell aggressor hits bid.')],

  ['<h2 id="p4">Part 4 — Reading a Footprint Chart — Bar Anatomy</h2>',
   dia(1,'footprint-anatomy','Footprint bar anatomy — bid volume, ask volume, delta and POC per price level. 4× more information than a candle.')],

  ['<h2 id="p5">Part 5 — Delta, Cumulative Delta, and Why They Matter</h2>',
   dia(3,'delta-vs-cvd','Price vs Cumulative Volume Delta — bearish divergence (price higher, CVD lower) signals aggressive buyers exhausted.')],

  ['<h2 id="p6">Part 6 — Volume Profile vs Footprint vs Order Book</h2>',
   dia(7,'poc-vah-val','Volume Profile structure — POC (price magnet), VAH/VAL (value area edges) define tomorrow\'s reference levels.')],

  ['<h2 id="p7">Part 7 — The 6 Core Order Flow Signals</h2>',
   dia(8,'balance-vs-imbalance','Balance (D-shape) vs Imbalance (P-shape) profiles — the day type dictates whether to fade or follow.')],

  ['<h2 id="p8">Part 8 — Absorption — How Iceberg Orders Reveal Themselves</h2>',
   dia(5,'absorption','Absorption — massive sell delta hits a level, price refuses to drop. A passive buyer is absorbing every contract.')],

  ['<h3>Signal 5 — Single Print</h3>',
   dia(10,'single-prints','Single prints in TPO — price levels traded only once. Markets rarely leave them unresolved.')],

  ['<h2 id="p9">Part 9 — Exhaustion — When Aggressive Buyers Run Out</h2>',
   dia(16,'exhaustion-bar','Exhaustion bar — extreme positive delta + minimal price progress + next-bar delta flip = reversal high signature.')],

  ['<h2 id="p10">Part 10 — Stacked Imbalances and the 3-Print Rule</h2>',
   dia(4,'imbalance-stack','Stacked imbalances — 3+ consecutive 300%+ diagonal ratios = institutional flow committed → continuation entry.')],

  ['<h2 id="p11">Part 11 — Spoofing, Layering, and What\'s Real</h2>',
   dia(11,'spoofing','Spoofing — fake bid wall baits retail buyers → bait pulled → spoofer dumps into the chase. Illegal but common.')],

  ['<h3>Signal 6 — Pull</h3>',
   dia(6,'iceberg','Iceberg orders — massive order split into small visible chunks. 90% sits hidden below the water line.')],

  ['<h2 id="p12">Part 12 — Top 10 Footprint Setups with Backtested Priors</h2>',
   dia(17,'top-5-setups','Top 5 order flow setups by backtested win rate × avg R on NQ/ES futures 2023-2025')],

  ['<h2 id="p13">Part 13 — Case Studies</h2>',
   dia(12,'trapped-traders','Trapped traders — high CVD at breakout with no follow-through = breakout buyers caught. Sell into stops.')],

  ['<h3>Divergence — the most important order flow signal</h3>',
   dia(13,'cvd-divergence','CVD divergence in 2 flavors — bullish (price lower low, CVD higher low) and bearish (price higher high, CVD lower high).')],

  // Inject around Part 6 (Volume Profile vs Footprint)
  ['<h2 id="p6">Part 6 — Volume Profile vs Footprint vs Order Book</h2>',
   dia(15,'composite-profile','Composite Profile — merging multiple sessions reveals HVNs (price magnets) and LVNs (where price flies through).'), 'after'],

  ['<h3>Case 2 — NQ August 5, 2024 — Single Print Day</h3>',
   dia(9,'naked-poc','Naked POC — an untested POC from prior sessions acts as a price magnet. 71% of naked POCs retested within 5 sessions.')],
];

let injected = 0;
for (const item of inserts) {
  const [marker, svg, mode] = item;
  const idx = out.indexOf(marker);
  if (idx === -1) { console.warn('MISSING:', marker.slice(0,60)); continue; }
  const after = idx + marker.length;
  out = out.slice(0, after) + svg + out.slice(after);
  injected++;
}

// Add the remaining 3 SVGs at structural points
const remaining = [
  ['<h2 id="p11">Part 11 — Spoofing, Layering, and What\'s Real</h2>',
   dia(18,'platforms','Order flow platforms — Bookmap/Sierra/ATAS for institutional-grade · NinjaTrader/Quantower for prop firm evals.')],

  ['<h2>Conclusion</h2>',
   dia(19,'mistakes','7 mistakes that kill order flow traders — and the fix that addresses each one')],

  ['Internal links worth reading next',
   dia(20,'roadmap','Order flow mastery roadmap — 4 stages from foundations (weeks 1-4) to tape fluency (year 2+)')],
];

for (const [marker, svg] of remaining) {
  const idx = out.indexOf(marker);
  if (idx === -1) { console.warn('MISSING:', marker.slice(0,60)); continue; }
  const after = idx + marker.length;
  out = out.slice(0, after) + svg + out.slice(after);
  injected++;
}

writeFileSync('data/preview/blog-v2/order-flow-footprint.v2.html', out);
const figCount = (out.match(/figure class="diagram"/g) || []).length;
console.log(`Injected ${injected}/20 markers · ${figCount} <figure> tags in output · ${out.length} chars`);
