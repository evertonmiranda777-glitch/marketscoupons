// Render templates/guide_cover_v2_editorial.html → img/guides/<slug>-cover-<lang>.png
// Run: node scripts/render-guide-covers.js [slug|all] [lang|all]
// Example: node scripts/render-guide-covers.js all all  (renders 77 covers)
//
// Uses Playwright. Firm data from Supabase. Logos from img/Firms Logos/. Backgrounds from img/guides/bg/.
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

const LOGO_FILE = {
  apex: 'apex-logo-wide-light.png',
  ftmo: 'FTMO logo - light.png',
  bulenox: 'Bulenox-Logo-1-01-800x207.png',
  tpt: 'TakeProfit white logo.svg',
  fn: 'FundedNext Monochromatic Logo White 2x.png',
  e2t: 'earn2trade white.svg',
  the5ers: 'logo-white-est.png',
  fundingpips: 'fundingpips-logo.svg',
  brightfunded: 'brightfunded logo.svg',
  e8: 'e8markets logo.svg',
  cti: 'City-Traders-Imperium-Logo-for-Dark-Backgrounds-1-2048x388.png',
};

// Per-firm display name on cover (short, cover-friendly)
const COVER_NAME = {
  apex: 'Apex', ftmo: 'FTMO', bulenox: 'Bulenox', tpt: 'TakeProfitTrader',
  fn: 'FundedNext', e2t: 'Earn2Trade', the5ers: 'The5ers', fundingpips: 'FundingPips',
  brightfunded: 'BrightFunded', e8: 'E8 Markets', cti: 'City Traders Imperium',
};

// i18n copy per language. title() wraps firm name in <em> for italic-gold accent.
const I18N = {
  en: {
    lang: 'en', dir: 'ltr',
    eyebrow: 'Prop Firm Review · 2026',
    title: (n) => `The <em>${n}</em> review,<br>honest and complete.`,
    sub: 'Rules, pricing, payouts and the fine print — everything you need before you commit.',
    footerMeta: 'Full Review · Pricing · Rules',
  },
  pt: {
    lang: 'pt', dir: 'ltr',
    eyebrow: 'Análise de Prop Firm · 2026',
    title: (n) => `A análise da <em>${n}</em>,<br>honesta e completa.`,
    sub: 'Regras, preços, pagamentos e os detalhes — tudo o que você precisa antes de se comprometer.',
    footerMeta: 'Análise completa · Preços · Regras',
  },
  es: {
    lang: 'es', dir: 'ltr',
    eyebrow: 'Reseña de Prop Firm · 2026',
    title: (n) => `La reseña de <em>${n}</em>,<br>honesta y completa.`,
    sub: 'Reglas, precios, pagos y los detalles — todo lo que necesitas antes de comprometerte.',
    footerMeta: 'Reseña completa · Precios · Reglas',
  },
  it: {
    lang: 'it', dir: 'ltr',
    eyebrow: 'Recensione Prop Firm · 2026',
    title: (n) => `La recensione di <em>${n}</em>,<br>onesta e completa.`,
    sub: 'Regole, prezzi, pagamenti e i dettagli — tutto ciò che ti serve prima di impegnarti.',
    footerMeta: 'Recensione completa · Prezzi · Regole',
  },
  fr: {
    lang: 'fr', dir: 'ltr',
    eyebrow: 'Revue Prop Firm · 2026',
    title: (n) => `L'analyse de <em>${n}</em>,<br>honnête et complète.`,
    sub: 'Règles, prix, paiements et les détails — tout ce qu\'il vous faut avant de vous engager.',
    footerMeta: 'Revue complète · Prix · Règles',
  },
  de: {
    lang: 'de', dir: 'ltr',
    eyebrow: 'Prop-Firm-Test · 2026',
    title: (n) => `Die <em>${n}</em>-Analyse,<br>ehrlich und vollständig.`,
    sub: 'Regeln, Preise, Auszahlungen und die Details — alles, was Sie vor der Entscheidung wissen müssen.',
    footerMeta: 'Vollständige Analyse · Preise · Regeln',
  },
  ar: {
    lang: 'ar', dir: 'rtl',
    eyebrow: 'مراجعة شركة دعم · 2026',
    title: (n) => `مراجعة <em>${n}</em>،<br>صادقة وشاملة.`,
    sub: 'القواعد، الأسعار، السحوبات والتفاصيل — كل ما تحتاج معرفته قبل الالتزام.',
    footerMeta: 'مراجعة كاملة · أسعار · قواعد',
  },
};

async function sb(table, query) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
  if (!res.ok) { console.warn(`[sb] ${table} ${res.status}`); return null; }
  return await res.json();
}

function toBase64(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = ext === 'svg' ? 'svg+xml' : ext;
    return `data:image/${mime};base64,${buf.toString('base64')}`;
  } catch {
    return '';
  }
}

function fillTemplate(tpl, data) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] ?? '');
}

async function renderOne(browser, tpl, slug, lang, firmColor, logo, bg) {
  const i18n = I18N[lang];
  const firmName = COVER_NAME[slug] || slug;
  const data = {
    lang: i18n.lang,
    dir: i18n.dir,
    accent: firmColor,
    bgImage: bg,
    logo,
    eyebrow: i18n.eyebrow,
    titleHtml: i18n.title(firmName),
    sub: i18n.sub,
    footerMeta: i18n.footerMeta,
  };
  const html = fillTemplate(tpl, data);

  const page = await browser.newPage({ viewport: { width: 1200, height: 675 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  const outDir = path.join(root, 'img', 'guides');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${slug}-cover-${lang}.jpg`);
  await page.screenshot({ path: outPath, type: 'jpeg', quality: 85, clip: { x: 0, y: 0, width: 1200, height: 675 } });
  await page.close();
  console.log(`[${slug}/${lang}] ✓`);
  return true;
}

async function prepFirm(slug) {
  const firm = await sb('cms_firms', `select=color&id=eq.${slug}`);
  const color = (firm && firm[0] && firm[0].color) || '#F97316';

  const logoFile = LOGO_FILE[slug];
  const logoPath = logoFile ? path.join(root, 'img', 'Firms Logos', logoFile) : null;
  const logo = logoPath && fs.existsSync(logoPath) ? toBase64(logoPath) : '';
  if (!logo) console.warn(`[${slug}] logo missing`);

  const bgPath = path.join(root, 'img', 'guides', 'bg', `bg-${slug}.png`);
  const bg = fs.existsSync(bgPath) ? toBase64(bgPath) : '';
  if (!bg) console.warn(`[${slug}] bg missing`);

  return { color, logo, bg };
}

async function main() {
  const targetSlug = process.argv[2] || 'apex';
  const targetLang = process.argv[3] || 'en';
  const slugs = targetSlug === 'all' ? Object.keys(LOGO_FILE) : [targetSlug];
  const langs = targetLang === 'all' ? Object.keys(I18N) : [targetLang];

  const tplPath = path.join(root, 'templates', 'guide_cover_v2_editorial.html');
  const tpl = fs.readFileSync(tplPath, 'utf8');

  const browser = await chromium.launch();
  for (const slug of slugs) {
    const { color, logo, bg } = await prepFirm(slug);
    for (const lang of langs) {
      try { await renderOne(browser, tpl, slug, lang, color, logo, bg); }
      catch (e) { console.error(`[${slug}/${lang}] ERR`, e.message); }
    }
  }
  await browser.close();
  console.log(`\nDone: ${slugs.length} firms × ${langs.length} langs = ${slugs.length * langs.length} covers`);
}

main().catch(e => { console.error(e); process.exit(1); });
