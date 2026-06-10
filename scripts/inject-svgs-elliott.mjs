import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('data/preview/blog-v2/elliott-wave-practical.v1.html', 'utf8');
const dia = (n, name, cap) => `\n<figure class="diagram"><img src="/img/blog-diagrams/elliott/${String(n).padStart(2,'0')}-${name}.svg" alt="${cap}" loading="lazy"><figcaption>${cap}</figcaption></figure>`;
const cssAdd = `
figure.diagram{margin:32px 0;padding:0;background:#0F1422;border:1px solid rgba(240,180,41,.18);border-radius:14px;overflow:hidden}
figure.diagram img{display:block;width:100%;height:auto}
figure.diagram figcaption{padding:14px 22px;color:var(--t3);font-size:13px;font-style:italic;border-top:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02)}
`;
let out = src.replace('</style>', cssAdd + '\n</style>');

const inserts = [
  ['<h2 id="p1">Part 1, Why Elliott Still Matters in 2026</h2>', dia(1,'5-3-structure','The 5-3 wave structure, every complete Elliott cycle is 5 impulse waves + 3 corrective waves')],
  ['<h2 id="p2">Part 2, R.N. Elliott, the Accountant Who Found the Pattern</h2>', dia(2,'degree-hierarchy','9 nested wave degrees, from Grand Supercycle (100+ years) to Sub-minuette (minutes)')],
  ['<h2 id="p3">Part 3, The 5-3 Wave Structure</h2>', dia(5,'wave-3-anatomy','Wave 3 anatomy, the longest, strongest, most tradeable wave · 70% of profitable Elliott trades')],
  ['<h2 id="p4">Part 4, The 9 Inviolable Rules</h2>', dia(3,'three-rules','The 3 inviolable rules of Elliott Wave, break any of these and your wave count is wrong')],
  ['<h2 id="p5">Part 5, Wave Personality</h2>', dia(12,'alternation','Rule of alternation, if Wave 2 is a sharp zigzag, Wave 4 is a sideways flat (and vice versa)')],
  ['<h2 id="p6">Part 6, Fibonacci Ratios</h2>', dia(4,'fibonacci-ratios','Fibonacci ratios per wave, statistical targets with 70%+ accuracy on liquid markets')],
  ['<h3>Zigzag (5-3-5)</h3>', dia(6,'zigzag','Zigzag correction (5-3-5), sharp, fast · most common in Wave 2 positions')],
  ['<h3>Flat (3-3-5)</h3>', dia(7,'flat','Flat correction (3-3-5), sideways · most common in Wave 4 positions')],
  ['<h3>Triangle (3-3-3-3-3)</h3>', dia(8,'triangle','Triangle correction (3-3-3-3-3), ALWAYS Wave 4 · breakout in trend direction')],
  ['<h2 id="p8">Part 8, Fractal Nesting</h2>', dia(11,'diagonal','Diagonal triangles, the exception where W4 overlaps W1 · leading and ending varieties')],
  ['<h2 id="p9">Part 9, Real-Time Wave Labeling</h2>', dia(9,'channeling','Channeling, projecting Wave 5 target from Wave 2-4 baseline parallel to Wave 3 high')],
  ['<h3>When to abandon a count</h3>', dia(10,'extension-truncation','Extensions vs truncations, Wave 3 extends to 2.618× in strong trends · Wave 5 truncates in weak ones')],
  ['<h2 id="p10">Part 10, Top 8 Elliott Setups</h2>', dia(17,'top-setups','Top 5 Elliott setups ranked by backtested win rate × avg R across SPX/ES/EURUSD/BTC 2018-2025')],
  ['<h2 id="p11">Part 11, Common Elliott Mistakes</h2>', dia(18,'mistakes','7 mistakes that make Elliott look useless, and the rule that fixes each one')],
  ['<h2 id="p12">Part 12, The Confluence Stack</h2>', dia(16,'rsi-divergence','Elliott + RSI divergence, Wave 5 with lower RSI peak = bearish divergence = reversal incoming')],
  ['<h3>Case 1, SPX 2008-2009, Wave A-B-C of larger correction</h3>', dia(14,'spx-2009','SPX 2009-2022 wave count, textbook 5-wave impulse at Primary degree · 666 → 4,818 in 13 years')],
  ['<h3>Case 3, Bitcoin 2017-2022, Grand Supercycle completion</h3>', dia(15,'btc-cycle','Bitcoin 2018-2025 wave count, Cycle-degree impulse · $3.2K → $108K · cleanest crypto Elliott on record')],
  ['<h2 id="p14">Part 14, Building an Elliott Trading System</h2>', dia(13,'entry-rules','The 4 Elliott entry zones, W2 long, W4 long, W5 short, end-of-C long with stop and target rules')],
  ['<h2 id="p7">Part 7, The Three Corrective Patterns</h2>', dia(19,'prop-firm-fit','Elliott on prop firm accounts, Wave 3 setups fit drawdown rules · 8-week eval plan included')],
  ['<h2>Conclusion</h2>', dia(20,'mastery-roadmap','Elliott mastery roadmap, 4 stages from pattern recognition to probabilistic thinking')],
];

let injected = 0;
for (const [marker, svg] of inserts) {
  const idx = out.indexOf(marker);
  if (idx === -1) { console.warn('MISSING:', marker.slice(0,60)); continue; }
  out = out.slice(0, idx + marker.length) + svg + out.slice(idx + marker.length);
  injected++;
}

writeFileSync('data/preview/blog-v2/elliott-wave-practical.v2.html', out);
console.log(`${injected}/20 injected · ${(out.match(/figure class="diagram"/g) || []).length} figs · ${out.length} chars`);
