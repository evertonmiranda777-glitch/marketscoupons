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

// ───────── Chart geometry ─────────
// Bars + dashed lines + spot line stay in SVG (resvg renders them fine).
// All TEXT is rendered as HTML divs absolutely positioned over the chart
// because Satori/resvg can't render <text> without embedded fonts.

const CHART_W = 950;
const CHART_H = 530;

// [y, label, barW, fillRGBA]  — left number + horizontal bar
const ES_BARS = [
  [6,  '7,450', 145, 'rgba(0,220,130,.82)'],
  [21, '7,400', 102, 'rgba(0,220,130,.74)'],
  [36, '7,350', 162, 'rgba(0,220,130,.82)'],
  [51, '7,300', 125, 'rgba(0,220,130,.76)'],
  [66, '7,250', 172, 'rgba(0,220,130,.82)'],
  [81, '7,200', 138, 'rgba(0,220,130,.78)'],
  [96, '7,150', 158, 'rgba(0,220,130,.80)'],
  [111,'7,100', 185, 'rgba(0,220,130,.85)'],
  [126,'7,050', 132, 'rgba(0,220,130,.76)'],
  [141,'7,025', 155, 'rgba(0,220,130,.78)'],
  [156,'7,000', 395, 'rgba(0,220,130,.93)'],      // Call Wall row
  [205,'6,975', 116, 'rgba(0,220,130,.72)'],
  [220,'6,950', 140, 'rgba(0,220,130,.76)'],
  [235,'6,925', 108, 'rgba(0,220,130,.70)'],
  [250,'6,910', 98,  'rgba(0,220,130,.68)'],
  [265,'6,900', 258, 'rgba(0,220,130,.87)'],
  [280,'6,880', 80,  'rgba(0,220,130,.64)'],
  [295,'6,875', 68,  'rgba(0,220,130,.62)'],
  [310,'6,825', 315, 'rgba(0,220,130,.89)'],      // Spot row
  [324,'6,815', 278, 'rgba(0,220,130,.83)'],      // Max Pain row
  [352,'6,795', 96,  'rgba(255,80,80,.78)'],      // Zero Gamma row (puts start)
  [366,'6,750', 185, 'rgba(255,80,80,.82)'],
  [381,'6,700', 155, 'rgba(255,80,80,.76)'],
  [396,'6,650', 242, 'rgba(255,80,80,.85)'],
  [411,'6,600', 175, 'rgba(255,80,80,.79)'],
  [426,'6,550', 135, 'rgba(255,80,80,.73)'],
  [441,'6,500', 308, 'rgba(255,80,80,.89)'],
  [456,'6,400', 245, 'rgba(255,80,80,.83)'],
  [471,'6,300', 188, 'rgba(255,80,80,.78)'],
  [486,'6,250', 148, 'rgba(255,80,80,.73)'],
  [501,'6,150', 105, 'rgba(255,80,80,.66)'],
  [516,'6,000', 72,  'rgba(255,80,80,.58)'],
];

// Horizontal dashed lines [y, stroke, opacity]
const ES_LINES = [
  [159, '#ff5050', 0.65],
  [327, '#c07aff', 0.55],
  [341, '#ff9a30', 0.55],
  [355, '#f5c518', 0.55],
];

// Key price labels (colored) — these overlay on left axis with color emphasis
// y uses the SVG text baseline reference; we'll convert to top in HTML
const ES_KEY_LABELS = [
  { y: 164, text: '7,000', color: '#ff5050', weight: 700 },
  { y: 318, text: '6,825', color: '#fff',    weight: 700 },
  { y: 332, text: '6,815', color: '#c07aff', weight: 700 },
  { y: 346, text: '6,800', color: '#ff9a30', weight: 700 },
  { y: 360, text: '6,795', color: '#f5c518', weight: 700 },
];

