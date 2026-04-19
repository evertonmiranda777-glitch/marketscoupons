#!/usr/bin/env node
/**
 * Build static HTML pages from the prop-firm guides in docs/guias-piloto/.
 *
 * Input:  docs/guias-piloto/<slug>.md                    (EN)
 *         docs/guias-piloto/<lang>/<slug>.md             (pt, es, it, fr, de, ar)
 * Output: guides/<slug>.html                             (EN, served at /guides/<slug>)
 *         <lang>/guides/<slug>.html                      (served at /<lang>/guides/<slug>)
 *
 * Images referenced as ./img/ or ../img/ are rewritten to /docs/guias-piloto/img/.
 * The YAML frontmatter drives <title>, <meta description>, canonical, hreflang.
 * The trailing ```html <script type="application/ld+json"> … ``` block is pulled out
 * of the body and injected directly into <head> so search engines see the schema.
 */

const fs   = require('fs');
const path = require('path');
const { marked } = require('marked');
const matter     = require('gray-matter');

const ROOT        = path.resolve(__dirname, '..');
const SRC_DIR     = path.join(ROOT, 'docs', 'guias-piloto');
const LANGS       = ['pt','es','it','fr','de','ar'];          // EN lives at SRC_DIR root
const SITE        = 'https://www.marketscoupons.com';
const IMG_PREFIX  = '/docs/guias-piloto/img/';

// Map firm-file name → slug published in frontmatter. Tranlations and EN all
// use the same frontmatter slug, so we just read it from the file.
function normalizeLang(lang){
  if (!lang) return 'en';
  const l = String(lang).toLowerCase();
  if (l.startsWith('pt')) return 'pt';
  if (l.startsWith('en')) return 'en';
  if (l.startsWith('es')) return 'es';
  if (l.startsWith('fr')) return 'fr';
  if (l.startsWith('de')) return 'de';
  if (l.startsWith('it')) return 'it';
  if (l.startsWith('ar')) return 'ar';
  return l;
}

function readGuide(filePath){
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data: fm, content: body } = matter(raw);
  // Normalize lang tag (pt-BR → pt) and description fallback (meta_description)
  fm.lang = normalizeLang(fm.lang);
  if (!fm.description && fm.meta_description) fm.description = fm.meta_description;
  // Extract trailing ```html <script type="application/ld+json">…</script> ``` block
  let schema = '';
  const schemaMatch = body.match(/```html\s*([\s\S]*?<script type="application\/ld\+json">[\s\S]*?<\/script>)[\s\S]*?```/);
  let cleanBody = body;
  if (schemaMatch) {
    schema = schemaMatch[1].trim();
    cleanBody = body.slice(0, schemaMatch.index).replace(/\n?---\s*$/,'').trim();
  }
  return { fm, body: cleanBody, schema, filePath };
}

