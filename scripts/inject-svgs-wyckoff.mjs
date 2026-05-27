// Injects 20 SVG diagrams into wyckoff-method-2026.v1.html → v2.html
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('data/preview/blog-v2/wyckoff-method-2026.v1.html', 'utf8');

const dia = (n, name, caption) => `
<figure class="diagram">
  <img src="/img/blog-diagrams/wyckoff/${String(n).padStart(2,'0')}-${name}.svg" alt="${caption}" loading="lazy">
  <figcaption>${caption}</figcaption>
</figure>`;

// CSS additions for figures
const cssAdd = `
figure.diagram{margin:32px 0;padding:0;background:#0F1422;border:1px solid rgba(240,180,41,.18);border-radius:14px;overflow:hidden}
figure.diagram img{display:block;width:100%;height:auto}
figure.diagram figcaption{padding:14px 22px;color:var(--t3);font-size:13px;font-style:italic;border-top:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02)}
`;

let out = src.replace('</style>', cssAdd + '\n</style>');

// Map of injection points: section heading anchor → SVG content to insert AFTER the </h2> or </h3>
const inserts = [
  // After Part 1 heading
  ['<h2 id="p1">Part 1 — Why Wyckoff Still Works in 2026</h2>',
   dia(1,'wyckoff-tape-1920s','From ticker tape rooms (1920s) to colocation racks (2026) — same human emotions, faster execution')],

  ['<h2 id="p3">Part 3 — The Three Laws</h2>',
   dia(2,'three-laws-cards','The three laws Wyckoff distilled from 30 years of tape reading — still operative in 2026 algorithmic markets')],

  ['<h3>Law 1 — Supply and Demand</h3>',
   dia(9,'volume-signature','Volume signature across the 4 most diagnostic Wyckoff bars — what to look for at each event')],

  ['<h3>Law 2 — Effort vs Result</h3>',
   dia(10,'effort-vs-result','Harmony (volume rises with price) vs Divergence (volume explodes while price flatlines = distribution underway)')],

  ['<h3>Law 3 — Cause and Effect</h3>',
   dia(11,'cause-effect-pnf','Point-and-Figure count: the wider the trading range (cause), the longer the subsequent trend (effect)')],

  ['<h2 id="p4">Part 4 — The Composite Operator Hypothesis</h2>',
   dia(3,'composite-operator','The Composite Operator metaphor — every institutional player as a single coordinated actor against retail')],

  ['<h2 id="p5">Part 5 — The 4 Phases of the Market Cycle</h2>',
   dia(4,'four-phases-cycle','The 4-phase cycle — Accumulation → Markup → Distribution → Markdown. Every asset, every era, same rotation.')],

  ['<h2 id="p6">Part 6 — The Accumulation Schematic — 9 Canonical Events</h2>',
   dia(5,'accumulation-schematic','The Accumulation Schematic with all 9 canonical events labeled: PS, SC, AR, ST, Spring, Test, SOS, LPS, JOC')],

  ['<h3>Event 5 — Spring</h3>',
   dia(7,'spring-vs-shakeout','Spring vs Shakeout — same look, opposite volume. The single diagnostic bar that separates a 71% setup from disaster.')],

  ['<h2 id="p7">Part 7 — The Distribution Schematic</h2>',
   dia(6,'distribution-schematic','The Distribution Schematic — the mirror of Accumulation with UTAD as Spring\'s evil twin')],

  ['<h3>Event 5 — UTAD (Upthrust After Distribution)</h3>',
   dia(13,'utad-entry-stops','UTAD setup anatomy — short on Test bar close, stop above UTAD high, target prior range low')],

  ['<h2 id="p8">Part 8 — Real-Time Phase Identification</h2>',
   dia(16,'multi-timeframe','Multi-timeframe Wyckoff stack — weekly sets context, daily defines range, 1H/15min triggers entry')],

  ['<h2 id="p10">Part 10 — Modern Adaptations</h2>',
   dia(18,'vsa-bars','Volume Spread Analysis — the 4 most diagnostic bar signatures: No Supply, No Demand, Stopping Volume, Climactic Action')],

  ['<h2 id="p11">Part 11 — Top 7 Wyckoff Setups</h2>',
   dia(8,'top-7-setups','Top 7 Wyckoff setups ranked by backtested win rate × average R across SPX, ES, NQ and major equities 2015-2024')],

  ['<h2 id="p12">Part 12 — Case Studies</h2>',
   dia(17,'case-study-spx-2009','SPX March 2009 — the textbook Wyckoff Accumulation Spring that launched a 12-year bull market')],

  ['<h2 id="p13">Part 13 — The 5 Most Common Wyckoff Mistakes</h2>',
   dia(15,'7-mistakes','The 7 most common Wyckoff mistakes and the rule that fixes each one')],

  ['<h2 id="p14">Part 14 — Building a Wyckoff Trading System</h2>',
   dia(12,'spring-entry-stops','Spring setup anatomy — entry on Test bar close, stop below Spring low, target prior range high (1:3+ R)')],

  ['<h3>Step 7 — Trade log</h3>',
   dia(19,'checklist','The 10-point pre-trade checklist — every box checked = execute; any box unchecked = wait')],

  ['<h2>Conclusion</h2>',
   dia(20,'final-cycle-mastery','The 4 stages of Wyckoff mastery — Recognition → Execution → Context → Tape Reading')],

  // Apex/Prop firm CTA — find the CTA box
  ['<div class="cta-box">',
   dia(14,'prop-firm-application','Why Wyckoff fits prop firm evaluations — tight stops, low trade frequency, structural targets that satisfy 8% profit goals') + '\n<div class="cta-box">'],
];

let injected = 0;
for (const [marker, svg] of inserts) {
  const idx = out.indexOf(marker);
  if (idx === -1) { console.warn('MISSING marker:', marker.slice(0,60)); continue; }
  const after = idx + marker.length;
  out = out.slice(0, after) + svg + out.slice(after);
  injected++;
}

writeFileSync('data/preview/blog-v2/wyckoff-method-2026.v2.html', out);
console.log(`Injected ${injected}/20 SVGs · ${out.length} chars`);
