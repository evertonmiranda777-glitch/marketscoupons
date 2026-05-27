import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('data/preview/blog-v2/position-sizing-scaling.v1.html', 'utf8');
const dia = (n, name, cap) => `\n<figure class="diagram"><img src="/img/blog-diagrams/position-sizing/${String(n).padStart(2,'0')}-${name}.svg" alt="${cap}" loading="lazy"><figcaption>${cap}</figcaption></figure>`;
const cssAdd = `
figure.diagram{margin:32px 0;padding:0;background:#0F1422;border:1px solid rgba(240,180,41,.18);border-radius:14px;overflow:hidden}
figure.diagram img{display:block;width:100%;height:auto}
figure.diagram figcaption{padding:14px 22px;color:var(--t3);font-size:13px;font-style:italic;border-top:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02)}
`;
let out = src.replace('</style>', cssAdd + '\n</style>');
const inserts = [
  ['<h2 id="p1">Part 1 — Sizing Is the Most Important Trading Skill</h2>', dia(1,'formula','Position sizing formula — Size = (Account × R%) ÷ (Stop × $/unit) · stop first, sizing flows')],
  ['<h2 id="p2">Part 2 — The 4 Sizing Methodologies</h2>', dia(11,'pro-vs-retail','Pro vs Retail sizing mindset — pros size around survival, retail sizes around fantasies')],
  ['<h2 id="p3">Part 3 — Fixed Fractional</h2>', dia(2,'fixed-pct-vs-dollar','Fixed % vs Fixed $ — why % wins · auto-scales sizing with equity through wins and drawdowns')],
  ['<h2 id="p4">Part 4 — Volatility-Based Sizing</h2>', dia(3,'volatility-adjusted','Volatility-adjusted sizing (ATR method) — same $ risk through low/normal/high/crisis volatility regimes')],
  ['<h2 id="p5">Part 5 — Kelly Criterion</h2>', dia(15,'monte-carlo','Sizing × win rate Monte Carlo — drawdown distribution at each risk % · sweet spot is 0.5-1%')],
  ['<h2 id="p6">Part 6 — The Scaling Pyramid</h2>', dia(6,'pyramid','Pyramid sizing — add to winners 50%/25% · creates inverted pyramid that survives reversals')],
  ['<h2 id="p7">Part 7 — The Distribution Pyramid</h2>', dia(4,'scaling-up','Scaling up after wins · tier-based protocol · ride streaks · drop to baseline on first loss')],
  ['<h2 id="p8">Part 8 — Account Stage</h2>', dia(10,'scaling-up-table','Account growth path — $5K to $1M+ · sizing tiers · realistic income at each level')],
  ['<h2 id="p9">Part 9 — Correlation Adjustment</h2>', dia(8,'multi-account-aggregate','Multi-account aggregate sizing — 5 accounts × 1 contract = 1 trade size 5× (not diversification)')],
  ['<h2 id="p10">Part 10 — Prop Firm Sizing</h2>', dia(14,'prop-firm-sizing','Sizing calibration by prop firm — 1R = drawdown ÷ 10 · gives 10-loss safety margin universally')],
  ['<h2 id="p11">Part 11 — Operational Calculator</h2>', dia(7,'instrument-sizing','Position size by instrument — $50K account · same 1% risk · different contract counts per instrument')],
  ['<h2 id="p12">Part 12 — Top 8 Sizing Mistakes</h2>', dia(12,'mistakes','7 position sizing mistakes that kill accounts — most are unforced and easily avoided')],
  ['<h2 id="p13">Part 13 — Case Studies</h2>', dia(18,'worked-example','Full worked example — $10K starting · 50 trades · realistic compound trajectory with DDs')],
  ['<h2 id="p14">Part 14 — Building a Sizing System</h2>', dia(19,'checklist','Position sizing checklist · 10 boxes · automate via calculator · zero clicks before all 10 checked')],
  ['<h2 id="p15">Frequently Asked Questions</h2>', dia(9,'leverage-risk','Leverage vs Position Size — different animals · leverage is nominal, sizing is risk')],
  ['<h2>Conclusion</h2>', dia(20,'roadmap','Position sizing mastery roadmap — 4 stages from mechanics to portfolio thinking')],
  ['<h3>4. Kelly fractional</h3>', dia(5,'scaling-down','Scaling down after losses · tier-based defensive sizing · stop after 4 losses · review on weekend')],
  ['<h3>The 3-stage exit</h3>', dia(13,'sizing-by-stop','Position size by stop distance · tighter stops = more contracts · same $ risk always')],
  ['<h3>Correlation matrix (approximate)</h3>', dia(16,'account-replication','Account replication — master triggers, replicas mirror PROPORTIONALLY to their size')],
  ['<h3>Recommended sizing</h3>', dia(17,'cash-vs-margin','Cash vs Margin — margin lets you size 4× larger but sizing logic IGNORES margin · uses equity')],
];
let injected = 0;
for (const [marker, svg] of inserts) {
  const idx = out.indexOf(marker);
  if (idx === -1) { console.warn('MISSING:', marker.slice(0,60)); continue; }
  out = out.slice(0, idx + marker.length) + svg + out.slice(idx + marker.length);
  injected++;
}
writeFileSync('data/preview/blog-v2/position-sizing-scaling.v2.html', out);
console.log(`${injected}/20 · ${(out.match(/figure class="diagram"/g) || []).length} figs · ${out.length} chars`);
