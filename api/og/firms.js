// Vercel Edge Function — Telegram creative for Firms
// GET /api/og/firms  → 1080x1350 PNG
// Pulls live data from Supabase cms_firms table.

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';
const SITE = 'https://www.marketscoupons.com';

const BG = '#080e18';
const GOLD = '#f5c518';
const GREEN = '#00dc82';
const T1 = '#ffffff';
const CARD_BG = 'rgba(255,255,255,0.035)';
const CARD_BR = 'rgba(255,255,255,0.09)';

const el = (type, style, children) => ({ type, props: { style: { display: 'flex', ...style }, children } });
const div = (style, children) => el('div', style, children);
const span = (style, text) => ({ type: 'span', props: { style: { display: 'flex', ...style }, children: text } });
const row = (style, children) => div({ flexDirection: 'row', ...style }, children);
const col = (style, children) => div({ flexDirection: 'column', ...style }, children);
const img = (src, width, height, style = {}) => ({ type: 'img', props: { src, width, height, style: { display: 'flex', ...style } } });

const HEX_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 50 50" fill="none"><defs><linearGradient id="lg" x1="0" y1="0" x2="50" y2="50"><stop offset="0%" stop-color="#FCD34D"/><stop offset="100%" stop-color="#D97706"/></linearGradient></defs><path d="M25 3L45 14.5V35.5L25 47 5 35.5V14.5Z" stroke="url(#lg)" stroke-width="2.2" fill="none"/><path d="M14 33V20l11 8" stroke="url(#lg)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M36 33V20l-11 8" stroke="url(#lg)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="25" cy="14" r="2" fill="url(#lg)"/></svg>`;
const HEX_URL = `data:image/svg+xml;utf8,${encodeURIComponent(HEX_SVG)}`;

