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
const T2 = 'rgba(255,255,255,0.4)';
const T3 = 'rgba(255,255,255,0.24)';
const CARD_BG = 'rgba(255,255,255,0.025)';
const CARD_BR = 'rgba(255,255,255,0.062)';

// ───────── helpers (type/props/children for Satori) ─────────
const el = (type, style, children) => ({ type, props: { style: { display: 'flex', ...style }, children } });
const div = (style, children) => el('div', style, children);
const span = (style, text) => ({ type: 'span', props: { style, children: text } });
const row = (style, children) => div({ flexDirection: 'row', ...style }, children);
const col = (style, children) => div({ flexDirection: 'column', ...style }, children);

// ───────── POC DATA (from print) ─────────
const DATA = {
  updatedLabel: 'Monday, April 13, 2026 — 04:27 ET',
  es: {
    price: '6,817',
    zeroGamma: '6,795',
    putWall: '6,800',
    callWall: '7,000',
    hvl: '7,000',
    volTrigger: '7,000',
    maxPain: '6,815',
    total: '+6962M',
  },
  nq: {
    price: '25,116',
    zeroGamma: '25,017',
    putWall: '25,000',
    callWall: '25,500',
    hvl: '24,100',
    volTrigger: '24,100',
    maxPain: '24,300',
  },
};

// ───────── level card ─────────
const levelCard = (label, value, valueColor, sub) =>
  col(
    {
      backgroundColor: CARD_BG,
      border: `1px solid ${CARD_BR}`,
      borderRadius: '8px',
      padding: '9px 11px',
      flex: 1,
    },
    [
      span(
        {
          fontSize: '8px',
          fontWeight: 700,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.28)',
          marginBottom: '4px',
        },
        label
      ),
      span({ fontSize: '15px', fontWeight: 800, color: valueColor }, value),
      span({ fontSize: '8px', color: T3, marginTop: '2px' }, sub),
    ]
  );

// ───────── asset header bar (ticker + name + price + gamma badge) ─────────
const assetHeader = (ticker, name, price, tickerColor, borderColor) =>
  row(
    {
      backgroundColor: 'rgba(255,255,255,0.03)',
      border: `1px solid ${borderColor || 'rgba(255,255,255,0.08)'}`,
      borderRadius: '10px',
      padding: '12px 18px',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '9px',
    },
    [
      row({ alignItems: 'center' }, [
        span({ fontSize: '17px', fontWeight: 800, color: tickerColor || T1 }, ticker),
        span({ fontSize: '12px', color: 'rgba(255,255,255,0.36)', marginLeft: '7px' }, name),
      ]),
      row({ alignItems: 'center', gap: '10px' }, [
        span({ fontSize: '22px', fontWeight: 800, color: T1 }, price),
        span(
          {
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 12px',
            borderRadius: '20px',
            backgroundColor: 'rgba(0,220,130,0.12)',
            color: GREEN,
            border: '1px solid rgba(0,220,130,0.26)',
          },
          'Positive Gamma'
        ),
      ]),
    ]
  );

// ───────── GEX bar chart (SVG) ─────────
// Returns one <svg> node with all bars/lines/labels replicating the template
// Above spot (calls, green)
const callBars = [
  { y: 6, w: 142, label: '7,450', o: 0.82 },
  { y: 20, w: 100, label: '7,400', o: 0.74 },
  { y: 34, w: 160, label: '7,350', o: 0.82 },
  { y: 48, w: 122, label: '7,300', o: 0.76 },
  { y: 62, w: 170, label: '7,250', o: 0.82 },
  { y: 76, w: 136, label: '7,200', o: 0.78 },
  { y: 90, w: 180, label: '7,100', o: 0.84 },
];
const callBarsMid = [
  { y: 154, w: 114, label: '6,975', o: 0.72 },
  { y: 168, w: 138, label: '6,950', o: 0.76 },
  { y: 182, w: 252, label: '6,900', o: 0.86 },
];
const putBars = [
  { y: 250, w: 182, label: '6,750', o: 0.82 },
  { y: 264, w: 154, label: '6,700', o: 0.76 },
  { y: 278, w: 238, label: '6,650', o: 0.84 },
  { y: 292, w: 306, label: '6,500', o: 0.88 },
];

