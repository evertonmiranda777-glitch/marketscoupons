// Vercel Edge Function — Telegram creative for Gamma Exposure
// GET /api/og/gamma  → 1080x1350 PNG
// POC: hardcoded data. TODO: wire to Supabase gex_data table.

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

// ───────── design tokens ─────────
const BG = '#080e18';
const GOLD = '#f5c518';
const GREEN = '#00dc82';
const RED = '#ff5050';
const ORANGE = '#ff9a30';
const TEAL = '#00c8a0';
const PURPLE = '#c07aff';
const NQ_COL = '#a07aff';
const T1 = '#ffffff';
const CARD_BG = 'rgba(255,255,255,0.024)';
const CARD_BR = 'rgba(255,255,255,0.062)';

// ───────── helpers ─────────
const el = (type, style, children) => ({ type, props: { style: { display: 'flex', ...style }, children } });
const div = (style, children) => el('div', style, children);
const span = (style, text) => ({ type: 'span', props: { style: { display: 'flex', ...style }, children: text } });
const row = (style, children) => div({ flexDirection: 'row', ...style }, children);
const col = (style, children) => div({ flexDirection: 'column', ...style }, children);
const img = (src, width, height, style = {}) => ({ type: 'img', props: { src, width, height, style: { display: 'flex', ...style } } });

// ───────── MC hexmark logo (same SVG as site nav) ─────────
const HEX_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 50 50" fill="none"><defs><linearGradient id="lg" x1="0" y1="0" x2="50" y2="50"><stop offset="0%" stop-color="#FCD34D"/><stop offset="100%" stop-color="#D97706"/></linearGradient></defs><path d="M25 3L45 14.5V35.5L25 47 5 35.5V14.5Z" stroke="url(#lg)" stroke-width="2.2" fill="none"/><path d="M14 33V20l11 8" stroke="url(#lg)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M36 33V20l-11 8" stroke="url(#lg)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="25" cy="14" r="2" fill="url(#lg)"/></svg>`;
const HEX_URL = `data:image/svg+xml;utf8,${encodeURIComponent(HEX_SVG)}`;

// ───────── POC data ─────────
const DATA = {
  updatedLabel: 'Monday, April 13, 2026 — 04:27 ET',
  es: { price: '6,817', zeroGamma: '6,795', putWall: '6,800', callWall: '7,000', hvl: '7,000', volTrigger: '7,000', maxPain: '6,815', total: '+6962M' },
  nq: { price: '25,116', zeroGamma: '25,017', putWall: '25,000', callWall: '25,500', hvl: '24,100', volTrigger: '24,100', maxPain: '24,300' },
};