async function fetchFirms() {
  const url = `${SUPABASE_URL}/rest/v1/cms_firms?active=eq.true&discount=gt.0&order=discount.desc&limit=8&select=id,name,short_name,discount,split,rating,reviews,coupon,icon_url,type,badge`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
  });
  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status}`);
  return res.json();
}

function absoluteLogo(icon_url) {
  if (!icon_url) return null;
  if (icon_url.startsWith('http')) return icon_url;
  return `${SITE}/${icon_url.replace(/^\//, '')}`;
}

function fmtReviews(n) {
  const x = Number(n || 0);
  return x >= 1000 ? (x / 1000).toFixed(1) + 'K' : String(x);
}

// SVG stars (★ glyph isn't in @vercel/og default font — render as inline SVG)
function starSvg(filled) {
  const c = filled ? '#f5c518' : 'rgba(245,197,24,.28)';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="${c}"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;
  return img(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`, 13, 13, { marginRight: '2px' });
}
function stars(rating) {
  const full = Math.round(Number(rating) || 0);
  const out = [];
  for (let i = 0; i < 5; i++) out.push(starSvg(i < full));
  return row({ justifyContent: 'center', marginTop: '4px' }, out);
}

const TYPE_EN = { 'Futuros': 'Futures', 'Forex/Futuros': 'Forex / Futures', 'Forex': 'Forex' };
const BADGE_EN = {
  'Maior Desconto': 'Best Discount',
  'Melhor Split 90%': '90% Profit Split',
  'Melhor Split': 'Best Split',
  'Scaling $400K': 'Scaling $400K',
  'Mais Avaliações': 'Most Reviewed',
  'Mais Avaliacoes': 'Most Reviewed',
  'Maior Avaliação': 'Top Rated',
  'Lifetime': 'Lifetime',
};

function firmRow(f, isTop, blurred) {
  const logo = absoluteLogo(f.icon_url);
  const name = String(f.name || f.short_name || f.id || '').slice(0, 22);
  const typeRaw = f.type || 'Futures';
  const type = TYPE_EN[typeRaw] || typeRaw;
  const typeColor = type.toLowerCase().includes('forex') ? '#00c88a' : '#8899ff';
  const typeBg = type.toLowerCase().includes('forex') ? 'rgba(0,180,120,.14)' : 'rgba(100,120,255,.16)';
  const typeBr = type.toLowerCase().includes('forex') ? 'rgba(0,180,120,.3)' : 'rgba(100,120,255,.32)';
  const rawBadge = f.badge && f.badge.label ? f.badge.label : '';
  const badgeLabel = BADGE_EN[rawBadge] || rawBadge;
  const rating = f.rating != null ? String(f.rating) : '—';
  const rev = fmtReviews(f.reviews);
  const couponStr = f.coupon || '—';
  const couponFs = couponStr.length > 10 ? '15px' : couponStr.length > 8 ? '18px' : '22px';

  const tags = [
    span({ fontSize: '14px', fontWeight: 600, padding: '5px 12px', borderRadius: '6px', backgroundColor: typeBg, color: typeColor, border: `1px solid ${typeBr}`, marginRight: '6px' }, type),
  ];
  if (badgeLabel) {
    tags.push(span({ fontSize: '14px', fontWeight: 600, padding: '5px 12px', borderRadius: '6px', backgroundColor: 'rgba(245,197,24,.14)', color: GOLD, border: '1px solid rgba(245,197,24,.34)' }, badgeLabel));
  }

  return row(
    {
      padding: '13px 16px',
      backgroundColor: isTop ? 'rgba(245,197,24,.06)' : CARD_BG,
      border: `1px solid ${isTop ? 'rgba(245,197,24,.36)' : CARD_BR}`,
      borderRadius: '13px',
      marginBottom: '8px',
      alignItems: 'center',
      opacity: blurred ? 0.3 : 1,
      filter: blurred ? 'blur(4px)' : 'none',
    },
    [
      // logo
      div({ width: '62px', height: '62px', borderRadius: '11px', backgroundColor: 'rgba(255,255,255,.06)', overflow: 'hidden', flexShrink: 0 },
        logo ? [img(logo, 62, 62, { objectFit: 'cover', borderRadius: '11px' })] : []
      ),
      // name + tags
      col({ flex: 1, paddingLeft: '18px', minWidth: 0 }, [
        span({ fontSize: '28px', fontWeight: 700, color: T1, marginBottom: '8px' }, name),
        row({}, tags),
      ]),
      // disc
      col({ width: '82px', marginLeft: '6px', alignItems: 'center', flexShrink: 0 }, [
        span({ fontSize: '30px', fontWeight: 800, color: GREEN, lineHeight: 1 }, `${f.discount}%`),
        span({ fontSize: '13px', fontWeight: 600, letterSpacing: '.8px', color: 'rgba(255,255,255,.5)', marginTop: '6px' }, 'DISC'),
      ]),
      // split
      col({ width: '82px', marginLeft: '6px', alignItems: 'center', flexShrink: 0 }, [
        span({ fontSize: '30px', fontWeight: 800, color: GREEN, lineHeight: 1 }, f.split || '—'),
        span({ fontSize: '13px', fontWeight: 600, letterSpacing: '.8px', color: 'rgba(255,255,255,.5)', marginTop: '6px' }, 'SPLIT'),
      ]),
      // rating
      col({ width: '78px', marginLeft: '6px', alignItems: 'center', flexShrink: 0 }, [
        span({ fontSize: '28px', fontWeight: 800, color: T1, lineHeight: 1 }, rating),
        stars(rating),
      ]),
      // reviews
      col({ width: '90px', marginLeft: '6px', alignItems: 'center', flexShrink: 0 }, [
        span({ fontSize: '24px', fontWeight: 700, color: 'rgba(255,255,255,.6)', lineHeight: 1 }, rev),
        span({ fontSize: '13px', fontWeight: 600, letterSpacing: '.8px', color: 'rgba(255,255,255,.5)', marginTop: '6px' }, 'REVIEWS'),
      ]),
      // coupon
      col(
        {
          width: '180px',
          marginLeft: '10px',
          flexShrink: 0,
          backgroundColor: 'rgba(245,197,24,.08)',
          border: '1px dashed rgba(245,197,24,.5)',
          borderRadius: '11px',
          padding: '11px 8px',
          alignItems: 'center',
        },
        [
          span({ fontSize: couponFs, fontWeight: 800, color: GOLD, lineHeight: 1 }, couponStr),
          span({ fontSize: '12px', fontWeight: 600, letterSpacing: '.7px', color: 'rgba(255,255,255,.5)', marginTop: '6px' }, 'EXCLUSIVE'),
        ]
      ),
    ]
  );
}

export default async function handler() {
  try {
    const firms = await fetchFirms();
    const total = firms.length;
    const visible = firms.slice(0, 5);
    const blurred = firms.slice(5, 7);
    const maxDisc = Math.max(...firms.map((f) => f.discount || 0));
    const maxSplit = Math.max(
      ...firms.map((f) => {
        const m = String(f.split || '0').match(/\d+/);
        return m ? parseInt(m[0]) : 0;
      })
    );

    // ── LOGOBAR (same pattern as gamma.js) ──
    const logobar = row(
      {
        padding: '14px 48px',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      },
      [
        row({ alignItems: 'center', gap: '10px' }, [
          img(HEX_URL, 34, 34),
          span({ fontSize: '20px', fontWeight: 800, color: T1, marginLeft: '4px' }, 'Markets'),
          span({ fontSize: '20px', fontWeight: 800, color: GOLD, marginLeft: '4px' }, 'Coupons'),
          div({ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: GOLD, marginLeft: '5px' }),
        ]),
        row(
          {
            alignItems: 'center',
            backgroundColor: 'rgba(245,197,24,.08)',
            border: '1px solid rgba(245,197,24,.24)',
            borderRadius: '30px',
            padding: '5px 14px',
          },
          [
            div({ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: GOLD, marginRight: '6px' }),
            span({ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: GOLD }, 'Updated Daily'),
          ]
        ),
      ]
    );

    // ── HEADING ──
    const ptag = span({ fontSize: '15px', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: GOLD, marginBottom: '6px' }, 'Prop Trading Firms');

    const h1 = row({ marginBottom: '6px' }, [
      span({ fontSize: '56px', fontWeight: 800, letterSpacing: '-2px', color: T1 }, 'Best '),
      span({ fontSize: '56px', fontWeight: 800, letterSpacing: '-2px', color: GOLD, marginLeft: '4px' }, 'Prop Firms'),
      span({ fontSize: '56px', fontWeight: 800, letterSpacing: '-2px', color: T1, marginLeft: '4px' }, ' with Coupons'),
    ]);

    const sub = div({ fontSize: '19px', color: 'rgba(255,255,255,.48)', marginBottom: '14px', lineHeight: 1.3 }, ['Exclusive discount coupons for top-rated prop trading firms. Verified daily.']);

    const meta = row({ marginBottom: '14px', alignItems: 'center' }, [
      span({ fontSize: '15px', color: 'rgba(255,255,255,.36)' }, 'Showing '),
      span({ fontSize: '15px', color: 'rgba(255,255,255,.66)', fontWeight: 600, marginLeft: '4px' }, `${total} companies`),
      span({ fontSize: '15px', color: 'rgba(255,255,255,.36)', marginLeft: '8px' }, '• Sorted by Biggest Discount'),
    ]);

    // ── SUMMARY 3 cards ──
    const sumCard = (val, lbl) =>
      col(
        { backgroundColor: CARD_BG, border: `1px solid ${CARD_BR}`, borderRadius: '13px', padding: '14px 16px', alignItems: 'center', flex: 1, marginRight: '10px' },
        [
          span({ fontSize: '36px', fontWeight: 800, color: GOLD, lineHeight: 1 }, val),
          span({ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,.58)', marginTop: '6px' }, lbl),
        ]
      );
    const summary = row({ marginBottom: '10px' }, [
      sumCard(String(total), 'Verified Firms'),
      sumCard(`Up to ${maxDisc}%`, 'Max Discount'),
      col({ backgroundColor: CARD_BG, border: `1px solid ${CARD_BR}`, borderRadius: '13px', padding: '14px 16px', alignItems: 'center', flex: 1 }, [
        span({ fontSize: '36px', fontWeight: 800, color: GOLD, lineHeight: 1 }, `${maxSplit}%`),
        span({ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,.58)', marginTop: '6px' }, 'Max Profit Split'),
      ]),
    ]);

    // ── COL HEADER ──
    const colHdr = row(
      { padding: '0 16px 8px', borderBottom: '1px solid rgba(255,255,255,.08)', marginBottom: '10px', alignItems: 'center' },
      [
        div({ width: '62px' }),
        span({ flex: 1, paddingLeft: '16px', fontSize: '14px', fontWeight: 700, letterSpacing: '1.2px', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase' }, 'Firm'),
        span({ width: '76px', textAlign: 'center', fontSize: '14px', fontWeight: 700, letterSpacing: '1.2px', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', justifyContent: 'center' }, 'Disc'),
        span({ width: '76px', textAlign: 'center', fontSize: '14px', fontWeight: 700, letterSpacing: '1.2px', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', justifyContent: 'center' }, 'Split'),
        span({ width: '74px', textAlign: 'center', fontSize: '14px', fontWeight: 700, letterSpacing: '1.2px', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', justifyContent: 'center' }, 'Rating'),
        span({ width: '84px', textAlign: 'center', fontSize: '14px', fontWeight: 700, letterSpacing: '1.2px', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', justifyContent: 'center' }, 'Reviews'),
        span({ width: '156px', textAlign: 'center', fontSize: '14px', fontWeight: 700, letterSpacing: '1.2px', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', justifyContent: 'center' }, 'Coupon'),
      ]
    );

    // ── FIRM ROWS ──
    const visibleRows = visible.map((f, i) => firmRow(f, i === 0, false));

    // ── BLURRED rows with overlay ──
    const blurWrap = blurred.length
      ? div({ position: 'relative', marginBottom: '8px' }, [
          col({}, blurred.map((f) => firmRow(f, false, true))),
          div(
            {
              position: 'absolute',
              top: '0px',
              left: '0px',
              right: '0px',
              bottom: '0px',
              backgroundColor: 'rgba(8,14,24,.7)',
              borderRadius: '13px',
              alignItems: 'center',
              justifyContent: 'center',
            },
            [span({ fontSize: '22px', fontWeight: 600, color: 'rgba(255,255,255,.82)' }, `View all ${total} firms and coupons on the website`)]
          ),
        ])
      : null;

    // ── CTA ──
    const cta = row(
      {
        backgroundImage: 'linear-gradient(135deg, rgba(245,197,24,.1), rgba(0,175,100,.05))',
        border: '1px solid rgba(245,197,24,.22)',
        borderRadius: '16px',
        padding: '20px 32px',
        alignItems: 'center',
        justifyContent: 'space-between',
        margin: '10px 48px 0',
        flexShrink: 0,
      },
      [
        col({}, [
          span({ fontSize: '16px', color: 'rgba(255,255,255,.52)', marginBottom: '3px' }, 'Updated daily • Exclusive verified coupons'),
          span({ fontSize: '26px', fontWeight: 700, color: T1 }, 'Access all firm coupons for free'),
        ]),
        span(
          { backgroundColor: GOLD, color: '#000', fontSize: '20px', fontWeight: 800, padding: '14px 28px', borderRadius: '11px' },
          'View All Firms'
        ),
      ]
    );

    // ── FOOTER ──
    const footer = row(
      {
        padding: '13px 48px',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid rgba(255,255,255,.06)',
        flexShrink: 0,
        marginTop: '12px',
      },
      [
        row({}, [
          span({ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,.46)' }, 'Markets'),
          span({ fontSize: '15px', fontWeight: 700, color: GOLD, marginLeft: '4px' }, 'Coupons'),
        ]),
        span({ fontSize: '12px', color: 'rgba(255,255,255,.22)' }, 'marketscoupons.com/firms'),
      ]
    );

    const bodyChildren = [ptag, h1, sub, meta, summary, colHdr, ...visibleRows];
    if (blurWrap) bodyChildren.push(blurWrap);
    bodyChildren.push(cta);

    const body = col({ padding: '22px 48px 0', flex: 1 }, bodyChildren);

    const tree = div(
      {
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: BG,
        fontFamily: 'Inter, Arial, sans-serif',
        color: T1,
      },
      [logobar, body, footer]
    );

    return new ImageResponse(tree, {
      width: 1080,
      height: 1350,
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=1800' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