// Right-side region pills [x, y, w, h, fill, text, textColor, borderColor]
const ES_TAGS = [
  [841, 153, 64, 15, '#ff5050',                 'Call Wall',  '#fff', null],
  [841, 170, 44, 12, '#00c8a0',                 'HVL',        '#000', null],
  [841, 184, 63, 12, '#f5c518',                 'Vol Trigger','#000', null],
  [841, 307, 50, 15, 'rgba(255,255,255,.16)',   '6,817',      '#fff', 'rgba(255,255,255,.32)'],
  [841, 322, 56, 12, '#c07aff',                 'Max Pain',   '#fff', null],
  [841, 336, 54, 12, '#ff9a30',                 'Put Wall',   '#000', null],
  [841, 349, 75, 12, 'rgba(245,197,24,.2)',     'Zero Gamma', '#f5c518', 'rgba(245,197,24,.42)'],
];

// Build SVG with only rects + lines (no text)
function buildEsChartSvg() {
  const bar = (y, w, fill) => `<rect x="71" y="${y}" width="${w}" height="10" rx="2" fill="${fill}"/>`;
  const line = (y, stroke, op) => `<line x1="71" y1="${y}" x2="835" y2="${y}" stroke="${stroke}" stroke-width="1" stroke-dasharray="5,4" opacity="${op}"/>`;
  const bars = ES_BARS.map(([y,,w,f]) => bar(y,w,f)).join('');
  const lines = ES_LINES.map(([y,s,o]) => line(y,s,o)).join('');
  const spotLine = `<line x1="71" y1="313" x2="835" y2="313" stroke="rgba(255,255,255,.55)" stroke-width="1.5" stroke-dasharray="4,4"/>`;
  const axis = `<line x1="70" y1="0" x2="70" y2="530" stroke="rgba(255,255,255,.06)" stroke-width="1"/>`;
  return `<svg viewBox="0 0 ${CHART_W} ${CHART_H}" xmlns="http://www.w3.org/2000/svg">${axis}${bars}${lines}${spotLine}</svg>`;
}

// Build HTML overlay (absolute-positioned text over the chart img)
function buildChartOverlay() {
  const children = [];

  // Left-axis numeric labels (default dim color)
  ES_BARS.forEach(([y, label]) => {
    // skip if a key label will cover this y (to avoid double-render)
    const keyY = ES_KEY_LABELS.find(k => Math.abs(k.y - (y + 9)) < 3);
    if (keyY) return;
    children.push({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          position: 'absolute',
          left: '0px',
          top: `${y - 1}px`,
          width: '64px',
          justifyContent: 'flex-end',
          fontSize: '10px',
          color: 'rgba(255,255,255,.36)',
          fontWeight: 400,
        },
        children: label,
      },
    });
  });

  // Key colored labels on left axis
  ES_KEY_LABELS.forEach(({ y, text, color, weight }) => {
    children.push({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          position: 'absolute',
          left: '0px',
          top: `${y - 11}px`,
          width: '64px',
          justifyContent: 'flex-end',
          fontSize: '10px',
          color,
          fontWeight: weight || 400,
        },
        children: text,
      },
    });
  });

  // Right-side pill tags
  ES_TAGS.forEach(([x, y, w, h, fill, text, textColor, borderColor]) => {
    const style = {
      display: 'flex',
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      width: `${w}px`,
      height: `${h}px`,
      backgroundColor: fill,
      borderRadius: h >= 14 ? '4px' : '3px',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: h >= 14 ? '9px' : '8.5px',
      fontWeight: 700,
      color: textColor,
    };
    if (borderColor) style.border = `1px solid ${borderColor}`;
    children.push({ type: 'div', props: { style, children: text } });
  });

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        position: 'absolute',
        left: '0px',
        top: '0px',
        width: `${CHART_W}px`,
        height: `${CHART_H}px`,
      },
      children,
    },
  };
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
        div({ padding: '6px 12px 0', flex: 1, justifyContent: 'center' }, [
          div(
            { position: 'relative', width: `${CHART_W}px`, height: `${CHART_H}px`, flexShrink: 0 },
            [
              img(chartUrl, CHART_W, CHART_H, { position: 'absolute', left: 0, top: 0 }),
              buildChartOverlay(),
            ]
          ),
        ]),
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
