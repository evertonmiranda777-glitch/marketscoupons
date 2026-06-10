import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('data/preview/blog-v2/how-to-pass-prop-firm.v1.html', 'utf8');
const dia = (n, name, cap) => `\n<figure class="diagram"><img src="/img/blog-diagrams/pass-prop-firm/${String(n).padStart(2,'0')}-${name}.svg" alt="${cap}" loading="lazy"><figcaption>${cap}</figcaption></figure>`;
const cssAdd = `
figure.diagram{margin:32px 0;padding:0;background:#0F1422;border:1px solid rgba(240,180,41,.18);border-radius:14px;overflow:hidden}
figure.diagram img{display:block;width:100%;height:auto}
figure.diagram figcaption{padding:14px 22px;color:var(--t3);font-size:13px;font-style:italic;border-top:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02)}
`;
let out = src.replace('</style>', cssAdd + '\n</style>');
const inserts = [
  ['<h2 id="p1">Part 1, The Cold Math</h2>', dia(1,'funnel','The prop firm funnel, 100 sign up, 12 pass eval, 4 get funded, 1.2 reach first payout')],
  ['<h2 id="p2">Part 2, The 3 Evaluation Models</h2>', dia(3,'time-to-target','Time-to-target math, 8% target ÷ avg trade R · how many setups you actually need by expectancy')],
  ['<h2 id="p3">Part 3, Drawdown Mechanics</h2>', dia(2,'drawdown-types','Drawdown types, Trailing Intraday vs Trailing EOD vs Static · choose firm based on YOUR style')],
  ['<h2 id="p4">Part 4, Profit Targets</h2>', dia(9,'account-size','Account size vs cost vs payout, $50K is the sweet spot · best ROI for multi-account scaling')],
  ['<h2 id="p5">Part 5, The Daily Loss Limit</h2>', dia(10,'recovery','Recovery from mid-eval drawdown, cut size 50% · only A setups · slower but real path back')],
  ['<h2 id="p6">Part 6, Min Trading Days</h2>', dia(5,'best-times','Best trading hours by asset, 90% of A setups occur in 4 specific windows · skip the rest')],
  ['<h2 id="p7">Part 7, News Trading Restrictions</h2>', dia(6,'news-rules','News trading rules by firm, strict vs moderate vs lenient · know YOUR firm before each event')],
  ['<h2 id="p8">Part 8, Consistency Rules</h2>', dia(7,'consistency-rule','Consistency rule, best day ≤ 30% of total profit · the quiet eval killer that funds get blocked on')],
  ['<h2 id="p9">Part 9, Top 6 Strategies That Pass Evaluations</h2>', dia(4,'setup-quality','Setup quality matrix, A, B, C grades · during eval take only A · forces patience and discipline')],
  ['<h2 id="p10">Part 10, Pre-Evaluation Checklist</h2>', dia(17,'pre-trade-checklist','10-point pre-trade checklist · every box checked → execute · any unchecked → wait')],
  ['<h2 id="p11">Part 11, The First Week Playbook</h2>', dia(13,'daily-routine','7-step eval daily routine · reproducible workflow · grinds the 8% target without heroics')],
  ['<h2 id="p12">Part 12, The Middle Phase</h2>', dia(15,'trial-vs-reset','Trial vs Reset, restart cost math · reset cheaper if you fix what broke · new trial if strategy failed')],
  ['<h2 id="p13">Part 13, The Final Push</h2>', dia(18,'mistakes','7 eval killers, 90% of failures come from these · avoid them and you\'re in the top 12%')],
  ['<h2 id="p14">Part 14, After Funding</h2>', dia(14,'post-funded-shift','Post-funded behavior shift, 95% blow PA in 30 days · trade funded like eval · same rules forever') + dia(8,'multi-account','Multi-account strategy, 5 funded copy-traded = $5-15K/month realistic · the real income path') + dia(11,'firm-comparison','Firms by experience level, beginner Apex/Bulenox · intermediate FundingPips · advanced FTMO') + dia(12,'payout-flow','Post-funded payout cycle, eval → funded → trade → request → paid · 5 steps to first dollar') + dia(16,'tax-implications','Tax &amp; payout treatment, 1099-MISC self-employment income · plan for 30-40% bracket')],
  ['<h2 id="p15">Frequently Asked Questions</h2>', dia(19,'firm-shopping','Firm shopping checklist, 8 dimensions to compare BEFORE you pay · not just the sale price')],
  ['<h2>Conclusion</h2>', dia(20,'roadmap','24-month prop firm roadmap, SIM → 1st eval → 5 accounts → full-time professional')],
];
let injected = 0;
for (const [marker, svg] of inserts) {
  const idx = out.indexOf(marker);
  if (idx === -1) { console.warn('MISSING:', marker.slice(0,60)); continue; }
  out = out.slice(0, idx + marker.length) + svg + out.slice(idx + marker.length);
  injected++;
}
writeFileSync('data/preview/blog-v2/how-to-pass-prop-firm.v2.html', out);
console.log(`${injected}/20 · ${(out.match(/figure class="diagram"/g) || []).length} figs · ${out.length} chars`);
