import fs from 'node:fs';
import path from 'node:path';

const DATA = {
  apex: ['25K','50K','100K','150K'],
  brightfunded: ['5K','10K','25K','50K','100K','200K'],
  bulenox: ['25K','50K','100K','150K','250K'],
  cti: ['1-Step 2.5K','1-Step 5K','1-Step 10K','1-Step 25K','1-Step 50K','1-Step 100K','2-Step 2.5K','2-Step 5K','2-Step 10K','2-Step 25K','2-Step 50K','2-Step 100K','3-Step 2.5K','3-Step 5K','3-Step 10K','3-Step 25K','3-Step 50K','3-Step 100K','Instant 2.5K','Instant 5K','Instant 10K','Instant 20K','Instant 40K','Instant 80K','Pro 5K','Pro 10K','Pro 20K','Pro 40K','Pro 80K'],
  e2t: ['TCP25 (25K)','TCP50 (50K)','TCP100 (100K)','GAU50 (50K)','GAU100 (100K)','GAU150 (150K)','GAU200 (200K)'],
  e8: ['$25K Signature','$50K Signature','$100K Signature','$150K Signature','$5K E8 One','$10K E8 One','$25K E8 One','$50K E8 One','$100K E8 One','$200K E8 One','$400K E8 One','$500K E8 One'],
  fn: ['Stellar 2-Step 25K','Stellar 2-Step 50K','Stellar 2-Step 100K','Stellar 1-Step 25K','Stellar 1-Step 50K','Stellar 1-Step 100K','Stellar Instant 5K','Stellar Instant 10K','Stellar Instant 20K','Bolt 50K (Futures)','Rapid 25K (Futures)','Rapid 50K (Futures)','Rapid 100K (Futures)','Legacy 25K (Futures)','Legacy 50K (Futures)','Legacy 100K (Futures)'],
  ftmo: ['1-Step 10K','1-Step 25K','1-Step 50K','1-Step 100K','1-Step 200K','2-Step 10K','2-Step 25K','2-Step 50K','2-Step 100K','2-Step 200K'],
  fundingpips: ['Zero 5K','Zero 10K','Zero 25K','Zero 50K','Zero 100K','Zero 200K','1-Step 5K','1-Step 10K','1-Step 25K','1-Step 50K','1-Step 100K','2-Step 5K','2-Step 10K','2-Step 25K','2-Step 50K','2-Step 100K','Pro 5K','Pro 10K','Pro 25K','Pro 50K','Pro 100K','Pro 200K'],
  the5ers: ['Hyper 5K','Hyper 10K','Hyper 20K','Pro 5K','Pro 10K','Pro 20K','High Stakes 2.5K','High Stakes 5K','High Stakes 10K','High Stakes 25K','High Stakes 50K','High Stakes 100K','Bootcamp 20K','Bootcamp 100K','Bootcamp 250K','Futures 25K','Futures 50K','Rebate 25K','Rebate 50K'],
  tpt: ['25K','50K','75K','100K','150K'],
  tradeday: ['50K Intraday','100K Intraday','150K Intraday','50K EOD','100K EOD','150K EOD','50K Static','100K Static','150K Static']
};

const dir = 'firms';
let total = 0;
for (const [firm, sizes] of Object.entries(DATA)) {
  const fp = path.join(dir, firm + '.html');
  if (!fs.existsSync(fp)) { console.log('skip', firm, 'no file'); continue; }
  let html = fs.readFileSync(fp, 'utf8');
  let i = 0;
  const replaced = html.replace(/<div class="plan-size">—<\/div>/g, () => {
    const sz = sizes[i++] || '—';
    return `<div class="plan-size">${sz}</div>`;
  });
  fs.writeFileSync(fp, replaced);
  total += i;
  console.log(firm + ': ' + i + ' substituições');
}
console.log('TOTAL:', total);