const svgText = (x, y, text, fill, weight = 400, anchor = 'end') => ({
  type: 'text',
  props: {
    x,
    y,
    fontSize: 10,
    fill,
    textAnchor: anchor,
    fontFamily: 'Inter',
    fontWeight: weight,
    children: text,
  },
});
const svgRect = (x, y, w, h, rx, fill, stroke, strokeWidth) => ({
  type: 'rect',
  props: { x, y, width: w, height: h, rx, fill, stroke, strokeWidth },
});
const svgLine = (x1, y1, x2, y2, stroke, sw, dash, opacity) => ({
  type: 'line',
  props: { x1, y1, x2, y2, stroke, strokeWidth: sw, strokeDasharray: dash, opacity },
});

// SVG as data URL — Satori needs SVG wrapped in <img src="data:..."> not raw children
const buildChartSvg = () => {
  const rects = [];
  const lines = [];
  const texts = [];
  const push = (arr, s) => arr.push(s);
  // calls above spot
  for (const b of callBars) {
    push(texts, `<text x="64" y="${b.y + 9}" font-size="10" fill="rgba(255,255,255,0.36)" text-anchor="end" font-family="Inter">${b.label}</text>`);
    push(rects, `<rect x="69" y="${b.y}" width="${b.w}" height="9" rx="2" fill="rgba(0,220,130,${b.o})"/>`);
  }
  for (const b of callBarsMid) {
    push(texts, `<text x="64" y="${b.y + 9}" font-size="10" fill="rgba(255,255,255,0.36)" text-anchor="end" font-family="Inter">${b.label}</text>`);
    push(rects, `<rect x="69" y="${b.y}" width="${b.w}" height="9" rx="2" fill="rgba(0,220,130,${b.o})"/>`);
  }
  for (const b of putBars) {
    push(texts, `<text x="64" y="${b.y + 9}" font-size="10" fill="rgba(255,255,255,0.36)" text-anchor="end" font-family="Inter">${b.label}</text>`);
    push(rects, `<rect x="69" y="${b.y}" width="${b.w}" height="9" rx="2" fill="rgba(255,80,80,${b.o})"/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 930 310" width="870" height="310">
    <line x1="68" y1="0" x2="68" y2="310" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    ${rects.join('')}
    ${texts.join('')}
    <line x1="69" y1="107" x2="820" y2="107" stroke="#ff5050" stroke-width="1" stroke-dasharray="5,4" opacity="0.6"/>
    <text x="64" y="112" font-size="10" fill="#ff5050" text-anchor="end" font-family="Inter" font-weight="700">7,000</text>
    <rect x="69" y="104" width="375" height="9" rx="2" fill="rgba(0,220,130,0.92)"/>
    <rect x="826" y="101" width="62" height="14" rx="4" fill="#ff5050"/>
    <text x="857" y="112" font-size="9.5" fill="#fff" text-anchor="middle" font-family="Inter" font-weight="700">Call Wall</text>
    <rect x="826" y="117" width="44" height="12" rx="3" fill="#00c8a0"/>
    <text x="848" y="127" font-size="9" fill="#000" text-anchor="middle" font-family="Inter" font-weight="700">HVL</text>
    <rect x="826" y="131" width="62" height="12" rx="3" fill="#f5c518"/>
    <text x="857" y="141" font-size="9" fill="#000" text-anchor="middle" font-family="Inter" font-weight="700">Vol Trigger</text>
    <line x1="69" y1="200" x2="820" y2="200" stroke="rgba(255,255,255,0.52)" stroke-width="1.5" stroke-dasharray="4,4"/>
    <text x="64" y="205" font-size="10" fill="#fff" text-anchor="end" font-family="Inter" font-weight="700">6,825</text>
    <rect x="69" y="197" width="308" height="9" rx="2" fill="rgba(0,220,130,0.88)"/>
    <rect x="826" y="194" width="48" height="14" rx="4" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.32)" stroke-width="0.8"/>
    <text x="850" y="205" font-size="9.5" fill="#fff" text-anchor="middle" font-family="Inter" font-weight="700">6,817</text>
    <line x1="69" y1="213" x2="820" y2="213" stroke="#c07aff" stroke-width="1" stroke-dasharray="5,4" opacity="0.55"/>
    <text x="64" y="218" font-size="10" fill="#c07aff" text-anchor="end" font-family="Inter" font-weight="700">6,815</text>
    <rect x="69" y="210" width="270" height="9" rx="2" fill="rgba(0,220,130,0.82)"/>
    <rect x="826" y="207" width="54" height="12" rx="3" fill="#c07aff"/>
    <text x="853" y="217" font-size="9" fill="#fff" text-anchor="middle" font-family="Inter" font-weight="700">Max Pain</text>
    <line x1="69" y1="226" x2="820" y2="226" stroke="#ff9a30" stroke-width="1" stroke-dasharray="5,4" opacity="0.55"/>
    <text x="64" y="231" font-size="10" fill="#ff9a30" text-anchor="end" font-family="Inter" font-weight="700">6,800</text>
    <rect x="826" y="221" width="52" height="12" rx="3" fill="#ff9a30"/>
    <text x="852" y="231" font-size="9" fill="#000" text-anchor="middle" font-family="Inter" font-weight="700">Put Wall</text>
    <line x1="69" y1="240" x2="820" y2="240" stroke="#f5c518" stroke-width="1" stroke-dasharray="5,4" opacity="0.55"/>
    <text x="64" y="245" font-size="10" fill="#f5c518" text-anchor="end" font-family="Inter" font-weight="700">6,795</text>
    <rect x="69" y="237" width="95" height="9" rx="2" fill="rgba(255,80,80,0.78)"/>
    <rect x="826" y="234" width="72" height="12" rx="3" fill="rgba(245,197,24,0.2)" stroke="rgba(245,197,24,0.42)" stroke-width="0.8"/>
    <text x="862" y="244" font-size="9" fill="#f5c518" text-anchor="middle" font-family="Inter" font-weight="700">Zero Gamma</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};

const gexChart = () => ({
  type: 'img',
  props: {
    src: buildChartSvg(),
    width: 870,
    height: 310,
    style: { display: 'flex' },
  },
});

const _unused_old_chart = () => ({
  type: 'svg',
  props: {
    width: 870,
    height: 310,
    viewBox: '0 0 930 310',
    children: [
      svgLine(68, 0, 68, 310, 'rgba(255,255,255,0.06)', 1),
      // call bars (above spot)
      ...callBars.flatMap((b) => [
        svgText(64, b.y + 9, b.label, 'rgba(255,255,255,0.36)'),
        svgRect(69, b.y, b.w, 9, 2, `rgba(0,220,130,${b.o})`),
      ]),
      // Call Wall line + bar + tags
      svgLine(69, 107, 820, 107, RED, 1, '5,4', 0.6),
      svgText(64, 112, '7,000', RED, 700),
      svgRect(69, 104, 375, 9, 2, 'rgba(0,220,130,0.92)'),
      svgRect(826, 101, 62, 14, 4, RED),
      svgText(857, 112, 'Call Wall', '#fff', 700, 'middle'),
      svgRect(826, 117, 44, 12, 3, TEAL),
      svgText(848, 127, 'HVL', '#000', 700, 'middle'),
      svgRect(826, 131, 62, 12, 3, GOLD),
      svgText(857, 141, 'Vol Trigger', '#000', 700, 'middle'),
      // mid calls
      ...callBarsMid.flatMap((b) => [
        svgText(64, b.y + 9, b.label, 'rgba(255,255,255,0.36)'),
        svgRect(69, b.y, b.w, 9, 2, `rgba(0,220,130,${b.o})`),
      ]),
      // Spot 6,817
      svgLine(69, 200, 820, 200, 'rgba(255,255,255,0.52)', 1.5, '4,4'),
      svgText(64, 205, '6,825', '#fff', 700),
      svgRect(69, 197, 308, 9, 2, 'rgba(0,220,130,0.88)'),
      svgRect(826, 194, 48, 14, 4, 'rgba(255,255,255,0.16)', 'rgba(255,255,255,0.32)', 0.8),
      svgText(850, 205, '6,817', '#fff', 700, 'middle'),
      // Max Pain
      svgLine(69, 213, 820, 213, PURPLE, 1, '5,4', 0.55),
      svgText(64, 218, '6,815', PURPLE, 700),
      svgRect(69, 210, 270, 9, 2, 'rgba(0,220,130,0.82)'),
      svgRect(826, 207, 54, 12, 3, PURPLE),
      svgText(853, 217, 'Max Pain', '#fff', 700, 'middle'),
      // Put Wall
      svgLine(69, 226, 820, 226, ORANGE, 1, '5,4', 0.55),
      svgText(64, 231, '6,800', ORANGE, 700),
      svgRect(826, 221, 52, 12, 3, ORANGE),
      svgText(852, 231, 'Put Wall', '#000', 700, 'middle'),
      // Zero Gamma
      svgLine(69, 240, 820, 240, GOLD, 1, '5,4', 0.55),
      svgText(64, 245, '6,795', GOLD, 700),
      svgRect(69, 237, 95, 9, 2, 'rgba(255,80,80,0.78)'),
      svgRect(826, 234, 72, 12, 3, 'rgba(245,197,24,0.2)', 'rgba(245,197,24,0.42)', 0.8),
      svgText(862, 244, 'Zero Gamma', GOLD, 700, 'middle'),
      // Puts below
      ...putBars.flatMap((b) => [
        svgText(64, b.y + 9, b.label, 'rgba(255,255,255,0.36)'),
        svgRect(69, b.y, b.w, 9, 2, `rgba(255,80,80,${b.o})`),
      ]),
    ],
  },
});

// ───────── main handler ─────────
export default async function handler() {
  try {
    const { es, nq } = DATA;

    const esLevels = row({ gap: '7px', marginBottom: '9px' }, [
      levelCard('Zero Gamma', es.zeroGamma, GOLD, 'Gamma Flip'),
      levelCard('Put Wall', es.putWall, ORANGE, 'Support'),
      levelCard('Call Wall', es.callWall, RED, 'Resistance'),
      levelCard('HVL', es.hvl, TEAL, 'Price Magnet'),
      levelCard('Vol Trigger', es.volTrigger, GOLD, 'Vol. Trigger'),
      levelCard('Max Pain', es.maxPain, PURPLE, 'Max Pain'),
    ]);

    const nqLevels = row({ gap: '7px', marginBottom: '18px' }, [
      levelCard('Zero Gamma', nq.zeroGamma, GOLD, 'Gamma Flip'),
      levelCard('Put Wall', nq.putWall, ORANGE, 'Support'),
      levelCard('Call Wall', nq.callWall, RED, 'Resistance'),
      levelCard('HVL', nq.hvl, TEAL, 'Price Magnet'),
      levelCard('Vol Trigger', nq.volTrigger, GOLD, 'Vol. Trigger'),
      levelCard('Max Pain', nq.maxPain, PURPLE, 'Max Pain'),
    ]);

    const gexCard = col(
      {
        backgroundColor: 'rgba(255,255,255,0.022)',
        border: `1px solid ${CARD_BR}`,
        borderRadius: '12px',
        marginBottom: '9px',
        overflow: 'hidden',
      },
      [
        row(
          {
            padding: '10px 18px 8px',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          },
          [
            span(
              {
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                color: T1,
              },
              'Gamma Exposure — ES S&P 500'
            ),
            row({ alignItems: 'center' }, [
              span({ fontSize: '11px', color: 'rgba(255,255,255,0.36)' }, 'Total: '),
              span({ fontSize: '11px', color: GREEN, fontWeight: 700, marginLeft: '4px' }, es.total),
            ]),
          ]
        ),
        div({ padding: '8px 18px 0', justifyContent: 'center' }, [gexChart()]),
        // legend
        row({ gap: '16px', alignItems: 'center', padding: '6px 18px 8px' }, [
          row({ alignItems: 'center', gap: '5px' }, [
            div({ width: '10px', height: '8px', borderRadius: '2px', backgroundColor: GREEN }, []),
            span({ fontSize: '10px', color: 'rgba(255,255,255,0.42)', marginLeft: '5px' }, 'Calls (resistance)'),
          ]),
          row({ alignItems: 'center', gap: '5px' }, [
            div({ width: '10px', height: '8px', borderRadius: '2px', backgroundColor: RED }, []),
            span({ fontSize: '10px', color: 'rgba(255,255,255,0.42)', marginLeft: '5px' }, 'Puts (support)'),
          ]),
          row({ alignItems: 'center', gap: '5px' }, [
            div({ width: '16px', height: '1px', backgroundColor: 'rgba(255,255,255,0.5)' }, []),
            span({ fontSize: '10px', color: 'rgba(255,255,255,0.42)', marginLeft: '5px' }, `${es.price} Spot`),
          ]),
        ]),
      ]
    );

    // NQ section divider (line + ticker label + line)
    const nqDivider = row({ alignItems: 'center', gap: '10px', marginBottom: '9px' }, [
      div({ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.07)' }, []),
      span({ fontSize: '14px', fontWeight: 800, color: NQ_COL }, 'NQ — Nasdaq 100 Futures'),
      div({ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.07)' }, []),
    ]);

    // CTA
    const cta = row(
      {
        backgroundImage: 'linear-gradient(135deg, rgba(245,197,24,0.07), rgba(0,175,100,0.04))',
        border: '1px solid rgba(245,197,24,0.16)',
        borderRadius: '13px',
        padding: '22px 32px',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      [
        col({}, [
          span({ fontSize: '12px', color: 'rgba(255,255,255,0.34)', marginBottom: '3px' }, 'Updated daily at 5:00 AM ET • ES, NQ, and more'),
          span({ fontSize: '22px', fontWeight: 700, color: T1 }, 'Access the full GEX map for free'),
        ]),
        span(
          {
            backgroundColor: GOLD,
            color: '#000',
            fontSize: '14px',
            fontWeight: 800,
            padding: '12px 28px',
            borderRadius: '9px',
          },
          'View GEX'
        ),
      ]
    );

    // header logo bar
    const logoBar = row(
      {
        padding: '14px 48px',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      },
      [
        row({ alignItems: 'center', gap: '9px' }, [
          div(
            {
              width: '28px',
              height: '28px',
              backgroundColor: GOLD,
              borderRadius: '6px',
              alignItems: 'center',
              justifyContent: 'center',
            },
            [span({ fontSize: '14px', fontWeight: 900, color: '#000' }, 'M')]
          ),
          row({ alignItems: 'center' }, [
            span({ fontSize: '18px', fontWeight: 800, color: T1 }, 'Markets '),
            span({ fontSize: '18px', fontWeight: 800, color: GOLD }, 'Coupons'),
          ]),
          div({ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: GOLD, marginLeft: '2px' }, []),
        ]),
        row(
          {
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(245,197,24,0.08)',
            border: '1px solid rgba(245,197,24,0.24)',
            borderRadius: '30px',
            padding: '5px 14px',
          },
          [
            div({ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: GOLD }, []),
            span(
              {
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: GOLD,
                marginLeft: '6px',
              },
              'Updated Daily'
            ),
          ]
        ),
      ]
    );

    // body
    const body = col({ padding: '26px 48px 0', flex: 1 }, [
      span(
        {
          fontSize: '46px',
          fontWeight: 800,
          lineHeight: 1.06,
          letterSpacing: '-1.5px',
          textAlign: 'center',
          color: T1,
          marginBottom: '8px',
        },
        'Gamma Exposure (GEX)'
      ),
      span(
        {
          fontSize: '14px',
          color: T2,
          textAlign: 'center',
          lineHeight: 1.55,
          marginBottom: '4px',
          alignSelf: 'center',
          maxWidth: '800px',
        },
        'Track Gamma Exposure levels for market makers on S&P 500 and Nasdaq 100. See where the largest options concentrations are and how they affect price.'
      ),
      span(
        { fontSize: '11px', color: T3, textAlign: 'center', marginBottom: '18px' },
        `Last update: ${DATA.updatedLabel} • Updated every trading day at 5:00 AM ET.`
      ),
      assetHeader('ES', 'S&P 500 Futures', es.price, T1),
      esLevels,
      gexCard,
      nqDivider,
      assetHeader('NQ', 'Nasdaq 100 Futures', nq.price, NQ_COL, 'rgba(160,122,255,0.2)'),
      nqLevels,
      cta,
    ]);

    // footer
    const footer = row(
      {
        padding: '13px 48px',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      },
      [
        row({}, [
          span({ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.46)' }, 'Markets'),
          span({ fontSize: '15px', fontWeight: 700, color: GOLD }, 'Coupons'),
        ]),
        span({ fontSize: '12px', color: 'rgba(255,255,255,0.22)' }, 'marketscoupons.com/gamma'),
      ]
    );

    return new ImageResponse(
      col(
        {
          width: '100%',
          height: '100%',
          backgroundColor: BG,
          fontFamily: 'Inter, Arial, sans-serif',
        },
        [logoBar, body, footer]
      ),
      { width: 1080, height: 1350 }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
