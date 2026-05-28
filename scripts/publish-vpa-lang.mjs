#!/usr/bin/env node
// Publish a translated VPA body for a given lang. Reads data/preview/vpa-v7-<lang>.body.html
// and a per-lang title/excerpt map. Usage: node scripts/publish-vpa-lang.mjs <lang>
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
function readKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  for (const f of ['.env.local', '.env.tmp.txt']) {
    if (!fs.existsSync(f)) continue;
    const m = fs.readFileSync(f, 'utf8').match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*"?([^"\s]+)"?/);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}
const KEY = readKey();
if (!KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const db = createClient(URL, KEY, { auth: { persistSession: false } });

const META = {
  pt: { title: 'Volume Price Analysis (VPA) — Como Ler a Intenção Institucional em Cada Barra', read_time: '32 min',
        excerpt: 'O guia completo de VPA com base em Wyckoff, Tom Williams e Anna Coulling: esforço vs. resultado, barras de no-supply e clímax, o ciclo de quatro fases, três setups de alta probabilidade e gestão de risco para prop firms.' },
  es: { title: 'Volume Price Analysis (VPA) — Cómo Leer la Intención Institucional en Cada Barra', read_time: '32 min',
        excerpt: 'La guía completa de VPA basada en Wyckoff, Tom Williams y Anna Coulling: esfuerzo vs. resultado, barras de no-supply y clímax, el ciclo de cuatro fases, tres setups de alta probabilidad y gestión de riesgo para prop firms.' },
  it: { title: 'Volume Price Analysis (VPA) — Come Leggere l’Intenzione Istituzionale in Ogni Barra', read_time: '32 min',
        excerpt: 'La guida completa al VPA basata su Wyckoff, Tom Williams e Anna Coulling: sforzo vs. risultato, barre di no-supply e climax, il ciclo a quattro fasi, tre setup ad alta probabilità e gestione del rischio per le prop firm.' },
  fr: { title: 'Volume Price Analysis (VPA) — Lire l’Intention Institutionnelle dans Chaque Barre', read_time: '32 min',
        excerpt: 'Le guide complet du VPA fondé sur Wyckoff, Tom Williams et Anna Coulling : effort vs. résultat, barres de no-supply et climax, le cycle en quatre phases, trois setups à forte probabilité et gestion du risque pour les prop firms.' },
  de: { title: 'Volume Price Analysis (VPA) — Die institutionelle Absicht in jeder Kerze lesen', read_time: '32 min',
        excerpt: 'Der komplette VPA-Leitfaden auf Basis von Wyckoff, Tom Williams und Anna Coulling: Aufwand vs. Ergebnis, No-Supply- und Klimax-Kerzen, der Vier-Phasen-Zyklus, drei Setups mit hoher Trefferquote und Risikomanagement für Prop Firms.' },
  ar: { title: 'تحليل السعر والحجم (VPA) — كيف تقرأ النية المؤسسية في كل شمعة', read_time: '32 min',
        excerpt: 'الدليل الكامل لـ VPA المبني على ويكوف وتوم ويليامز وآنا كولينغ: الجهد مقابل النتيجة، شمعات الذروة، دورة المراحل الأربع، وإدارة المخاطر لشركات التمويل.' },
};

const lang = process.argv[2];
if (!META[lang]) { console.error('Unknown lang:', lang); process.exit(1); }
const file = `data/preview/vpa-v7-${lang}.body.html`;
if (!fs.existsSync(file)) { console.error('Missing body file:', file); process.exit(1); }
const body = fs.readFileSync(file, 'utf8');

const row = {
  title: META[lang].title,
  slug: 'vpa-volume-price-analysis',
  category: 'Technical Analysis',
  level: 'intermediate',
  read_time: META[lang].read_time,
  body,
  excerpt: META[lang].excerpt,
  icon: '\u{1F4CA}',
  active: true, ai_generated: true, sort_order: 24, lang,
  cover_url: 'https://www.marketscoupons.com/img/blog-heros/vpa-volume-price-analysis.webp',
  author: 'Markets Coupons Research',
};

const { data, error } = await db.from('blog_posts').upsert(row, { onConflict: 'slug,lang' }).select('slug,lang').maybeSingle();
if (error) { console.error('UPSERT failed:', error.message); process.exit(1); }
console.log('Published:', data, '| body chars:', body.length);