// ───────── ES GEX chart (SVG string → data URL) ─────────
function buildEsChartSvg() {
  const lbl = (x, y, text, fill = 'rgba(255,255,255,.36)', weight = 400) =>
    `<text x="${x}" y="${y}" font-size="10.5" fill="${fill}" text-anchor="end" font-family="Inter,sans-serif" font-weight="${weight}">${text}</text>`;
  const bar = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${fill}"/>`;
  const line = (y, stroke, op = 0.55) =>
    `<line x1="71" y1="${y}" x2="835" y2="${y}" stroke="${stroke}" stroke-width="1" stroke-dasharray="5,4" opacity="${op}"/>`;
  const tag = (x, y, w, h, fill, text, textFill = '#fff', stroke = '') => {
    const strokeAttr = stroke ? ` stroke="${stroke}" stroke-width=".8"` : '';
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h >= 14 ? 4 : 3}" fill="${fill}"${strokeAttr}/><text x="${x + w / 2}" y="${y + h - 3}" font-size="${h >= 14 ? 9.5 : 9}" fill="${textFill}" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700">${text}</text>`;
  };

  return `<svg viewBox="0 0 950 530" xmlns="http://www.w3.org/2000/svg">
<line x1="70" y1="0" x2="70" y2="530" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
${lbl(66, 15, '7,450')}${bar(71, 6, 145, 10, 'rgba(0,220,130,.82)')}
${lbl(66, 30, '7,400')}${bar(71, 21, 102, 10, 'rgba(0,220,130,.74)')}
${lbl(66, 45, '7,350')}${bar(71, 36, 162, 10, 'rgba(0,220,130,.82)')}
${lbl(66, 60, '7,300')}${bar(71, 51, 125, 10, 'rgba(0,220,130,.76)')}
${lbl(66, 75, '7,250')}${bar(71, 66, 172, 10, 'rgba(0,220,130,.82)')}
${lbl(66, 90, '7,200')}${bar(71, 81, 138, 10, 'rgba(0,220,130,.78)')}
${lbl(66, 105, '7,150')}${bar(71, 96, 158, 10, 'rgba(0,220,130,.80)')}
${lbl(66, 120, '7,100')}${bar(71, 111, 185, 10, 'rgba(0,220,130,.85)')}
${lbl(66, 135, '7,050')}${bar(71, 126, 132, 10, 'rgba(0,220,130,.76)')}
${lbl(66, 150, '7,025')}${bar(71, 141, 155, 10, 'rgba(0,220,130,.78)')}
${line(159, '#ff5050', 0.65)}
${lbl(66, 164, '7,000', '#ff5050', 700)}
${bar(71, 156, 395, 10, 'rgba(0,220,130,.93)')}
${tag(841, 153, 64, 15, '#ff5050', 'Call Wall')}
${tag(841, 170, 44, 12, '#00c8a0', 'HVL', '#000')}
${tag(841, 184, 63, 12, '#f5c518', 'Vol Trigger', '#000')}
${lbl(66, 214, '6,975')}${bar(71, 205, 116, 10, 'rgba(0,220,130,.72)')}
${lbl(66, 229, '6,950')}${bar(71, 220, 140, 10, 'rgba(0,220,130,.76)')}
${lbl(66, 244, '6,925')}${bar(71, 235, 108, 10, 'rgba(0,220,130,.70)')}
${lbl(66, 259, '6,910')}${bar(71, 250, 98, 10, 'rgba(0,220,130,.68)')}
${lbl(66, 274, '6,900')}${bar(71, 265, 258, 10, 'rgba(0,220,130,.87)')}
${lbl(66, 289, '6,880')}${bar(71, 280, 80, 10, 'rgba(0,220,130,.64)')}
${lbl(66, 304, '6,875')}${bar(71, 295, 68, 10, 'rgba(0,220,130,.62)')}
<line x1="71" y1="313" x2="835" y2="313" stroke="rgba(255,255,255,.55)" stroke-width="1.5" stroke-dasharray="4,4"/>
${lbl(66, 318, '6,825', '#fff', 700)}
${bar(71, 310, 315, 10, 'rgba(0,220,130,.89)')}
${tag(841, 307, 50, 15, 'rgba(255,255,255,.16)', '6,817', '#fff', 'rgba(255,255,255,.32)')}
${line(327, '#c07aff')}
${lbl(66, 332, '6,815', '#c07aff', 700)}
${bar(71, 324, 278, 10, 'rgba(0,220,130,.83)')}
${tag(841, 322, 56, 12, '#c07aff', 'Max Pain')}
${line(341, '#ff9a30')}
${lbl(66, 346, '6,800', '#ff9a30', 700)}
${tag(841, 336, 54, 12, '#ff9a30', 'Put Wall', '#000')}
${line(355, '#f5c518')}
${lbl(66, 360, '6,795', '#f5c518', 700)}
${bar(71, 352, 96, 10, 'rgba(255,80,80,.78)')}
${tag(841, 349, 75, 12, 'rgba(245,197,24,.2)', 'Zero Gamma', '#f5c518', 'rgba(245,197,24,.42)')}
${lbl(66, 375, '6,750')}${bar(71, 366, 185, 10, 'rgba(255,80,80,.82)')}
${lbl(66, 390, '6,700')}${bar(71, 381, 155, 10, 'rgba(255,80,80,.76)')}
${lbl(66, 405, '6,650')}${bar(71, 396, 242, 10, 'rgba(255,80,80,.85)')}
${lbl(66, 420, '6,600')}${bar(71, 411, 175, 10, 'rgba(255,80,80,.79)')}
${lbl(66, 435, '6,550')}${bar(71, 426, 135, 10, 'rgba(255,80,80,.73)')}
${lbl(66, 450, '6,500')}${bar(71, 441, 308, 10, 'rgba(255,80,80,.89)')}
${lbl(66, 465, '6,400')}${bar(71, 456, 245, 10, 'rgba(255,80,80,.83)')}
${lbl(66, 480, '6,300')}${bar(71, 471, 188, 10, 'rgba(255,80,80,.78)')}
${lbl(66, 495, '6,250')}${bar(71, 486, 148, 10, 'rgba(255,80,80,.73)')}
${lbl(66, 510, '6,150')}${bar(71, 501, 105, 10, 'rgba(255,80,80,.66)')}
${lbl(66, 525, '6,000')}${bar(71, 516, 72, 10, 'rgba(255,80,80,.58)')}
</svg>`;
}

// ───────── level card (6-col grid row) ─────────
function lvc(label, value, valueColor, sub) {
  return col(
    { backgroundColor: CARD_BG, border: `1px solid ${CARD_BR}`, borderRadius: '8px', padding: '8px 10px', flex: 1 },
    [
      span({ fontSize: '8px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,.28)', marginBottom: '3px' }, label),
      span({ fontSize: '15px', fontWeight: 800, color: valueColor }, value),
      span({ fontSize: '8px', color: 'rgba(255,255,255,.24)', marginTop: '1px' }, sub),
    ]
  );
}

// ───────── asset header row ─────────
function assetHdr(ticker, name, price, badgeText, tickerColor, borderColor) {
  return row(
    {
      backgroundColor: 'rgba(255,255,255,0.03)',
      border: `1px solid ${borderColor || 'rgba(255,255,255,0.08)'}`,
      borderRadius: '10px',
      padding: '11px 18px',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '8px',
    },
    [
      row({ alignItems: 'center' }, [
        span({ fontSize: '17px', fontWeight: 800, color: tickerColor || T1 }, ticker),
        span({ fontSize: '12px', color: 'rgba(255,255,255,.36)', marginLeft: '7px' }, name),
      ]),
      row({ alignItems: 'center', gap: '10px' }, [
        span({ fontSize: '22px', fontWeight: 800, color: T1 }, price),
        span(
          {
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 12px',
            borderRadius: '20px',
            backgroundColor: 'rgba(0,220,130,.12)',
            color: GREEN,
            border: '1px solid rgba(0,220,130,.26)',
          },
          badgeText
        ),
      ]),
    ]
  );
}

// ───────── level row (6 cards) ─────────
function levelsRow(lv, extraStyle = {}) {
  return row({ gap: '7px', marginBottom: '8px', ...extraStyle }, [
    lvc('Zero Gamma', lv.zeroGamma, GOLD, 'Gamma Flip'),
    lvc('Put Wall', lv.putWall, ORANGE, 'Support'),
    lvc('Call Wall', lv.callWall, RED, 'Resistance'),
    lvc('HVL', lv.hvl, TEAL, 'Price Magnet'),
    lvc('Vol Trigger', lv.volTrigger, GOLD, 'Vol. Trigger'),
    lvc('Max Pain', lv.maxPain, PURPLE, 'Max Pain'),
  ]);
}

export default async function handler() {
  try {
    const chartUrl = `data:image/svg+xml;utf8,${encodeURIComponent(buildEsChartSvg())}`;

    // ── LOGOBAR ──
    const logobar = row(
      {
        padding: '13px 48px',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      },
      [
        row({ alignItems: 'center', gap: '9px' }, [
          img(HEX_URL, 30, 30),
          span({ fontSize: '18px', fontWeight: 800, color: T1 }, 'Markets'),
          span({ fontSize: '18px', fontWeight: 800, color: GOLD, marginLeft: '4px' }, 'Coupons'),
          div({ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: GOLD, marginLeft: '4px' }),
        ]),
        row(
          {
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(245,197,24,.08)',
            border: '1px solid rgba(245,197,24,.24)',
            borderRadius: '30px',
            padding: '5px 14px',
          },
          [
            div({ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: GOLD }),
            span({ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: GOLD }, 'Updated Daily'),
          ]
        ),
      ]
    );

    // ── HEADING ──
    const heading = col({ alignItems: 'center', marginBottom: '14px' }, [
      row({ justifyContent: 'center', marginBottom: '6px' }, [
        span({ fontSize: '44px', fontWeight: 800, letterSpacing: '-1.5px', color: GOLD }, 'Gamma'),
        span({ fontSize: '44px', fontWeight: 800, letterSpacing: '-1.5px', color: T1, marginLeft: '12px' }, 'Exposure (GEX)'),
      ]),
      span(
        {
          fontSize: '14px',
          color: 'rgba(255,255,255,.4)',
          textAlign: 'center',
          maxWidth: '820px',
          marginBottom: '3px',
        },
        'Track Gamma Exposure levels for market makers on S&P 500 and Nasdaq 100. See where the largest options concentrations are and how they affect price.'
      ),
      span({ fontSize: '10.5px', color: 'rgba(255,255,255,.22)', textAlign: 'center' }, `Last update: ${DATA.updatedLabel}  •  Updated every trading day at 5:00 AM ET.`),
    ]);

    // ── ES HEADER + LEVELS ──
    const esHdr = assetHdr('ES', 'S&P 500 Futures', DATA.es.price, 'Positive Gamma', T1);
    const esLevels = levelsRow(DATA.es);

    // ── ES GEX CARD (flex:1) ──
    const gexCard = col(
      {
        backgroundColor: 'rgba(255,255,255,.022)',
        border: `1px solid ${CARD_BR}`,
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '8px',
        flex: 1,
      },
      [
        row(
          {
            padding: '9px 18px 8px',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          },
          [
            span({ fontSize: '12px', fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: T1 }, 'Gamma Exposure — ES S&P 500'),
            row({}, [
              span({ fontSize: '11px', color: 'rgba(255,255,255,.36)' }, 'Total: '),
              span({ fontSize: '11px', color: GREEN, fontWeight: 700, marginLeft: '4px' }, DATA.es.total),
            ]),
          ]
        ),
        div({ padding: '6px 12px 0', flex: 1 }, [img(chartUrl, 1008, 530, { width: '100%', height: 'auto' })]),
        row({ gap: '16px', alignItems: 'center', padding: '5px 12px 7px' }, [
          row({ alignItems: 'center', gap: '5px' }, [
            div({ width: '10px', height: '8px', borderRadius: '2px', backgroundColor: GREEN }),
            span({ fontSize: '10px', color: 'rgba(255,255,255,.42)', marginLeft: '5px' }, 'Calls (resistance)'),
          ]),
          row({ alignItems: 'center', gap: '5px' }, [
            div({ width: '10px', height: '8px', borderRadius: '2px', backgroundColor: RED }),
            span({ fontSize: '10px', color: 'rgba(255,255,255,.42)', marginLeft: '5px' }, 'Puts (support)'),
          ]),
          row({ alignItems: 'center', gap: '5px' }, [
            div({ width: '16px', height: '1px', backgroundColor: 'rgba(255,255,255,.5)' }),
            span({ fontSize: '10px', color: 'rgba(255,255,255,.42)', marginLeft: '5px' }, `${DATA.es.price} Spot`),
          ]),
        ]),
      ]
    );

    // ── NQ DIVIDER ──
    const nqDiv = row({ alignItems: 'center', gap: '10px', marginBottom: '7px' }, [
      div({ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,.07)' }),
      span({ fontSize: '13px', fontWeight: 800, color: NQ_COL }, 'NQ — Nasdaq 100 Futures'),
      div({ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,.07)' }),
    ]);

    const nqHdr = assetHdr('NQ', 'Nasdaq 100 Futures', DATA.nq.price, 'Positive Gamma', NQ_COL, 'rgba(160,122,255,.2)');
    const nqLevels = levelsRow(DATA.nq, { marginBottom: '14px' });

    // ── CTA ──
    const cta = row(
      {
        backgroundImage: 'linear-gradient(135deg, rgba(245,197,24,.07), rgba(0,175,100,.04))',
        border: '1px solid rgba(245,197,24,.16)',
        borderRadius: '12px',
        padding: '20px 30px',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      },
      [
        col({}, [
          span({ fontSize: '12px', color: 'rgba(255,255,255,.34)', marginBottom: '3px' }, 'Updated daily at 5:00 AM ET • ES, NQ, and more'),
          span({ fontSize: '21px', fontWeight: 700, color: T1 }, 'Access the full GEX map for free'),
        ]),
        span(
          {
            backgroundColor: GOLD,
            color: '#000',
            fontSize: '14px',
            fontWeight: 800,
            padding: '12px 26px',
            borderRadius: '9px',
            flexShrink: 0,
          },
          'View GEX'
        ),
      ]
    );

    // ── FOOTER ──
    const footer = row(
      {
        padding: '13px 48px',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
        marginTop: '14px',
      },
      [
        row({}, [
          span({ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,.46)' }, 'Markets'),
          span({ fontSize: '15px', fontWeight: 700, color: GOLD }, 'Coupons'),
        ]),
        span({ fontSize: '12px', color: 'rgba(255,255,255,.22)' }, 'marketscoupons.com/gamma'),
      ]
    );

    // ── BODY (flex:1) ──
    const body = col({ padding: '22px 48px 0', flex: 1 }, [heading, esHdr, esLevels, gexCard, nqDiv, nqHdr, nqLevels, cta]);

    // ── ROOT ──
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

    return new ImageResponse(tree, { width: 1080, height: 1350 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
