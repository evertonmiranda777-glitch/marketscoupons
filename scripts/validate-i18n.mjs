import fs from 'node:fs';
for (const L of ['pt','en','es','it','fr','de','ar','id']) {
  try {
    const s = fs.readFileSync(`i18n-${L}.js`,'utf8');
    const m = s.match(/\{[\s\S]*\}/);
    const o = JSON.parse(m[0]);
    console.log(`${L}: ${Object.keys(o).length} keys · ind_vf_cta=${o.ind_vf_cta || 'MISSING'}`);
  } catch (e) {
    console.error(`${L}: FAIL ${e.message.slice(0,200)}`);
  }
}
