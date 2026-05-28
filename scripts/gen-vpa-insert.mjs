import fs from 'node:fs';
const body = fs.readFileSync('data/preview/vpa-v7-en.body.html','utf8');
if (body.includes('$vpa$')) throw new Error('delimiter collision');
const title = 'Volume Price Analysis (VPA) — How to Read Institutional Intent in Every Bar';
const excerpt = 'The complete VPA guide built on Wyckoff, Tom Williams and Anna Coulling: effort vs result, no-supply and climax bars, the four-phase cycle, three high-probability setups, and prop-firm risk.';
const sql = `INSERT INTO blog_posts (title, slug, category, level, read_time, body, excerpt, icon, active, ai_generated, sort_order, lang, cover_url, author)
VALUES (
 $vpa$${title}$vpa$,
 'vpa-volume-price-analysis',
 'Technical Analysis',
 'intermediate',
 '32 min',
 $vpa$${body}$vpa$,
 $vpa$${excerpt}$vpa$,
 '\u{1F4CA}',
 true, true, 24, 'en',
 'https://www.marketscoupons.com/img/blog-heros/vpa-volume-price-analysis.webp',
 'Markets Coupons Research'
)
ON CONFLICT (slug, lang) DO UPDATE SET
 title=EXCLUDED.title, body=EXCLUDED.body, excerpt=EXCLUDED.excerpt,
 category=EXCLUDED.category, level=EXCLUDED.level, read_time=EXCLUDED.read_time,
 icon=EXCLUDED.icon, active=true, sort_order=EXCLUDED.sort_order,
 cover_url=EXCLUDED.cover_url, author=EXCLUDED.author
RETURNING slug, lang, length(body) as len;`;
fs.writeFileSync('data/preview/vpa_insert.sql', sql);
console.log('SQL written,', sql.length, 'bytes');