function rewriteImagePaths(html){
  return html
    .replace(/src="(?:\.\.\/)?img\//g,  `src="${IMG_PREFIX}`)
    .replace(/src="\.\/img\//g,          `src="${IMG_PREFIX}`);
}

function escapeHtml(s){
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Collect all guides grouped by slug so we can build hreflang alternates.
function collectGuides(){
  const bySlug = new Map();           // slug → { lang: fullPath }
  // EN files at root
  for (const f of fs.readdirSync(SRC_DIR)) {
    if (!f.endsWith('.md')) continue;
    const full = path.join(SRC_DIR, f);
    if (!fs.statSync(full).isFile()) continue;
    const { fm } = readGuide(full);
    const slug = fm.slug; if (!slug) continue;
    if (!bySlug.has(slug)) bySlug.set(slug, {});
    bySlug.get(slug)[fm.lang || 'en'] = full;
  }
  // Translation files
  for (const lang of LANGS) {
    const dir = path.join(SRC_DIR, lang);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.md')) continue;
      const full = path.join(dir, f);
      const { fm } = readGuide(full);
      const slug = fm.slug; if (!slug) continue;
      if (!bySlug.has(slug)) bySlug.set(slug, {});
      const l = normalizeLang(fm.lang) || lang;
      bySlug.get(slug)[l] = full;
    }
  }
  return bySlug;
}

function langPath(lang, slug){
  return lang === 'en' ? `/guides/${slug}` : `/${lang}/guides/${slug}`;
}

function buildHreflang(alts, currentLang){
  // alts: { en: path, de: path, … }
  const lines = [];
  for (const [lang, p] of Object.entries(alts)) {
    lines.push(`  <link rel="alternate" hreflang="${lang}" href="${SITE}${p}">`);
  }
  if (alts.en) lines.push(`  <link rel="alternate" hreflang="x-default" href="${SITE}${alts.en}">`);
  return lines.join('\n');
}

const LANG_NAMES = { en:'English', pt:'Português', es:'Español', it:'Italiano', fr:'Français', de:'Deutsch', ar:'العربية' };
const FIRM_SWITCH_LABELS = {
  'apex-review': 'Apex Trader Funding',
  'ftmo-review': 'FTMO',
  'bulenox-review': 'Bulenox',
  'take-profit-trader-review': 'Take Profit Trader',
  'fundednext-review': 'FundedNext',
  'earn2trade-review': 'Earn2Trade',
  'the5ers-review': 'The5ers',
  'fundingpips-review': 'FundingPips',
  'brightfunded-review': 'BrightFunded',
  'e8-review': 'E8 Markets',
  'cti-review': 'City Traders Imperium',
};

function template({ fm, bodyHtml, schema, lang, slug, alts, otherLangs }) {
  const title      = fm.title || slug;
  const desc       = fm.description || '';
  const canonical  = fm.canonical || `${SITE}${langPath(lang, slug)}`;
  const published  = fm.published || '';
  const updated    = fm.updated || published;
  const author     = fm.author || 'Markets Coupons Team';
  const dir        = lang === 'ar' ? 'rtl' : 'ltr';
  const homeHref   = lang === 'en' ? '/' : `/${lang}/`;

  const hreflang   = buildHreflang(alts, lang);

  // OTHER-FIRM SWITCHER — shows sibling firms in the same language
  const switchHtml = Object.entries(FIRM_SWITCH_LABELS)
    .filter(([s]) => s !== slug)
    .map(([s, lbl]) => `<a class="gswitch" href="${langPath(lang, s)}">${lbl}</a>`)
    .join('');

  // LANGUAGE SWITCHER — only langs that actually exist for this slug
  const langHtml = otherLangs
    .map(l => `<a class="lswitch" href="${langPath(l, slug)}" hreflang="${l}">${LANG_NAMES[l] || l}</a>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<link rel="canonical" href="${canonical}">
${hreflang}
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="Markets Coupons">
<meta property="og:locale" content="${lang === 'pt' ? 'pt_BR' : lang === 'en' ? 'en_US' : lang + '_' + lang.toUpperCase()}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(desc)}">
<meta name="author" content="${escapeHtml(author)}">
<meta name="theme-color" content="#07090D">
<link rel="icon" href="/favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
${schema ? schema + '\n' : ''}<style>
:root{
  --bg:#07090D; --sur:#0B0F16; --card:#10151F; --card2:#141B27;
  --gold:#F0B429; --gbg:rgba(240,180,41,0.09); --gbr:rgba(240,180,41,0.25);
  --green:#22C55E; --gnbg:rgba(34,197,94,0.12);
  --red:#EF4444; --rbg:rgba(239,68,68,0.12);
  --t1:#EDF2F7; --t2:#B8C5D6; --t3:#8A98AE;
  --gold-hover:#d9a224;
  --f:'Inter',system-ui,-apple-system,sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:var(--f);background:var(--bg);color:var(--t1);line-height:1.7;font-size:16px;min-height:100vh}

.topnav{position:sticky;top:0;z-index:10;background:rgba(7,9,13,0.85);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.08)}
.topnav-inner{max-width:1200px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.logo{display:inline-flex;align-items:center;gap:10px;text-decoration:none}
.logo-mark{width:28px;height:28px;background:linear-gradient(135deg,#F0B429,#d9a224);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;color:#000;font-weight:800;font-size:14px}
.logo-txt{color:var(--t1);font-weight:700;font-size:15px;letter-spacing:-0.2px}
.logo-txt b{color:var(--gold)}
.nav-back{color:var(--t2);text-decoration:none;font-size:13px;font-weight:600}
.nav-back:hover{color:var(--gold)}

.container{max-width:880px;margin:0 auto;padding:48px 32px 120px}
.badge{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:var(--gbg);border:1px solid var(--gbr);border-radius:999px;font-size:11px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:20px}
.breadcrumb{font-size:12px;color:var(--t3);margin-bottom:16px}
.breadcrumb a{color:var(--t2);text-decoration:none}
.breadcrumb a:hover{color:var(--gold)}

.gswitch-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}
.gswitch{padding:6px 14px;border:1px solid rgba(255,255,255,0.14);border-radius:999px;color:var(--t2);font-size:12px;font-weight:600;text-decoration:none;background:var(--card)}
.gswitch:hover{border-color:var(--gold);color:var(--gold)}

.lang-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:24px}
.lang-row .lbl{font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:0.5px;margin-right:4px;align-self:center}
.lswitch{padding:4px 10px;border:1px solid rgba(255,255,255,0.10);border-radius:8px;color:var(--t3);font-size:11px;font-weight:600;text-decoration:none;background:transparent}
.lswitch:hover{border-color:var(--gold);color:var(--gold)}

.reading-meta{display:flex;gap:14px;align-items:center;color:var(--t3);font-size:13px;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.08);flex-wrap:wrap}
.reading-meta .dot{width:3px;height:3px;background:var(--t3);border-radius:50%}

#content h1{font-size:40px;font-weight:800;line-height:1.2;color:var(--t1);margin:0 0 16px;letter-spacing:-0.5px}
#content h2{font-size:28px;font-weight:700;color:var(--t1);margin:56px 0 20px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.08);letter-spacing:-0.3px}
#content h2:first-of-type{border-top:none;padding-top:0}
#content h3{font-size:20px;font-weight:700;color:var(--gold);margin:32px 0 12px}
#content h4{font-size:16px;font-weight:700;color:var(--t1);margin:24px 0 8px}
#content p{margin:0 0 18px;color:var(--t2);font-size:16px;line-height:1.75}
#content p em:first-child{color:var(--t3);font-size:13px}
#content strong{color:var(--t1);font-weight:700}
#content a{color:var(--gold);text-decoration:none;border-bottom:1px solid rgba(240,180,41,0.35);transition:.2s}
#content a:hover{color:#f5d060;border-bottom-color:var(--gold)}
#content ul,#content ol{margin:0 0 20px 24px;padding:0}
#content li{margin:0 0 10px;color:var(--t2);line-height:1.7}
#content li::marker{color:var(--gold)}
#content blockquote{border-left:3px solid var(--gold);background:var(--gbg);padding:16px 20px;margin:24px 0;border-radius:8px;color:var(--t1)}
#content blockquote p{margin:0;color:var(--t1)}
#content blockquote strong:first-child{color:var(--gold)}
#content table{width:100%;border-collapse:collapse;margin:24px 0;background:var(--card);border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.1)}
#content th{background:var(--card2);color:var(--gold);font-weight:700;text-align:left;padding:14px 18px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid rgba(240,180,41,0.2)}
#content td{padding:12px 18px;color:var(--t2);border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px}
#content td:first-child{color:var(--t1);font-weight:600}
#content td strong{color:var(--gold)}
#content tr:last-child td{border-bottom:none}
#content code{background:rgba(240,180,41,0.12);color:var(--gold);padding:3px 8px;border-radius:5px;font-family:'SF Mono','Monaco',monospace;font-size:13px}
#content pre{background:var(--card);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;overflow-x:auto;margin:24px 0}
#content pre code{background:none;color:var(--t2);padding:0;font-size:13px;line-height:1.6;display:block;white-space:pre}
#content hr{border:none;border-top:1px solid rgba(255,255,255,0.1);margin:48px 0}
#content img{max-width:100%;height:auto;display:block;margin:32px auto;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:var(--card)}

footer.site-footer{border-top:1px solid rgba(255,255,255,0.08);padding:28px 24px;text-align:center;color:var(--t3);font-size:13px}
footer.site-footer a{color:var(--t2);text-decoration:none;margin:0 8px}
footer.site-footer a:hover{color:var(--gold)}

html[dir="rtl"] #content ul,html[dir="rtl"] #content ol{margin:0 24px 20px 0}
html[dir="rtl"] #content blockquote{border-left:none;border-right:3px solid var(--gold)}

@media(max-width:768px){
  .container{padding:32px 20px 80px}
  #content h1{font-size:30px}
  #content h2{font-size:22px;margin:40px 0 16px}
  #content h3{font-size:18px}
  #content table{font-size:12px;display:block;overflow-x:auto}
  #content th,#content td{padding:10px 12px}
  .topnav-inner{padding:12px 16px}
}
</style>
</head>
<body>
<nav class="topnav">
  <div class="topnav-inner">
    <a href="${homeHref}" class="logo" aria-label="Markets Coupons home">
      <span class="logo-mark">M</span>
      <span class="logo-txt">Markets<b>Coupons</b></span>
    </a>
    <a href="${homeHref}" class="nav-back">← Home</a>
  </div>
</nav>

<main class="container">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="${homeHref}">Home</a> / <a href="${homeHref}guides">Guides</a> / ${escapeHtml(FIRM_SWITCH_LABELS[slug] || slug)}
  </nav>

  <div class="gswitch-row">${switchHtml}</div>
  ${langHtml ? `<div class="lang-row"><span class="lbl">Language:</span>${langHtml}</div>` : ''}

  <span class="badge">★ Prop Firm Review</span>

  <div class="reading-meta">
    ${updated ? `<span>${updated}</span><span class="dot"></span>` : ''}
    <span>✍ ${escapeHtml(author)}</span>
  </div>

  <article id="content">
${bodyHtml}
  </article>
</main>

<footer class="site-footer">
  <p>© ${new Date().getFullYear()} Markets Coupons · <a href="${homeHref}">Home</a> · <a href="${homeHref}blog">Blog</a> · <a href="${homeHref}guides">Guides</a></p>
</footer>
</body>
</html>`;
}

function writeOut(outPath, html){
  const dir = path.dirname(outPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');
}

function renderBody(md){
  const html = marked.parse(md, { mangle: false, headerIds: true });
  return rewriteImagePaths(html);
}

function build(){
  marked.setOptions({ gfm: true, breaks: false });

  const bySlug = collectGuides();
  let count = 0;

  for (const [slug, langs] of bySlug.entries()) {
    const alts = {};
    for (const lang of Object.keys(langs)) {
      alts[lang] = langPath(lang, slug);
    }

    for (const [lang, filePath] of Object.entries(langs)) {
      const { fm, body, schema } = readGuide(filePath);
      const bodyHtml = renderBody(body);
      const otherLangs = Object.keys(langs).filter(l => l !== lang);
      const html = template({ fm, bodyHtml, schema, lang, slug, alts, otherLangs });

      const outRel = lang === 'en'
        ? path.join('guides', slug + '.html')
        : path.join(lang, 'guides', slug + '.html');
      const outPath = path.join(ROOT, outRel);
      writeOut(outPath, html);
      count++;
      console.log('wrote', outRel);
    }
  }
  console.log('done.', count, 'pages built across', bySlug.size, 'guides');
  return bySlug;
}

function writeSitemap(bySlug){
  const urls = [];
  const lastmod = new Date().toISOString().slice(0,10);
  for (const [slug, langs] of bySlug.entries()) {
    for (const lang of Object.keys(langs)) {
      const loc = `${SITE}${langPath(lang, slug)}`;
      const alternates = Object.keys(langs).map(l => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${langPath(l, slug)}"/>`).join('\n');
      const xdefault = langs.en ? `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${langPath('en', slug)}"/>` : '';
      urls.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
${alternates}${xdefault}
  </url>`);
    }
  }

  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  let existing = '';
  if (fs.existsSync(sitemapPath)) existing = fs.readFileSync(sitemapPath, 'utf8');

  // Strip any previously generated guides block, then inject fresh one before </urlset>
  const marker = '<!-- BEGIN:GUIDES -->';
  const endMarker = '<!-- END:GUIDES -->';
  let cleaned = existing.replace(new RegExp(`${marker}[\\s\\S]*?${endMarker}\\n?`), '');
  const injection = `${marker}\n${urls.join('\n')}\n  ${endMarker}\n`;

  let out;
  if (cleaned.includes('</urlset>')) {
    out = cleaned.replace('</urlset>', `  ${injection}</urlset>`);
  } else {
    out = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  ${injection}</urlset>
`;
  }
  fs.writeFileSync(sitemapPath, out, 'utf8');
  console.log('sitemap.xml updated with', urls.length, 'guide URLs');
}

const bySlug = build();
writeSitemap(bySlug);
