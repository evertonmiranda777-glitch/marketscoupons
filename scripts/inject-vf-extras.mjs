import fs from 'node:fs';

const extras = {
  pt: { ind_vf_meta: '2.5 KB · Setup 90s', ind_vf_trust: 'Sem cadastro, sem cartão, sem spam.' },
  en: { ind_vf_meta: '2.5 KB · 90s setup',  ind_vf_trust: 'No signup, no card, no email-spam.' },
  es: { ind_vf_meta: '2.5 KB · Instala en 90s', ind_vf_trust: 'Sin registro, sin tarjeta, sin spam.' },
  it: { ind_vf_meta: '2.5 KB · Setup 90s',  ind_vf_trust: 'Senza registrazione, senza carta, senza spam.' },
  fr: { ind_vf_meta: '2.5 Ko · Installation 90s', ind_vf_trust: 'Sans inscription, sans carte, sans spam.' },
  de: { ind_vf_meta: '2.5 KB · 90s Setup',  ind_vf_trust: 'Keine Anmeldung, keine Karte, kein Spam.' },
  ar: { ind_vf_meta: '٢.٥ كيلوبايت · إعداد ٩٠ ثانية', ind_vf_trust: 'بدون تسجيل، بدون بطاقة، بدون رسائل مزعجة.' },
  id: { ind_vf_meta: '2.5 KB · Setup 90 detik', ind_vf_trust: 'Tanpa daftar, tanpa kartu, tanpa spam.' },
};

for (const [lang, kv] of Object.entries(extras)) {
  const path = `i18n-${lang}.js`;
  let s = fs.readFileSync(path, 'utf8');
  const m = s.match(/(\{[\s\S]*\})(\s*;?\s*)$/);
  if (!m) { console.warn(`SKIP ${path}`); continue; }
  const obj = m[1];
  let inserts = '';
  for (const [k, v] of Object.entries(kv)) inserts += `,${JSON.stringify(k)}:${JSON.stringify(v)}`;
  const newObj = obj.slice(0, -1) + inserts + '}';
  fs.writeFileSync(path, s.slice(0, m.index) + newObj + s.slice(m.index + obj.length), 'utf8');
  console.log(`${path}: +${Object.keys(kv).length}`);
}
